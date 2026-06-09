import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { buildPaginatedResponse } from '../../../utils/pagination.util.js';
import { MeestTemplateDataSchema } from '../../../validation/shipments/meest-shipment.schema.js';
import { NovaPostTemplateDataSchema } from '../../../validation/shipments/nova-post-shipment.schema.js';
import { UkrposhtaTemplateDataSchema } from '../../../validation/shipments/ukrposhta-shipment.schema.js';
import type {
  CreateTemplateDto,
  ListTemplatesQueryDto,
  UpdateTemplateDto,
} from '../../../validation/templates/template.schema.js';

const TEMPLATE_DATA_SCHEMAS: Record<string, ZodTypeAny> = {
  'nova-post': NovaPostTemplateDataSchema,
  ukrposhta: UkrposhtaTemplateDataSchema,
  meest: MeestTemplateDataSchema,
};

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplates(userId: number, query: ListTemplatesQueryDto) {
    const skip = (query.page - 1) * query.limit;
    const where: Prisma.ShipmentTemplateWhereInput = { userId };

    if (query.operator) {
      where.postalService = { slug: query.operator };
    }
    if (query.shipmentType) {
      where.shipmentType = query.shipmentType;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.db.shipmentTemplate.findMany({
        where,
        include: { postalService: true },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take: query.limit,
      }),
      this.prisma.db.shipmentTemplate.count({ where }),
    ]);

    return buildPaginatedResponse(items, total, query.page, query.limit);
  }

  async getTemplateById(userId: number, id: number) {
    const template = await this.prisma.db.shipmentTemplate.findUnique({
      where: { id },
      include: { postalService: true },
    });
    if (!template) throw new NotFoundException('Template not found');
    if (template.userId !== userId) throw new ForbiddenException('Access denied');
    return template;
  }

  private async resolveAndValidateTemplateData(
    postalServiceId: number | undefined | null,
    templateData: Record<string, unknown>,
  ): Promise<string | null> {
    if (!postalServiceId) return null;
    const service = await this.prisma.db.postalService.findUnique({
      where: { id: postalServiceId },
      select: { slug: true },
    });
    if (!service) throw new NotFoundException('Postal service not found');
    const schema = TEMPLATE_DATA_SCHEMAS[service.slug];
    if (schema) {
      const result = schema.safeParse(templateData);
      if (!result.success) throw new BadRequestException(result.error.issues);
    }
    return service.slug;
  }

  async createTemplate(userId: number, dto: CreateTemplateDto) {
    await this.resolveAndValidateTemplateData(dto.postalServiceId, dto.templateData);
    return this.prisma.db.shipmentTemplate.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description ?? null,
        postalServiceId: dto.postalServiceId ?? null,
        shipmentType: dto.shipmentType ?? 'UNKNOWN',
        templateData: dto.templateData as Prisma.InputJsonValue,
      },
      include: { postalService: true },
    });
  }

  async updateTemplate(userId: number, id: number, dto: UpdateTemplateDto) {
    const existing = await this.getTemplateById(userId, id);

    const data: Prisma.ShipmentTemplateUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.postalServiceId !== undefined) data.postalServiceId = dto.postalServiceId;
    if (dto.shipmentType !== undefined) data.shipmentType = dto.shipmentType;
    if (dto.templateData !== undefined) {
      const effectiveServiceId = dto.postalServiceId ?? (existing.postalService as { id: number } | null)?.id;
      await this.resolveAndValidateTemplateData(effectiveServiceId, dto.templateData);
      data.templateData = dto.templateData as Prisma.InputJsonValue;
    }

    return this.prisma.db.shipmentTemplate.update({
      where: { id },
      data,
      include: { postalService: true },
    });
  }

  async deleteTemplate(userId: number, id: number): Promise<void> {
    await this.getTemplateById(userId, id);
    await this.prisma.db.shipmentTemplate.delete({ where: { id } });
  }

  async incrementUsage(userId: number, id: number) {
    await this.getTemplateById(userId, id);
    return this.prisma.db.shipmentTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
      select: { id: true, usageCount: true },
    });
  }

}
