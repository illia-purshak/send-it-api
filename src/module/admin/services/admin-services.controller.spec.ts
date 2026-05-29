import { AdminServicesController } from './admin-services.controller.js';
import { AdminServicesService } from './admin-services.service.js';

describe('AdminServicesController', () => {
  let controller: AdminServicesController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getAll: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    controller = new AdminServicesController(service as unknown as AdminServicesService);
  });

  it('getAll delegates to service.getAll with no arguments', async () => {
    const expected = [{ id: 1, slug: 'nova-poshta' }];
    service.getAll.mockResolvedValue(expected);

    const result = await controller.getAll();

    expect(service.getAll).toHaveBeenCalled();
    expect(result).toEqual(expected);
  });

  it('getById delegates to service.getById with id', async () => {
    const expected = { id: 1, slug: 'nova-poshta', name: 'Nova Poshta' };
    service.getById.mockResolvedValue(expected);

    const result = await controller.getById(1);

    expect(service.getById).toHaveBeenCalledWith(1);
    expect(result).toEqual(expected);
  });

  it('create delegates to service.create with dto', async () => {
    const dto = { name: 'Meest', slug: 'meest', logoUrl: 'https://logo.url' } as any;
    const expected = { id: 3, slug: 'meest' };
    service.create.mockResolvedValue(expected);

    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('update delegates to service.update with id and dto', async () => {
    const dto = { name: 'Nova Poshta Updated' } as any;
    const expected = { id: 1, name: 'Nova Poshta Updated' };
    service.update.mockResolvedValue(expected);

    const result = await controller.update(1, dto);

    expect(service.update).toHaveBeenCalledWith(1, dto);
    expect(result).toEqual(expected);
  });

  it('delete delegates to service.delete with id', async () => {
    service.delete.mockResolvedValue(undefined);

    await controller.delete(1);

    expect(service.delete).toHaveBeenCalledWith(1);
  });
});
