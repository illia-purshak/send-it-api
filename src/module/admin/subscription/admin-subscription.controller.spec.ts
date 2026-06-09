import { AdminSubscriptionController } from './admin-subscription.controller.js';
import { AdminSubscriptionService } from './admin-subscription.service.js';
import { DiscountType } from '../../../../generated/prisma/enums.js';

describe('AdminSubscriptionController', () => {
  let controller: AdminSubscriptionController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getAll: jest.fn(),
      getById: jest.fn(),
      changePlan: jest.fn(),
      extendBalance: jest.fn(),
      cancelBalance: jest.fn(),
      setDiscount: jest.fn(),
    };
    controller = new AdminSubscriptionController(service as unknown as AdminSubscriptionService);
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
    const expected = { id: 5, planId: 2 };
    service.getById.mockResolvedValue(expected);

    const result = await controller.getById(5);

    expect(service.getById).toHaveBeenCalledWith(5);
    expect(result).toEqual(expected);
  });

  it('updateBalance with changePlan action delegates to service.changePlan', async () => {
    const dto = { action: 'changePlan', planId: 3 } as any;
    const expected = { id: 5, planId: 3 };
    service.changePlan.mockResolvedValue(expected);

    const result = await controller.updateBalance(5, dto);

    expect(service.changePlan).toHaveBeenCalledWith(5, 3);
    expect(result).toEqual(expected);
  });

  it('updateBalance with extend action delegates to service.extendBalance', async () => {
    const dto = { action: 'extend', days: 30 } as any;
    const expected = { id: 5, endsAt: new Date() };
    service.extendBalance.mockResolvedValue(expected);

    const result = await controller.updateBalance(5, dto);

    expect(service.extendBalance).toHaveBeenCalledWith(5, 30);
    expect(result).toEqual(expected);
  });

  it('updateBalance with cancel action delegates to service.cancelBalance', async () => {
    const dto = { action: 'cancel' } as any;
    const expected = { id: 5, status: 'CANCELLED' };
    service.cancelBalance.mockResolvedValue(expected);

    const result = await controller.updateBalance(5, dto);

    expect(service.cancelBalance).toHaveBeenCalledWith(5);
    expect(result).toEqual(expected);
  });

  it('updateBalance with setDiscount action delegates to service.setDiscount', async () => {
    const dto = { action: 'setDiscount', amount: 20, discountType: DiscountType.PERCENTAGE } as any;
    const expected = { id: 5, discountAmount: 20 };
    service.setDiscount.mockResolvedValue(expected);

    const result = await controller.updateBalance(5, dto);

    expect(service.setDiscount).toHaveBeenCalledWith(5, 20, DiscountType.PERCENTAGE);
    expect(result).toEqual(expected);
  });
});
