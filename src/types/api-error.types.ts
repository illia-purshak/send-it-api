export interface ApiErrorDetails {
  fields: Record<string, string[]>;
  meta: Record<string, unknown>;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details: ApiErrorDetails | null;
  timestamp: string;
  path: string;
}
