import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { SaveTemplateDto } from '../../../validation/shipments/template.schema.js';

@Injectable()
export class ShipmentTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  getTemplates(userId: number) {
    return this.prisma.db.shipmentTemplate.findMany({
      where: { userId },
      include: { postalService: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  saveTemplate(userId: number, dto: SaveTemplateDto) {
    // postalServiceId cast: pre-migration client types it as required Int;
    // after `prisma migrate dev --name make-template-postal-service-nullable` the cast can be removed
    return this.prisma.db.shipmentTemplate.create({
      data: {
        userId,
        postalServiceId: dto.postalServiceId ?? null,
        name: dto.name,
        templateData: dto.templateData as Prisma.InputJsonValue,
      },
      include: { postalService: true },
    });
  }

  async deleteTemplate(userId: number, id: number) {
    const template = await this.prisma.db.shipmentTemplate.findUnique({
      where: { id },
    });
    if (!template || template.userId !== userId) {
      throw new NotFoundException('Template not found');
    }
    await this.prisma.db.shipmentTemplate.delete({ where: { id } });
  }
}
