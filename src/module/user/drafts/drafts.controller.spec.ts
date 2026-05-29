import { DraftsController } from './drafts.controller.js';
import { ShipmentDraftsService } from '../shipments/shipment-drafts.service.js';
import type { JwtUser } from '../../../types/auth.types.js';

describe('DraftsController', () => {
  let controller: DraftsController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getDrafts: jest.fn(),
      getDraftById: jest.fn(),
      saveDraft: jest.fn(),
      updateDraft: jest.fn(),
      deleteDraft: jest.fn(),
    };
    controller = new DraftsController(service as unknown as ShipmentDraftsService);
  });

  const user = { id: 6 } as JwtUser;

  it('getDrafts wraps service.getDrafts result in unpaginated response', async () => {
    const drafts = [{ id: 1, data: {} }, { id: 2, data: {} }];
    service.getDrafts.mockResolvedValue(drafts);

    const result = await controller.getDrafts(user);

    expect(service.getDrafts).toHaveBeenCalledWith(6);
    expect(result).toEqual({
      items: drafts,
      meta: {
        page: 1,
        pageSize: 2,
        totalItems: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });

  it('getDraftById delegates to service.getDraftById with user id and draft id', async () => {
    const expected = { id: 3, data: {} };
    service.getDraftById.mockResolvedValue(expected);

    const result = await controller.getDraftById(user, 3);

    expect(service.getDraftById).toHaveBeenCalledWith(6, 3);
    expect(result).toEqual(expected);
  });

  it('saveDraft delegates to service.saveDraft with user id and dto', async () => {
    const dto = { operator: 'nova-poshta', data: {} } as any;
    const expected = { id: 4, operator: 'nova-poshta' };
    service.saveDraft.mockResolvedValue(expected);

    const result = await controller.saveDraft(user, dto);

    expect(service.saveDraft).toHaveBeenCalledWith(6, dto);
    expect(result).toEqual(expected);
  });

  it('updateDraft delegates to service.updateDraft with user id, draft id and dto', async () => {
    const dto = { data: { updated: true } } as any;
    const expected = { id: 4, data: { updated: true } };
    service.updateDraft.mockResolvedValue(expected);

    const result = await controller.updateDraft(user, 4, dto);

    expect(service.updateDraft).toHaveBeenCalledWith(6, 4, dto);
    expect(result).toEqual(expected);
  });

  it('deleteDraft delegates to service.deleteDraft with user id and draft id', async () => {
    service.deleteDraft.mockResolvedValue(undefined);

    await controller.deleteDraft(user, 4);

    expect(service.deleteDraft).toHaveBeenCalledWith(6, 4);
  });
});
