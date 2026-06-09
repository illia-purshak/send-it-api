import { AdminAuthController } from './auth.controller.js';
import { AdminAuthService } from './auth.service.js';
import type { AdminJwtUser } from '../../../types/admin-auth.types.js';

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      validateInvite: jest.fn(),
      setPassword: jest.fn(),
      setup2faWithToken: jest.fn(),
      verifySetupWithToken: jest.fn(),
      login: jest.fn(),
      verify2fa: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      enable2fa: jest.fn(),
      disable2fa: jest.fn(),
    };
    controller = new AdminAuthController(service as unknown as AdminAuthService);
  });

  const admin = { id: 1, email: 'admin@example.com' } as AdminJwtUser;

  it('validateInvite delegates to service.validateInvite with token param', async () => {
    const expected = { email: 'invited@example.com' };
    service.validateInvite.mockResolvedValue(expected);

    const result = await controller.validateInvite('invite-token');

    expect(service.validateInvite).toHaveBeenCalledWith('invite-token');
    expect(result).toEqual(expected);
  });

  it('setPassword delegates to service.setPassword with dto', async () => {
    const dto = { token: 'inv-tok', password: 'pass123' } as any;
    const expected = { setupToken: 'st' };
    service.setPassword.mockResolvedValue(expected);

    const result = await controller.setPassword(dto);

    expect(service.setPassword).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('setup2faWithToken delegates to service.setup2faWithToken with dto', async () => {
    const dto = { token: 'inv-tok' } as any;
    const expected = { qrCodeUrl: 'url', secret: 'sec' };
    service.setup2faWithToken.mockResolvedValue(expected);

    const result = await controller.setup2faWithToken(dto);

    expect(service.setup2faWithToken).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('verifySetupWithToken delegates to service.verifySetupWithToken with dto', async () => {
    const dto = { token: 'inv-tok', code: '123456' } as any;
    const expected = { accessToken: 'a', refreshToken: 'r' };
    service.verifySetupWithToken.mockResolvedValue(expected);

    const result = await controller.verifySetupWithToken(dto);

    expect(service.verifySetupWithToken).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('login delegates to service.login with dto', async () => {
    const dto = { email: 'a@e.com', password: 'p' } as any;
    const expected = { accessToken: 'a', refreshToken: 'r' };
    service.login.mockResolvedValue(expected);

    const result = await controller.login(dto);

    expect(service.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('verify2fa delegates to service.verify2fa with dto', async () => {
    const dto = { pendingToken: 'pt', code: '111111' } as any;
    const expected = { accessToken: 'a', refreshToken: 'r' };
    service.verify2fa.mockResolvedValue(expected);

    const result = await controller.verify2fa(dto);

    expect(service.verify2fa).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('refresh delegates to service.refresh with dto', async () => {
    const dto = { refreshToken: 'rt' } as any;
    const expected = { accessToken: 'new-a', refreshToken: 'new-r' };
    service.refresh.mockResolvedValue(expected);

    const result = await controller.refresh(dto);

    expect(service.refresh).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('logout delegates to service.logout with admin and dto', async () => {
    const dto = { refreshToken: 'rt' } as any;
    const expected = { message: 'logged out' };
    service.logout.mockResolvedValue(expected);

    const result = await controller.logout(admin, dto);

    expect(service.logout).toHaveBeenCalledWith(admin, dto);
    expect(result).toEqual(expected);
  });

  it('enable2fa delegates to service.enable2fa with admin and dto', async () => {
    const dto = { code: '123456' } as any;
    const expected = { accessToken: 'a', refreshToken: 'r' };
    service.enable2fa.mockResolvedValue(expected);

    const result = await controller.enable2fa(admin, dto);

    expect(service.enable2fa).toHaveBeenCalledWith(admin, dto);
    expect(result).toEqual(expected);
  });

  it('disable2fa delegates to service.disable2fa with admin and dto', async () => {
    const dto = { code: '654321' } as any;
    const expected = { message: '2fa disabled' };
    service.disable2fa.mockResolvedValue(expected);

    const result = await controller.disable2fa(admin, dto);

    expect(service.disable2fa).toHaveBeenCalledWith(admin, dto);
    expect(result).toEqual(expected);
  });
});
