import { SubscriptionController } from './subscription.controller.js';
import { SubscriptionService } from './subscription.service.js';
import type { JwtUser } from '../../../types/auth.types.js';

describe('SubscriptionController', () => {
  let controller: SubscriptionController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getPlans: jest.fn(),
      getMySubscriptions: jest.fn(),
      buySubscription: jest.fn(),
      updateBalance: jest.fn(),
      cancelBalance: jest.fn(),
    };
    controller = new SubscriptionController(service as unknown as SubscriptionService);
  });

  const user = { id: 4 } as JwtUser;

  it('getPlans delegates to service.getPlans with user id', async () => {
    const expected = [{ id: 1, name: 'FREE' }];
    service.getPlans.mockResolvedValue(expected);

    const result = await controller.getPlans(user);

    expect(service.getPlans).toHaveBeenCalledWith(4);
    expect(result).toEqual(expected);
  });

  it('getMySubscriptions delegates to service.getMySubscriptions with user id', async () => {
    const expected = [{ id: 10, planId: 1 }];
    service.getMySubscriptions.mockResolvedValue(expected);

    const result = await controller.getMySubscriptions(user);

    expect(service.getMySubscriptions).toHaveBeenCalledWith(4);
    expect(result).toEqual(expected);
  });

  it('buySubscription delegates to service.buySubscription with user id and dto', async () => {
    const dto = { planId: 2, paymentCardId: 3 } as any;
    const expected = { id: 11, planId: 2 };
    service.buySubscription.mockResolvedValue(expected);

    const result = await controller.buySubscription(user, dto);

    expect(service.buySubscription).toHaveBeenCalledWith(4, dto);
    expect(result).toEqual(expected);
  });

  it('updateBalance delegates to service.updateBalance with user id, balance id and dto', async () => {
    const dto = { autoRenew: false } as any;
    const expected = { id: 10, autoRenew: false };
    service.updateBalance.mockResolvedValue(expected);

    const result = await controller.updateBalance(user, 10, dto);

    expect(service.updateBalance).toHaveBeenCalledWith(4, 10, dto);
    expect(result).toEqual(expected);
  });

  it('cancelBalance delegates to service.cancelBalance with user id and balance id', async () => {
    const expected = { id: 10, status: 'CANCELLED' };
    service.cancelBalance.mockResolvedValue(expected);

    const result = await controller.cancelBalance(user, 10);

    expect(service.cancelBalance).toHaveBeenCalledWith(4, 10);
    expect(result).toEqual(expected);
  });
});
