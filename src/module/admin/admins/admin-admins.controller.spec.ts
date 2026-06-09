import { AdminAdminsController } from './admin-admins.controller.js';
import { AdminAdminsService } from './admin-admins.service.js';
import type { AdminJwtUser } from '../../../types/admin-auth.types.js';

describe('AdminAdminsController', () => {
  let controller: AdminAdminsController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getAll: jest.fn(),
      getById: jest.fn(),
      inviteAdmin: jest.fn(),
      resendInvite: jest.fn(),
      updateStatus: jest.fn(),
      deleteAdmin: jest.fn(),
    };
    controller = new AdminAdminsController(service as unknown as AdminAdminsService);
  });

  const admin = { id: 1, role: 'SUPER_ADMIN' } as AdminJwtUser;

  it('getAll delegates to service.getAll with query', async () => {
    const query = { page: 1, limit: 10 } as any;
    const expected = { items: [], meta: {} };
    service.getAll.mockResolvedValue(expected);

    const result = await controller.getAll(query);

    expect(service.getAll).toHaveBeenCalledWith(query);
    expect(result).toEqual(expected);
  });

  it('getById delegates to service.getById with id', async () => {
    const expected = { id: 2, email: 'admin2@example.com' };
    service.getById.mockResolvedValue(expected);

    const result = await controller.getById(2);

    expect(service.getById).toHaveBeenCalledWith(2);
    expect(result).toEqual(expected);
  });

  it('inviteAdmin delegates to service.inviteAdmin with admin and dto', async () => {
    const dto = { email: 'new@example.com' } as any;
    const expected = { id: 10, email: 'new@example.com' };
    service.inviteAdmin.mockResolvedValue(expected);

    const result = await controller.inviteAdmin(admin, dto);

    expect(service.inviteAdmin).toHaveBeenCalledWith(admin, dto);
    expect(result).toEqual(expected);
  });

  it('resendInvite delegates to service.resendInvite with admin and id', async () => {
    const expected = { message: 'invite resent' };
    service.resendInvite.mockResolvedValue(expected);

    const result = await controller.resendInvite(admin, 3);

    expect(service.resendInvite).toHaveBeenCalledWith(admin, 3);
    expect(result).toEqual(expected);
  });

  it('updateStatus delegates to service.updateStatus with id and dto', async () => {
    const dto = { status: 'ACTIVE' } as any;
    const expected = { id: 2, status: 'ACTIVE' };
    service.updateStatus.mockResolvedValue(expected);

    const result = await controller.updateStatus(2, dto);

    expect(service.updateStatus).toHaveBeenCalledWith(2, dto);
    expect(result).toEqual(expected);
  });

  it('deleteAdmin delegates to service.deleteAdmin with admin and id', async () => {
    service.deleteAdmin.mockResolvedValue(undefined);

    await controller.deleteAdmin(admin, 4);

    expect(service.deleteAdmin).toHaveBeenCalledWith(admin, 4);
  });
});
