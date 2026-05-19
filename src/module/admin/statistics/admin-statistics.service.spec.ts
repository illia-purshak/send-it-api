import { AdminStatisticsService } from './admin-statistics.service.js';
import { PostalConnectionStatus, SubscriptionBalanceStatus, TicketStatus } from '../../../../generated/prisma/enums.js';

describe('AdminStatisticsService', () => {
  it('calculates summary and postal operator percentages correctly', async () => {
    const prisma = {
      db: {
        user: {
          count: jest
            .fn()
            .mockResolvedValueOnce(10)
            .mockResolvedValueOnce(3)
            .mockResolvedValueOnce(4)
            .mockResolvedValueOnce(2)
            .mockResolvedValueOnce(1),
        },
        userPostalConnection: {
          count: jest.fn().mockResolvedValue(7),
        },
        supportTicket: {
          count: jest.fn().mockResolvedValue(5),
        },
        postalService: {
          findMany: jest.fn().mockResolvedValue([
            { id: 11, slug: 'nova-poshta' },
            { id: 22, slug: 'ukrposhta' },
            { id: 33, slug: 'meest' },
          ]),
        },
      },
    } as any;

    const service = new AdminStatisticsService(prisma);

    await expect(service.getStatistics()).resolves.toEqual({
      summary: {
        totalUsers: 10,
        activePaidSubscriptions: 3,
        totalConnectedPostalOperators: 7,
        openSupportTickets: 5,
      },
      postalOperators: [
        {
          id: 11,
          code: 'nova_poshta',
          displayName: 'Nova Poshta',
          connectedUsers: 4,
          connectedUsersPercent: 40,
          responseTimeMs: null,
          status: null,
        },
        {
          id: 22,
          code: 'ukrposhta',
          displayName: 'Ukrposhta',
          connectedUsers: 2,
          connectedUsersPercent: 20,
          responseTimeMs: null,
          status: null,
        },
        {
          id: 33,
          code: 'meest',
          displayName: 'Meest',
          connectedUsers: 1,
          connectedUsersPercent: 10,
          responseTimeMs: null,
          status: null,
        },
      ],
    });

    expect(prisma.db.user.count).toHaveBeenNthCalledWith(1);
    expect(prisma.db.user.count).toHaveBeenNthCalledWith(2, {
      where: {
        subscriptionBalances: {
          some: {
            status: SubscriptionBalanceStatus.ACTIVE,
            plan: { level: { gt: 0 } },
          },
        },
      },
    });
    expect(prisma.db.userPostalConnection.count).toHaveBeenCalledWith({
      where: { status: PostalConnectionStatus.ACTIVE },
    });
    expect(prisma.db.supportTicket.count).toHaveBeenCalledWith({
      where: { status: { in: [TicketStatus.WAITING, TicketStatus.IN_PROGRESS] } },
    });
  });

  it('returns zero percentages and null ids when operators are missing or there are no users', async () => {
    const prisma = {
      db: {
        user: {
          count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(0),
        },
        userPostalConnection: {
          count: jest.fn().mockResolvedValue(0),
        },
        supportTicket: {
          count: jest.fn().mockResolvedValue(0),
        },
        postalService: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      },
    } as any;

    const service = new AdminStatisticsService(prisma);
    const result = await service.getStatistics();

    expect(result.summary).toEqual({
      totalUsers: 0,
      activePaidSubscriptions: 0,
      totalConnectedPostalOperators: 0,
      openSupportTickets: 0,
    });
    expect(result.postalOperators).toEqual([
      {
        id: null,
        code: 'nova_poshta',
        displayName: 'Nova Poshta',
        connectedUsers: 0,
        connectedUsersPercent: 0,
        responseTimeMs: null,
        status: null,
      },
      {
        id: null,
        code: 'ukrposhta',
        displayName: 'Ukrposhta',
        connectedUsers: 0,
        connectedUsersPercent: 0,
        responseTimeMs: null,
        status: null,
      },
      {
        id: null,
        code: 'meest',
        displayName: 'Meest',
        connectedUsers: 0,
        connectedUsersPercent: 0,
        responseTimeMs: null,
        status: null,
      },
    ]);
  });
});
