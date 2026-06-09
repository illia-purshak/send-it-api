import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { buildUnpaginatedResponse } from '../../../utils/pagination.util.js';
import type {
  CreatePostalServiceDto,
  UpdatePostalServiceDto,
} from '../../../validation/admin/admin-services.schema.js';

@Injectable()
export class AdminServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    const items = await this.prisma.db.postalService.findMany({ orderBy: { name: 'asc' } });
    return buildUnpaginatedResponse(items);
  }

  async getById(id: number) {
    const service = await this.prisma.db.postalService.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Postal service not found');
    return service;
  }

  async create(dto: CreatePostalServiceDto) {
    const existing = await this.prisma.db.postalService.findFirst({
      where: { OR: [{ name: dto.name }, { slug: dto.slug }] },
    });
    if (existing) throw new ConflictException('A service with this name or slug already exists');

    return this.prisma.db.postalService.create({
      data: { name: dto.name, slug: dto.slug, logoUrl: dto.logoUrl },
    });
  }

  async update(id: number, dto: UpdatePostalServiceDto) {
    await this.getById(id);
    return this.prisma.db.postalService.update({
      where: { id },
      data: { name: dto.name, logoUrl: dto.logoUrl, isActive: dto.isActive },
    });
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);
    const activeConnections = await this.prisma.db.userPostalConnection.count({
      where: { postalServiceId: id, status: 'ACTIVE' },
    });
    if (activeConnections > 0) {
      throw new BadRequestException('SERVICE_HAS_ACTIVE_CONNECTIONS');
    }
    await this.prisma.db.postalService.delete({ where: { id } });
  }
}
