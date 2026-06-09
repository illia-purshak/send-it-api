import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorDetails, ApiErrorResponse } from '../../types/api-error.types.js';

// Keys that are intrinsic to NestJS HttpException — not business data
const RESERVED_KEYS = new Set(['statusCode', 'message', 'code', 'error']);

// "Not Found" → "NOT_FOUND", "Service Unavailable" → "SERVICE_UNAVAILABLE"
function errorFieldToCode(error: unknown): string {
  return typeof error === 'string'
    ? error.toUpperCase().replace(/\s+/g, '_')
    : 'INTERNAL_SERVER_ERROR';
}

function isZodFlatten(x: unknown): x is { fieldErrors: Record<string, string[]>; formErrors: string[] } {
  return typeof x === 'object' && x !== null && 'fieldErrors' in x;
}

type ValidationPayload =
  | { type: 'flatten'; data: { fieldErrors: Record<string, string[]>; formErrors: string[] } }
  | { type: 'issues'; data: unknown[] };

// Checks both raw directly and raw.message — NestJS may wrap the payload either way
function extractValidationPayload(raw: Record<string, unknown>): ValidationPayload | null {
  // Check raw directly
  if (Array.isArray(raw)) return { type: 'issues', data: raw };
  if (isZodFlatten(raw)) return { type: 'flatten', data: raw as { fieldErrors: Record<string, string[]>; formErrors: string[] } };

  // Check nested under raw.message
  const msg = raw['message'];
  if (Array.isArray(msg)) return { type: 'issues', data: msg };
  if (isZodFlatten(msg)) return { type: 'flatten', data: msg as { fieldErrors: Record<string, string[]>; formErrors: string[] } };

  return null;
}

function flattenToDetails(data: {
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
}): { details: ApiErrorDetails; message: string } {
  const formMessages = (data.formErrors ?? []).filter(Boolean);
  return {
    details: { fields: data.fieldErrors ?? {}, meta: {} },
    message: formMessages.length > 0 ? formMessages.join('. ') : 'Validation failed',
  };
}

function issuesToDetails(issues: unknown[]): { details: ApiErrorDetails; message: string } {
  const fields: Record<string, string[]> = {};
  const formMessages: string[] = [];

  for (const issue of issues) {
    if (typeof issue !== 'object' || issue === null) continue;
    const { path, message } = issue as { path?: unknown[]; message?: string };
    const msg = typeof message === 'string' ? message : 'Invalid value';

    if (Array.isArray(path) && path.length > 0) {
      const key = path.map(String).join('.');
      (fields[key] ??= []).push(msg);
    } else {
      formMessages.push(msg);
    }
  }

  return {
    details: { fields, meta: {} },
    message: formMessages.length > 0 ? formMessages.join('. ') : 'Validation failed',
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const timestamp = new Date().toISOString();
    const path = request.url;

    let body: ApiErrorResponse;

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const raw = exception.getResponse();
      body = this.buildFromHttpException(statusCode, raw, timestamp, path);
    } else {
      this.logger.error(
        `Unhandled exception on ${request.method} ${path}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      body = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        details: null,
        timestamp,
        path,
      };
    }

    response.status(body.statusCode).json(body);
  }

  private buildFromHttpException(
    statusCode: number,
    raw: string | object,
    timestamp: string,
    path: string,
  ): ApiErrorResponse {
    // Defensive: NestJS 11 getResponse() always returns an object, but type allows string
    if (typeof raw === 'string') {
      return {
        statusCode,
        code: 'INTERNAL_SERVER_ERROR',
        message: raw,
        details: null,
        timestamp,
        path,
      };
    }

    const obj = raw as Record<string, unknown>;

    // Validation path — handles both flatten() and raw issues, in both locations
    const validationPayload = extractValidationPayload(obj);
    if (validationPayload !== null) {
      const { details, message } =
        validationPayload.type === 'flatten'
          ? flattenToDetails(validationPayload.data)
          : issuesToDetails(validationPayload.data);
      return { statusCode, code: 'VALIDATION_ERROR', message, details, timestamp, path };
    }

    // Pattern B: explicit code field — throw new XxxException({ code: '...', message: '...', ...extra })
    if (typeof obj['code'] === 'string') {
      const meta: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (!RESERVED_KEYS.has(key)) meta[key] = value;
      }
      const hasExtras = Object.keys(meta).length > 0;
      return {
        statusCode,
        code: obj['code'] as string,
        message: typeof obj['message'] === 'string' ? obj['message'] : String(obj['message'] ?? ''),
        details: hasExtras ? { fields: {}, meta } : null,
        timestamp,
        path,
      };
    }

    // Pattern A: NestJS default wrapper — throw new XxxException('message')
    // getResponse() → { statusCode, message: 'original string', error: 'Not Found' }
    return {
      statusCode,
      code: errorFieldToCode(obj['error']),
      message: typeof obj['message'] === 'string' ? obj['message'] : 'An error occurred',
      details: null,
      timestamp,
      path,
    };
  }
}
