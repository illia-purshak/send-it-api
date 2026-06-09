import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import type { JwtUser } from '../../../types/auth.types.js';

describe('BillingController', () => {
  let controller: BillingController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getHistory: jest.fn(),
      getCard: jest.fn(),
      saveCard: jest.fn(),
      updateCard: jest.fn(),
      removeCard: jest.fn(),
    };
    controller = new BillingController(service as unknown as BillingService);
  });

  const user = { id: 2 } as JwtUser;

  it('getHistory delegates to service.getHistory with user id, page and limit', async () => {
    const query = { page: 1, limit: 10 } as any;
    const expected = { items: [], meta: {} };
    service.getHistory.mockResolvedValue(expected);

    const result = await controller.getHistory(user, query);

    expect(service.getHistory).toHaveBeenCalledWith(2, 1, 10);
    expect(result).toEqual(expected);
  });

  it('getCard delegates to service.getCard with user id', async () => {
    const expected = { lastFour: '4242' };
    service.getCard.mockResolvedValue(expected);

    const result = await controller.getCard(user);

    expect(service.getCard).toHaveBeenCalledWith(2);
    expect(result).toEqual(expected);
  });

  it('saveCard delegates to service.saveCard with individual card fields', async () => {
    const dto = {
      cardNumber: '4111111111111111',
      lastFour: '1111',
      expiryMonth: 12,
      expiryYear: 2027,
      cardholderName: 'John Doe',
    } as any;
    const expected = { id: 1, lastFour: '1111' };
    service.saveCard.mockResolvedValue(expected);

    const result = await controller.saveCard(user, dto);

    expect(service.saveCard).toHaveBeenCalledWith(2, dto.cardNumber, dto.lastFour, dto.expiryMonth, dto.expiryYear, dto.cardholderName);
    expect(result).toEqual(expected);
  });

  it('updateCard delegates to service.updateCard with individual card fields', async () => {
    const dto = {
      cardNumber: '5500000000000004',
      lastFour: '0004',
      expiryMonth: 6,
      expiryYear: 2028,
      cardholderName: 'Jane Doe',
    } as any;
    const expected = { id: 1, lastFour: '0004' };
    service.updateCard.mockResolvedValue(expected);

    const result = await controller.updateCard(user, dto);

    expect(service.updateCard).toHaveBeenCalledWith(2, dto.cardNumber, dto.lastFour, dto.expiryMonth, dto.expiryYear, dto.cardholderName);
    expect(result).toEqual(expected);
  });

  it('removeCard delegates to service.removeCard with user id', async () => {
    service.removeCard.mockResolvedValue(undefined);

    await controller.removeCard(user);

    expect(service.removeCard).toHaveBeenCalledWith(2);
  });
});
