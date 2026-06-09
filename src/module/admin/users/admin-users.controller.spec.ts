import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersService } from './admin-users.service.js';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getAll: jest.fn(),
      getById: jest.fn(),
      updateStatus: jest.fn(),
    };
    controller = new AdminUsersController(service as unknown as AdminUsersService);
  });

  it('getAll delegates to service.getAll with query', async () => {
    const query = { page: 1, limit: 20 } as any;
    const expected = { items: [], meta: {} };
    service.getAll.mockResolvedValue(expected);

    const result = await controller.getAll(query);

    expect(service.getAll).toHaveBeenCalledWith(query);
    expect(result).toEqual(expected);
  });

  it('getById delegates to service.getById with id', async () => {
    const expected = { id: 5, email: 'user5@example.com' };
    service.getById.mockResolvedValue(expected);

    const result = await controller.getById(5);

    expect(service.getById).toHaveBeenCalledWith(5);
    expect(result).toEqual(expected);
  });

  it('updateStatus delegates to service.updateStatus with id and dto', async () => {
    const dto = { status: 'BANNED' } as any;
    const expected = { id: 5, status: 'BANNED' };
    service.updateStatus.mockResolvedValue(expected);

    const result = await controller.updateStatus(5, dto);

    expect(service.updateStatus).toHaveBeenCalledWith(5, dto);
    expect(result).toEqual(expected);
  });
});
