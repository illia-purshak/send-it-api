import { SupportController } from './support.controller.js';
import { SupportService } from './support.service.js';
import type { JwtUser } from '../../../types/auth.types.js';

describe('SupportController', () => {
  let controller: SupportController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getTickets: jest.fn(),
      createTicket: jest.fn(),
      getTicketById: jest.fn(),
      postMessage: jest.fn(),
      markRead: jest.fn(),
    };
    controller = new SupportController(service as unknown as SupportService);
  });

  const user = { id: 12 } as JwtUser;

  it('getTickets delegates to service.getTickets with user id and query', async () => {
    const query = { page: 1, limit: 10 } as any;
    const expected = { items: [], meta: {}, openCount: 0 };
    service.getTickets.mockResolvedValue(expected);

    const result = await controller.getTickets(user, query);

    expect(service.getTickets).toHaveBeenCalledWith(12, query);
    expect(result).toEqual(expected);
  });

  it('createTicket delegates to service.createTicket with user id and dto', async () => {
    const dto = { subject: 'Help', message: 'I need help' } as any;
    const expected = { id: 1, subject: 'Help' };
    service.createTicket.mockResolvedValue(expected);

    const result = await controller.createTicket(user, dto);

    expect(service.createTicket).toHaveBeenCalledWith(12, dto);
    expect(result).toEqual(expected);
  });

  it('getTicketById delegates to service.getTicketById with user id and ticket id', async () => {
    const expected = { id: 1, subject: 'Help', messages: [] };
    service.getTicketById.mockResolvedValue(expected);

    const result = await controller.getTicketById(user, 1);

    expect(service.getTicketById).toHaveBeenCalledWith(12, 1);
    expect(result).toEqual(expected);
  });

  it('postMessage delegates to service.postMessage with user id, ticket id and dto', async () => {
    const dto = { message: 'My reply' } as any;
    const expected = { id: 10, message: 'My reply' };
    service.postMessage.mockResolvedValue(expected);

    const result = await controller.postMessage(user, 1, dto);

    expect(service.postMessage).toHaveBeenCalledWith(12, 1, dto);
    expect(result).toEqual(expected);
  });

  it('markRead delegates to service.markRead with user id and ticket id', async () => {
    const expected = { success: true };
    service.markRead.mockResolvedValue(expected);

    const result = await controller.markRead(user, 1);

    expect(service.markRead).toHaveBeenCalledWith(12, 1);
    expect(result).toEqual(expected);
  });
});
