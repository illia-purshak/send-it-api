import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { NotificationsService } from '../../user/notifications/notifications.service.js';
import { NotificationType } from '../../../../generated/prisma/enums.js';
import { buildPaginatedResponse } from '../../../utils/pagination.util.js';
import type {
  AdminListTicketsQueryDto,
  AdminListMyTicketsQueryDto,
  AdminTicketActionDto,
  AdminPostMessageDto,
} from '../../../validation/admin/admin-support.schema.js';

@Injectable()
export class AdminSupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async findTicketOrThrow(id: number) {
    const ticket = await this.prisma.db.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async getTickets(query: AdminListTicketsQueryDto) {
    const skip = (query.page - 1) * query.limit;
    const where: Record<string, unknown> = {};
    if (query.status !== 'all') where['status'] = query.status;
    if (query.category) where['category'] = query.category;
    if (query.search) {
      where['OR'] = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { user: { profile: { companyName: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.db.supportTicket.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }],
        include: {
          user: { select: { id: true, email: true, profile: { select: { companyName: true } } } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.db.supportTicket.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query.page, query.limit);
  }

  async getMyTickets(adminId: number, query: AdminListMyTicketsQueryDto) {
    const skip = (query.page - 1) * query.limit;
    const where: Record<string, unknown> = { assignedToId: adminId };
    if (query.status !== 'all') where['status'] = query.status;

    const [data, total] = await Promise.all([
      this.prisma.db.supportTicket.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }],
        include: {
          user: { select: { id: true, email: true, profile: { select: { companyName: true } } } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.db.supportTicket.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query.page, query.limit);
  }

  async getTicketById(adminId: number, id: number) {
    const ticket = await this.prisma.db.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, profile: { select: { companyName: true } } } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, email: true } },
            admin: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        readStatus: { where: { adminId }, take: 1 },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const lastReadAt = ticket.readStatus[0]?.lastReadAt ?? new Date(0);
    const unreadCount = ticket.messages.filter(
      (m) => m.createdAt > lastReadAt && m.adminId !== adminId && !m.isSystem,
    ).length;

    const { readStatus, ...rest } = ticket;
    return { ...rest, unreadCount };
  }

  async performAction(adminId: number, id: number, dto: AdminTicketActionDto) {
    const ticket = await this.findTicketOrThrow(id);

    if (dto.action === 'assign') {
      if (ticket.status !== ('WAITING' as any)) {
        throw new ForbiddenException('Can only assign WAITING tickets');
      }
      return this.prisma.db.supportTicket.update({
        where: { id },
        data: { assignedToId: adminId, status: 'IN_PROGRESS' as any },
      });
    }

    if (dto.action === 'leave') {
      if (ticket.status === ('CLOSED' as any)) {
        throw new ForbiddenException('Cannot leave a CLOSED ticket');
      }
      const admin = await this.prisma.db.admin.findUnique({
        where: { id: adminId },
        select: { firstName: true, lastName: true },
      });
      const name = [admin?.firstName, admin?.lastName].filter(Boolean).join(' ') || 'Admin';
      const now = new Date();

      await this.prisma.db.$transaction([
        this.prisma.db.supportMessage.create({
          data: { ticketId: id, body: `Admin ${name} left the ticket`, isSystem: true },
        }),
        this.prisma.db.supportTicket.update({
          where: { id },
          data: { assignedToId: null, status: 'WAITING' as any, updatedAt: now },
        }),
      ]);

      void this.notificationsService.create(
        ticket.userId,
        NotificationType.SYSTEM,
        'Support ticket update',
        'Support agent left your ticket. A new agent will be assigned shortly.',
      );

      return { success: true };
    }

    if (dto.action === 'close') {
      if (ticket.status === ('CLOSED' as any)) {
        throw new ForbiddenException('Ticket is already closed');
      }
      const now = new Date();
      const updated = await this.prisma.db.supportTicket.update({
        where: { id },
        data: { status: 'CLOSED' as any, closedAt: now },
      });

      void this.notificationsService.create(
        ticket.userId,
        NotificationType.SYSTEM,
        'Support ticket closed',
        `Your ticket "${ticket.subject}" has been closed.`,
      );

      return updated;
    }
  }

  async postMessage(adminId: number, ticketId: number, dto: AdminPostMessageDto) {
    const ticket = await this.findTicketOrThrow(ticketId);

    if (ticket.status === ('CLOSED' as any)) {
      throw new ForbiddenException('TICKET_CLOSED');
    }
    if (ticket.assignedToId !== adminId) {
      throw new ForbiddenException('NOT_ASSIGNED');
    }

    const wasWaiting = ticket.status === ('WAITING' as any);
    const now = new Date();

    const ops: any[] = [
      this.prisma.db.supportMessage.create({
        data: { ticketId, adminId, body: dto.body },
        include: { admin: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.db.supportTicket.update({
        where: { id: ticketId },
        data: { updatedAt: now, ...(wasWaiting ? { status: 'IN_PROGRESS' as any } : {}) },
      }),
    ];

    const results = await this.prisma.db.$transaction(ops);

    void this.notificationsService.create(
      ticket.userId,
      NotificationType.SYSTEM,
      'New message in your support ticket',
      `You have a new reply on ticket: "${ticket.subject}"`,
    );

    return results[0];
  }

  async markRead(adminId: number, ticketId: number) {
    await this.findTicketOrThrow(ticketId);

    await this.prisma.db.ticketReadStatus.upsert({
      where: { ticketId_adminId: { ticketId, adminId } },
      create: { ticketId, adminId, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    });

    return { success: true };
  }
}
