import { AdminSupportService } from './admin-support.service.js';

const mockNotificationsService = { create: jest.fn().mockResolvedValue(undefined) } as any;

describe('AdminSupportService', () => {
  it('lists tickets ordered by status then latest activity', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      db: {
        supportTicket: { findMany, count },
      },
    } as any;

    const service = new AdminSupportService(prisma, mockNotificationsService);
    await service.getTickets({ page: 1, limit: 3, status: 'WAITING' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }],
        take: 3,
        where: { status: 'WAITING' },
      }),
    );
  });

  it('bumps ticket updatedAt when an assigned admin posts a message', async () => {
    const createdMessage = {
      id: 99,
      ticketId: 7,
      body: 'Reply',
      admin: { id: 5, firstName: 'Admin', lastName: 'User' },
    };
    const supportTicketFindUnique = jest
      .fn()
      .mockResolvedValue({ id: 7, status: 'IN_PROGRESS', assignedToId: 5, userId: 1, subject: 'Test' });
    const supportMessageCreate = jest.fn().mockResolvedValue(createdMessage);
    const supportTicketUpdate = jest.fn().mockResolvedValue({ id: 7 });
    const transaction = jest.fn().mockImplementation(async (operations) => Promise.all(operations));

    const prisma = {
      db: {
        supportTicket: { findUnique: supportTicketFindUnique, update: supportTicketUpdate },
        supportMessage: { create: supportMessageCreate },
        $transaction: transaction,
      },
    } as any;

    const service = new AdminSupportService(prisma, mockNotificationsService);
    const result = await service.postMessage(5, 7, { body: 'Reply' });

    expect(result).toEqual(createdMessage);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(supportTicketUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: expect.objectContaining({ updatedAt: expect.any(Date) }),
      }),
    );
  });
});
