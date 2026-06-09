import { ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { NovaPostApiClient } from './nova-post-api.client.js';
import { NovaPostAuthService } from './nova-post-auth.service.js';
import { PostalConnectionsService } from '../postal-connections.service.js';

function makeClient(
  authService: Partial<NovaPostAuthService> = {},
  postalConnectionsService: Partial<PostalConnectionsService> = {},
) {
  const config = { getOrThrow: jest.fn().mockReturnValue('https://api.novapost.com') };
  return new NovaPostApiClient(
    authService as NovaPostAuthService,
    postalConnectionsService as PostalConnectionsService,
    config as any,
  );
}

function mockFetch(responseData: unknown, status = 200) {
  const response = {
    status,
    ok: status >= 200 && status < 300,
    json: jest.fn().mockResolvedValue(responseData),
  };
  global.fetch = jest.fn().mockResolvedValue(response) as any;
  return response;
}

describe('NovaPostApiClient.request()', () => {
  const authService = { getJwt: jest.fn().mockResolvedValue('Bearer test-jwt'), invalidateJwt: jest.fn() };
  const postalConnectionsService = { markAsInvalid: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    jest.clearAllMocks();
    authService.getJwt.mockResolvedValue('Bearer test-jwt');
  });

  it('returns parsed data on HTTP 200 with no success:false flag', async () => {
    const data = { items: [{ id: '1' }], total: 1 };
    mockFetch(data, 200);
    const client = makeClient(authService, postalConnectionsService);

    const result = await client.request(1, 2, 'GET', '/shipments');

    expect(result).toEqual(data);
  });

  it('returns parsed data on HTTP 200 with success:true', async () => {
    const data = { success: true, items: [] };
    mockFetch(data, 200);
    const client = makeClient(authService, postalConnectionsService);

    const result = await client.request(1, 2, 'GET', '/shipments');

    expect(result).toEqual(data);
  });

  it('throws UnprocessableEntityException and marks invalid on success:false with auth error keyword "Invalid"', async () => {
    mockFetch({ success: false, errors: ['API key is Invalid'] }, 200);
    const client = makeClient(authService, postalConnectionsService);

    await expect(client.request(1, 2, 'GET', '/shipments')).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(postalConnectionsService.markAsInvalid).toHaveBeenCalledWith(1, 2);
  });

  it('throws UnprocessableEntityException and marks invalid on success:false with keyword "key"', async () => {
    mockFetch({ success: false, errors: ['Invalid key provided'] }, 200);
    const client = makeClient(authService, postalConnectionsService);

    await expect(client.request(1, 2, 'GET', '/shipments')).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(postalConnectionsService.markAsInvalid).toHaveBeenCalledWith(1, 2);
  });

  it('throws UnprocessableEntityException on success:false with "unauthorized" keyword', async () => {
    mockFetch({ success: false, errors: ['Unauthorized access'] }, 200);
    const client = makeClient(authService, postalConnectionsService);

    await expect(client.request(1, 2, 'GET', '/shipments')).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(postalConnectionsService.markAsInvalid).toHaveBeenCalled();
  });

  it('throws ServiceUnavailableException on success:false without auth error keyword', async () => {
    mockFetch({ success: false, errors: ['Service temporarily unavailable'] }, 200);
    const client = makeClient(authService, postalConnectionsService);

    await expect(client.request(1, 2, 'GET', '/shipments')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(postalConnectionsService.markAsInvalid).not.toHaveBeenCalled();
  });

  it('throws ServiceUnavailableException on success:false with empty errors array', async () => {
    mockFetch({ success: false, errors: [] }, 200);
    const client = makeClient(authService, postalConnectionsService);

    await expect(client.request(1, 2, 'GET', '/shipments')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(postalConnectionsService.markAsInvalid).not.toHaveBeenCalled();
  });

  it('throws ServiceUnavailableException on non-200 non-401/403 HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 503, ok: false, json: jest.fn() }) as any;
    const client = makeClient(authService, postalConnectionsService);

    await expect(client.request(1, 2, 'GET', '/shipments')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('retries on 401 with fresh JWT then marks invalid if still 401', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ status: 401, ok: false, json: jest.fn() })
      .mockResolvedValueOnce({ status: 401, ok: false, json: jest.fn() }) as any;

    authService.getJwt.mockResolvedValue('fresh-jwt');
    const client = makeClient(authService, postalConnectionsService);

    await expect(client.request(1, 2, 'GET', '/shipments')).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(authService.invalidateJwt).toHaveBeenCalledWith(1, 2);
    expect(postalConnectionsService.markAsInvalid).toHaveBeenCalledWith(1, 2);
  });

  it('appends query params to URL', async () => {
    const data = { items: [], total: 0 };
    mockFetch(data, 200);
    const client = makeClient(authService, postalConnectionsService);

    await client.request(1, 2, 'GET', '/shipments', { limit: 10, page: 2 });

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).toContain('page=2');
  });

  it('appends array params with repeated keys', async () => {
    const data = { items: [], total: 0 };
    mockFetch(data, 200);
    const client = makeClient(authService, postalConnectionsService);

    await client.request(1, 2, 'GET', '/shipments', { 'numbers[]': ['TTN1', 'TTN2'] });

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('numbers%5B%5D=TTN1');
    expect(calledUrl).toContain('numbers%5B%5D=TTN2');
  });
});
