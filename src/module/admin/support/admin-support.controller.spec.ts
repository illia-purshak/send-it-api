import { AdminSupportController } from './admin-support.controller.js';
import { AdminSupportService } from './admin-support.service.js';
import type { AdminJwtUser } from '../../../types/admin-auth.types.js';

describe('AdminSupportController', () => {
  let controller: AdminSupportController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getMyTickets: jest.fn(),
      getTickets: jest.fn(),
      getTicketById: jest.fn(),
      performAction: jest.fn(),
      postMessage: jest.fn(),
      markRead: jest.fn(),
    };
    controller = new AdminSupportController(service as unknown as AdminSupportService);
  });

  const admin = { id: 3, email: 'support@example.com' } as AdminJwtUser;

  it('getMyTickets delegates to service.getMyTickets with admin id and query', async () => {
    const query = { page: 1, limit: 10 } as any;
    const expected = { items: [], meta: {} };
    service.getMyTickets.mockResolvedValue(expected);

    const result = await controller.getMyTickets(admin, query);

    expect(service.getMyTickets).toHaveBeenCalledWith(3, query);
    expect(result).toEqual(expected);
  });

  it('getTickets delegates to service.getTickets with query', async () => {
    const query = { page: 1, status: 'WAITING' } as any;
    const expected = { items: [], meta: {} };
    service.getTickets.mockResolvedValue(expected);

    const result = await controller.getTickets(query);

    expect(service.getTickets).toHaveBeenCalledWith(query);
    expect(result).toEqual(expected);
  });

  it('getTicketById delegates to service.getTicketById with admin id and ticket id', async () => {
    const expected = { id: 1, subject: 'Issue', messages: [] };
    service.getTicketById.mockResolvedValue(expected);

    const result = await controller.getTicketById(admin, 1);

    expect(service.getTicketById).toHaveBeenCalledWith(3, 1);
    expect(result).toEqual(expected);
  });

  it('performAction delegates to service.performAction with admin id, ticket id and dto', async () => {
    const dto = { action: 'assign' } as any;
    const expected = { id: 1, assignedAdminId: 3 };
    service.performAction.mockResolvedValue(expected);

    const result = await controller.performAction(admin, 1, dto);

    expect(service.performAction).toHaveBeenCalledWith(3, 1, dto);
    expect(result).toEqual(expected);
  });

  it('postMessage delegates to service.postMessage with admin id, ticket id and dto', async () => {
    const dto = { message: 'We are looking into this' } as any;
    const expected = { id: 10, message: 'We are looking into this' };
    service.postMessage.mockResolvedValue(expected);

    const result = await controller.postMessage(admin, 1, dto);

    expect(service.postMessage).toHaveBeenCalledWith(3, 1, dto);
    expect(result).toEqual(expected);
  });

  it('markRead delegates to service.markRead with admin id and ticket id', async () => {
    const expected = { success: true };
    service.markRead.mockResolvedValue(expected);

    const result = await controller.markRead(admin, 1);

    expect(service.markRead).toHaveBeenCalledWith(3, 1);
    expect(result).toEqual(expected);
  });
});
