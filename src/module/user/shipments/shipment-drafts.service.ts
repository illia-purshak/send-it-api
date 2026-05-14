import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type {
  SaveDraftDto,
  UpdateDraftDto,
} from '../../../validation/shipments/draft.schema.js';

@Injectable()
export class ShipmentDraftsService {
  constructor(private readonly prisma: PrismaService) {}

  getDrafts(userId: number) {
    return this.prisma.db.shipmentDraft.findMany({
      where: { userId },
      include: { postalService: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getDraftById(userId: number, id: number) {
    const draft = await this.prisma.db.shipmentDraft.findUnique({
      where: { id },
      include: { postalService: true },
    });
    if (!draft || draft.userId !== userId) {
      throw new NotFoundException('Draft not found');
    }
    return draft;
  }

  saveDraft(userId: number, dto: SaveDraftDto) {
    return this.prisma.db.shipmentDraft.create({
      data: {
        userId,
        postalServiceId: dto.postalServiceId,
        draftData: dto.draftData as Prisma.InputJsonValue,
      },
      include: { postalService: true },
    });
  }

  async updateDraft(userId: number, id: number, dto: UpdateDraftDto) {
    await this.getDraftById(userId, id);
    return this.prisma.db.shipmentDraft.update({
      where: { id },
      data: {
        postalServiceId: dto.postalServiceId,
        draftData: dto.draftData as Prisma.InputJsonValue,
      },
      include: { postalService: true },
    });
  }

  async deleteDraft(userId: number, id: number) {
    await this.getDraftById(userId, id);
    await this.prisma.db.shipmentDraft.delete({ where: { id } });
  }

  async getDraftDuplicateData(userId: number, id: number) {
    const draft = await this.getDraftById(userId, id);
    return {
      postalServiceId: draft.postalServiceId,
      formData:
        draft.draftData && typeof draft.draftData === 'object' && !Array.isArray(draft.draftData)
          ? (draft.draftData as Record<string, unknown>)
          : {},
    };
  }
}
