import { Injectable, NotFoundException } from '@nestjs/common';
import { ShipmentStatus } from '../../../../generated/prisma/enums.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { buildPaginatedResponse } from '../../../utils/pagination.util.js';
import type { ListShipmentsQueryDto } from '../../../validation/shipments/list-shipments.schema.js';
import { ShipmentDraftsService } from './shipment-drafts.service.js';
import { NovaPostShipmentsService } from './nova-post-shipments.service.js';
import { UkrposhtaShipmentsService } from './ukrposhta-shipments.service.js';
import { MeestShipmentsService } from './meest-shipments.service.js';
import type { ShipmentDetail, ShipmentListItem } from './shipments.types.js';
import { getShipmentActionFlags } from './shipment-status.mapper.js';

@Injectable()
export class ShipmentReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly draftsService: ShipmentDraftsService,
    private readonly novaPostService: NovaPostShipmentsService,
    private readonly ukrposhtaService: UkrposhtaShipmentsService,
    private readonly meestService: MeestShipmentsService,
  ) {}

  async getUnifiedShipments(userId: number, query: ListShipmentsQueryDto) {
    const [drafts, novaPostShipments, ukrposhtaShipments, meestShipments] = await Promise.all([
      this.draftsService.getDrafts(userId),
      this.novaPostService.getShipments(userId, {
        suppressMissingConnection: true,
      }),
      this.ukrposhtaService.getShipments(userId, {
        suppressMissingConnection: true,
      }),
      this.meestService.getShipments(userId, {
        suppressMissingConnection: true,
      }),
    ]);

    const draftRows = drafts.map((draft) => {
      const flags = getShipmentActionFlags(ShipmentStatus.DRAFT);
      const draftData =
        draft.draftData &&
        typeof draft.draftData === 'object' &&
        !Array.isArray(draft.draftData)
          ? (draft.draftData as Record<string, unknown>)
          : {};

      return {
        kind: 'draft',
        operator: 'draft',
        draftId: draft.id,
        ref: null,
        ttn: null,
        postalServiceId: draft.postalServiceId,
        operatorName: 'Draft',
        operatorLogoUrl: null,
        normalizedStatus: ShipmentStatus.DRAFT,
        rawStatus: null,
        recipientName: this.getStringValue(draftData, [
          'recipientName',
          'recipient',
          'recipientFullName',
        ]),
        createdAt: draft.updatedAt,
        declaredValue: this.getNumberValue(draftData, [
          'declaredValue',
          'insuranceCost',
          'value',
        ]),
        ...flags,
      } satisfies ShipmentListItem;
    });

    const filtered = [...novaPostShipments, ...ukrposhtaShipments, ...meestShipments, ...draftRows].filter((item) =>
      this.matchesFilters(item, query),
    );

    filtered.sort((a, b) => {
      if (query.sortBy === 'recipient') {
        const ar = a.recipientName ?? '';
        const br = b.recipientName ?? '';
        return query.sortDir === 'asc'
          ? ar.localeCompare(br)
          : br.localeCompare(ar);
      }
      let av: number;
      let bv: number;
      if (query.sortBy === 'declaredValue') {
        av = a.declaredValue ?? -Infinity;
        bv = b.declaredValue ?? -Infinity;
      } else {
        av = a.createdAt.getTime();
        bv = b.createdAt.getTime();
      }
      return query.sortDir === 'asc' ? av - bv : bv - av;
    });

    const total = filtered.length;
    const { page, limit } = query;
    const shipments = filtered.slice((page - 1) * limit, page * limit);

    return buildPaginatedResponse(shipments, total, page, limit);
  }

  async getOperatorsForUser(userId: number) {
    const connections = await this.prisma.db.userPostalConnection.findMany({
      where: { userId },
      select: {
        status: true,
        postalService: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
      orderBy: { connectedAt: 'asc' },
    });
    const operators = connections.map((c) => ({
      ...c.postalService,
      status: c.status,
    }));
    return { operators };
  }

  async getShipmentDetail(
    userId: number,
    operator: string,
    ref: string,
  ): Promise<ShipmentDetail> {
    if (operator === 'nova-post') {
      return this.novaPostService.getShipmentDetail(userId, ref);
    }
    if (operator === 'ukrposhta') {
      return this.ukrposhtaService.getShipmentDetail(userId, ref);
    }
    if (operator === 'meest') {
      return this.meestService.getShipmentDetail(userId, ref);
    }
    throw new NotFoundException('Shipment not found');
  }

  private matchesFilters(item: ShipmentListItem, query: ListShipmentsQueryDto) {
    if (query.operator && item.operator !== query.operator) return false;
    if (query.status && item.normalizedStatus !== query.status) return false;
    if (query.ttn) {
      const ref = item.ttn ?? item.ref ?? '';
      if (!ref.toLowerCase().includes(query.ttn.toLowerCase())) return false;
    }
    if (query.recipient) {
      const name = item.recipientName ?? '';
      if (!name.toLowerCase().includes(query.recipient.toLowerCase()))
        return false;
    }
    if (query.createdFrom && item.createdAt < query.createdFrom) return false;
    if (query.createdTo && item.createdAt > query.createdTo) return false;
    if (query.valueFrom !== undefined) {
      if (item.declaredValue === null || item.declaredValue < query.valueFrom)
        return false;
    }
    if (query.valueTo !== undefined) {
      if (item.declaredValue === null || item.declaredValue > query.valueTo)
        return false;
    }

    return true;
  }

  private getStringValue(source: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    return null;
  }

  private getNumberValue(source: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return null;
  }
}
