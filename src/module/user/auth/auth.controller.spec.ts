import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import type { JwtUser } from '../../../types/auth.types.js';

describe('AuthController', () => {
  let controller: AuthController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getMe: jest.fn(),
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      logout: jest.fn(),
      setup2fa: jest.fn(),
      enable2fa: jest.fn(),
      disable2fa: jest.fn(),
      verify2fa: jest.fn(),
      completeProfile: jest.fn(),
    };
    controller = new AuthController(service as unknown as AuthService);
  });

  const user = { id: 1, email: 'test@example.com' } as JwtUser;

  it('getMe delegates to service.getMe with full user object', async () => {
    const expected = { id: 1, email: 'test@example.com' };
    service.getMe.mockResolvedValue(expected);

    const result = await controller.getMe(user);

    expect(service.getMe).toHaveBeenCalledWith(user);
    expect(result).toEqual(expected);
  });

  it('register delegates to service.register with dto', async () => {
    const dto = { email: 'new@example.com', password: 'pass' } as any;
    const expected = { requiresProfileCompletion: true, profileSetupToken: 'tok' };
    service.register.mockResolvedValue(expected);

    const result = await controller.register(dto);

    expect(service.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('login delegates to service.login with dto', async () => {
    const dto = { email: 'u@e.com', password: 'p' } as any;
    const expected = { accessToken: 'a', refreshToken: 'r' };
    service.login.mockResolvedValue(expected);

    const result = await controller.login(dto);

    expect(service.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('refresh delegates to service.refresh with dto', async () => {
    const dto = { refreshToken: 'rt' } as any;
    const expected = { accessToken: 'a', refreshToken: 'r2' };
    service.refresh.mockResolvedValue(expected);

    const result = await controller.refresh(dto);

    expect(service.refresh).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('forgotPassword delegates to service.forgotPassword with dto', async () => {
    const dto = { email: 'u@e.com' } as any;
    const expected = { message: 'ok' };
    service.forgotPassword.mockResolvedValue(expected);

    const result = await controller.forgotPassword(dto);

    expect(service.forgotPassword).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('resetPassword delegates to service.resetPassword with dto', async () => {
    const dto = { token: 'tok', password: 'newpass' } as any;
    const expected = { message: 'done' };
    service.resetPassword.mockResolvedValue(expected);

    const result = await controller.resetPassword(dto);

    expect(service.resetPassword).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('logout delegates to service.logout with user and dto', async () => {
    const dto = { refreshToken: 'rt' } as any;
    const expected = { message: 'logged out' };
    service.logout.mockResolvedValue(expected);

    const result = await controller.logout(user, dto);

    expect(service.logout).toHaveBeenCalledWith(user, dto);
    expect(result).toEqual(expected);
  });

  it('setup2fa delegates to service.setup2fa with full user object', async () => {
    const expected = { qrCodeUrl: 'url', secret: 'sec' };
    service.setup2fa.mockResolvedValue(expected);

    const result = await controller.setup2fa(user);

    expect(service.setup2fa).toHaveBeenCalledWith(user);
    expect(result).toEqual(expected);
  });

  it('enable2fa delegates to service.enable2fa with user and dto', async () => {
    const dto = { code: '123456' } as any;
    const expected = { message: '2fa enabled' };
    service.enable2fa.mockResolvedValue(expected);

    const result = await controller.enable2fa(user, dto);

    expect(service.enable2fa).toHaveBeenCalledWith(user, dto);
    expect(result).toEqual(expected);
  });

  it('disable2fa delegates to service.disable2fa with user and dto', async () => {
    const dto = { code: '654321' } as any;
    const expected = { message: '2fa disabled' };
    service.disable2fa.mockResolvedValue(expected);

    const result = await controller.disable2fa(user, dto);

    expect(service.disable2fa).toHaveBeenCalledWith(user, dto);
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

  it('completeProfile delegates to service.completeProfile with dto', async () => {
    const dto = { setupToken: 'st', companyName: 'Acme' } as any;
    const expected = { accessToken: 'a', refreshToken: 'r' };
    service.completeProfile.mockResolvedValue(expected);

    const result = await controller.completeProfile(dto);

    expect(service.completeProfile).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });
});
