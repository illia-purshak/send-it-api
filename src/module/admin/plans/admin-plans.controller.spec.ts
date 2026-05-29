import { AdminPlansController } from './admin-plans.controller.js';
import { AdminPlansService } from './admin-plans.service.js';

describe('AdminPlansController', () => {
  let controller: AdminPlansController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getAll: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new AdminPlansController(service as unknown as AdminPlansService);
  });

  it('getAll delegates to service.getAll with query', async () => {
    const query = { page: 1, limit: 10 } as any;
    const expected = { items: [], meta: {} };
    service.getAll.mockResolvedValue(expected);

    const result = await controller.getAll(query);

    expect(service.getAll).toHaveBeenCalledWith(query);
    expect(result).toEqual(expected);
  });

  it('getById delegates to service.getById with id', async () => {
    const expected = { id: 2, name: 'PRO' };
    service.getById.mockResolvedValue(expected);

    const result = await controller.getById(2);

    expect(service.getById).toHaveBeenCalledWith(2);
    expect(result).toEqual(expected);
  });

  it('create delegates to service.create with dto', async () => {
    const dto = { name: 'ULTRA', price: 99 } as any;
    const expected = { id: 5, name: 'ULTRA' };
    service.create.mockResolvedValue(expected);

    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('update delegates to service.update with id and dto', async () => {
    const dto = { price: 89 } as any;
    const expected = { id: 2, price: 89 };
    service.update.mockResolvedValue(expected);

    const result = await controller.update(2, dto);

    expect(service.update).toHaveBeenCalledWith(2, dto);
    expect(result).toEqual(expected);
  });

  it('remove delegates to service.remove with id', async () => {
    const expected = { deleted: true };
    service.remove.mockResolvedValue(expected);

    const result = await controller.remove(2);

    expect(service.remove).toHaveBeenCalledWith(2);
    expect(result).toEqual(expected);
  });
});
