import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { buildPaginatedResponse } from '../../../utils/pagination.util.js';
import type {
  CreateRecipientDto,
  ListRecipientsQueryDto,
  UpdateRecipientDto,
} from '../../../validation/recipients/recipient.schema.js';

@Injectable()
export class RecipientsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecipients(userId: number, query: ListRecipientsQueryDto) {
    const skip = (query.page - 1) * query.limit;
    const where: Prisma.RecipientWhereInput = { userId };

    if (query.type) where.type = query.type;
    if (query.search) {
      where.OR = [
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.db.recipient.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.db.recipient.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query.page, query.limit);
  }

  async getRecipientById(userId: number, id: number) {
    const recipient = await this.prisma.db.recipient.findUnique({ where: { id } });
    if (!recipient) throw new NotFoundException('Recipient not found');
    if (recipient.userId !== userId) throw new ForbiddenException('Access denied');
    return recipient;
  }

  createRecipient(userId: number, dto: CreateRecipientDto) {
    return this.prisma.db.recipient.create({
      data: {
        userId,
        type: dto.type ?? 'INDIVIDUAL',
        companyName: dto.companyName,
        ownershipForm: dto.ownershipForm,
        edrpou: dto.edrpou,
        firstName: dto.firstName,
        lastName: dto.lastName,
        patronymic: dto.patronymic,
        phone: dto.phone,
        email: dto.email,
        note: dto.note,
        address: dto.address ? (dto.address as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  async updateRecipient(userId: number, id: number, dto: UpdateRecipientDto) {
    await this.getRecipientById(userId, id);

    const data: Prisma.RecipientUncheckedUpdateInput = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.companyName !== undefined) data.companyName = dto.companyName;
    if (dto.ownershipForm !== undefined) data.ownershipForm = dto.ownershipForm;
    if (dto.edrpou !== undefined) data.edrpou = dto.edrpou;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.patronymic !== undefined) data.patronymic = dto.patronymic;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.address !== undefined) data.address = dto.address;

    return this.prisma.db.recipient.update({ where: { id }, data });
  }

  async deleteRecipient(userId: number, id: number): Promise<void> {
    await this.getRecipientById(userId, id);
    await this.prisma.db.recipient.delete({ where: { id } });
  }
}
