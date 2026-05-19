import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../../../../generated/prisma/enums.js';
import { buildPaginatedResponse } from '../../../utils/pagination.util.js';
import type {
  CreateTicketDto,
  ListTicketsQueryDto,
  PostMessageDto,
} from '../../../validation/support/support.schema.js';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getTickets(userId: number, query: ListTicketsQueryDto) {
    const skip = (query.page - 1) * query.limit;
    const where = {
      userId,
      ...(query.status !== 'all' ? { status: query.status as any } : {}),
    };

    const epoch = new Date(0);

    const [data, total, openCount] = await Promise.all([
      this.prisma.db.supportTicket.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          readStatus: { where: { userId }, take: 1 },
        },
      }),
      this.prisma.db.supportTicket.count({ where }),
      this.prisma.db.supportTicket.count({
        where: { userId, status: { in: ['WAITING' as any, 'IN_PROGRESS' as any] } },
      }),
    ]);

    const mapped = data.map((ticket) => {
      const lastReadAt = ticket.readStatus[0]?.lastReadAt ?? epoch;
      const lastMsg = ticket.messages[0] ?? null;
      return {
        id: ticket.id,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        assignedTo: ticket.assignedTo,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        lastMessage: lastMsg
          ? {
              body: lastMsg.body,
              createdAt: lastMsg.createdAt,
              isFromAdmin: lastMsg.adminId !== null,
            }
          : null,
        hasUnread: ticket.updatedAt > lastReadAt,
      };
    });

    return { ...buildPaginatedResponse(mapped, total, query.page, query.limit), openCount };
  }

  async getTicketById(userId: number, id: number) {
    const ticket = await this.prisma.db.supportTicket.findUnique({
      where: { id, userId },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, email: true } },
            admin: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        readStatus: { where: { userId }, take: 1 },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const lastReadAt = ticket.readStatus[0]?.lastReadAt ?? new Date(0);
    const unreadCount = ticket.messages.filter(
      (m) => m.createdAt > lastReadAt && m.userId !== userId && !m.isSystem,
    ).length;

    const { readStatus, ...rest } = ticket;
    return { ...rest, unreadCount };
  }

  async createTicket(userId: number, dto: CreateTicketDto) {
    const openCount = await this.prisma.db.supportTicket.count({
      where: { userId, status: { in: ['WAITING' as any, 'IN_PROGRESS' as any] } },
    });
    if (openCount >= 3) throw new ForbiddenException('TICKET_LIMIT_REACHED');

    return this.prisma.db.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        category: dto.category as any,
        status: 'WAITING' as any,
        messages: {
          create: { userId, body: dto.body },
        },
      },
      include: {
        messages: true,
      },
    });
  }

  async postMessage(userId: number, ticketId: number, dto: PostMessageDto) {
    const ticket = await this.prisma.db.supportTicket.findUnique({
      where: { id: ticketId, userId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const isReopening = ticket.status === ('CLOSED' as any);
    const now = new Date();

    const ops: any[] = [
      this.prisma.db.supportMessage.create({
        data: { ticketId, userId, body: dto.body },
      }),
    ];

    if (isReopening) {
      ops.push(
        this.prisma.db.supportMessage.create({
          data: { ticketId, body: 'Ticket reopened by client', isSystem: true },
        }),
        this.prisma.db.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'WAITING' as any, closedAt: null, assignedToId: null, updatedAt: now },
        }),
      );
    } else {
      ops.push(
        this.prisma.db.supportTicket.update({
          where: { id: ticketId },
          data: { updatedAt: now },
        }),
      );
    }

    const results = await this.prisma.db.$transaction(ops);
    return results[0];
  }

  async markRead(userId: number, ticketId: number) {
    const ticket = await this.prisma.db.supportTicket.findUnique({
      where: { id: ticketId, userId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    await this.prisma.db.ticketReadStatus.upsert({
      where: { ticketId_userId: { ticketId, userId } },
      create: { ticketId, userId, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    });

    return { success: true };
  }
}
