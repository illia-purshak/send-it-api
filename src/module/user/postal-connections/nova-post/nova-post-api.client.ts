import {
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NovaPostAuthService } from './nova-post-auth.service.js';
import { PostalConnectionsService } from '../postal-connections.service.js';

export interface GetDivisionsParams {
  countryCodes?: string[];
  divisionCategories?: string[];
  settlementIds?: string[];
  limit?: number;
  page?: number;
}

export interface NpDivision {
  id: string;
  number: string;
  name: string;
  address: string;
  settlement: { name: string };
  divisionCategory: string;
  status: string;
}

export interface NpDivisionsResponse {
  data: NpDivision[];
  total: number;
}

@Injectable()
export class NovaPostApiClient {
  private readonly baseUrl: string;

  constructor(
    private readonly novaPostAuthService: NovaPostAuthService,
    private readonly postalConnectionsService: PostalConnectionsService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('NOVA_POST_BASE_URL');
  }

  async request<T>(
    userId: number,
    postalServiceId: number,
    method: string,
    path: string,
    params?: Record<string, string | number | string[] | number[] | undefined>,
    body?: unknown,
  ): Promise<T> {
    const jwt = await this.novaPostAuthService.getJwt(userId, postalServiceId);

    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          for (const item of value) {
            url.searchParams.append(key, String(item));
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const buildInit = (token: string): RequestInit => {
      const headers: Record<string, string> = { Authorization: token };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      return {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      };
    };

    let response = await fetch(url.toString(), buildInit(jwt));

    if (response.status === 401) {
      this.novaPostAuthService.invalidateJwt(userId, postalServiceId);
      const freshJwt = await this.novaPostAuthService.getJwt(userId, postalServiceId);
      response = await fetch(url.toString(), buildInit(freshJwt));
    }

    if (response.status === 401 || response.status === 403) {
      await this.postalConnectionsService.markAsInvalid(userId, postalServiceId);
      throw new UnprocessableEntityException({
        code: 'CONNECTION_INVALID',
        message: 'Your postal connection is no longer valid. Please reconnect.',
      });
    }

    if (!response.ok) {
      throw new ServiceUnavailableException({
        code: 'OPERATOR_UNAVAILABLE',
        message: 'The postal operator is temporarily unavailable. Please try again later.',
      });
    }

    const data = (await response.json()) as Record<string, unknown>;

    if (data['success'] === false) {
      const errors = Array.isArray(data['errors']) ? (data['errors'] as string[]) : [];
      const firstError = errors[0] ?? 'Operator returned an application-level error';

      const isAuthError = /invalid|key|unauthorized|forbidden/i.test(firstError);

      if (isAuthError) {
        await this.postalConnectionsService.markAsInvalid(userId, postalServiceId);
        throw new UnprocessableEntityException({
          code: 'CONNECTION_INVALID',
          message: 'Your postal connection is no longer valid. Please reconnect.',
        });
      }

      throw new ServiceUnavailableException({
        code: 'OPERATOR_ERROR',
        message: firstError,
      });
    }

    return data as T;
  }

  async getDivisions(
    userId: number,
    postalServiceId: number,
    params: GetDivisionsParams,
  ): Promise<NpDivisionsResponse> {
    const queryParams: Record<string, string | number | undefined> = {
      limit: params.limit,
      page: params.page,
    };
    if (params.countryCodes?.length) queryParams['countryCodes'] = params.countryCodes.join(',');
    if (params.divisionCategories?.length) queryParams['divisionCategories'] = params.divisionCategories.join(',');
    if (params.settlementIds?.length) queryParams['settlementIds'] = params.settlementIds.join(',');

    return this.request<NpDivisionsResponse>(userId, postalServiceId, 'GET', '/divisions', queryParams);
  }
}
