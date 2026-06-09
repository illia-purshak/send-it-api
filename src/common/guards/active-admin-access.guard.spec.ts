import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ActiveAdminAccessGuard } from './active-admin-access.guard.js';

describe('ActiveAdminAccessGuard', () => {
  function createContext(user?: unknown) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  }

  it('allows active admins with access tokens', async () => {
    const prisma = {
      db: {
        admin: {
          findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
        },
      },
    } as any;

    const guard = new ActiveAdminAccessGuard(prisma);

    await expect(
      guard.canActivate(
        createContext({
          id: 1,
          email: 'admin@sendit.dev',
          isSuperAdmin: false,
          type: 'access',
        }),
      ),
    ).resolves.toBe(true);
  });

  it('rejects missing admin users', async () => {
    const guard = new ActiveAdminAccessGuard({ db: { admin: { findUnique: jest.fn() } } } as any);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects setup-required tokens', async () => {
    const guard = new ActiveAdminAccessGuard({ db: { admin: { findUnique: jest.fn() } } } as any);

    await expect(
      guard.canActivate(
        createContext({
          id: 1,
          email: 'admin@sendit.dev',
          isSuperAdmin: false,
          type: 'setup_required',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects inactive admins', async () => {
    const prisma = {
      db: {
        admin: {
          findUnique: jest.fn().mockResolvedValue({ status: 'INACTIVE' }),
        },
      },
    } as any;

    const guard = new ActiveAdminAccessGuard(prisma);

    await expect(
      guard.canActivate(
        createContext({
          id: 1,
          email: 'admin@sendit.dev',
          isSuperAdmin: false,
          type: 'access',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
