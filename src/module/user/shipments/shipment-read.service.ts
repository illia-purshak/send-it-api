import { Injectable, NotFoundException } from '@nestjs/common';
import { ShipmentStatus } from '../../../../generated/prisma/enums.js';
import type { ListShipmentsQueryDto } from '../../../validation/shipments/list-shipments.schema.js';
import { ShipmentDraftsService } from './shipment-drafts.service.js';
import { NovaPostShipmentsService } from './nova-post-shipments.service.js';
import type { ShipmentDetail, ShipmentListItem } from './shipments.types.js';
import { getShipmentActionFlags } from './shipment-status.mapper.js';

@Injectable()
export class ShipmentReadService {
  constructor(
    private readonly draftsService: ShipmentDraftsService,
    private readonly novaPostService: NovaPostShipmentsService,
  ) {}

  async getUnifiedShipments(userId: number, query: ListShipmentsQueryDto) {
    const [drafts, novaPostShipments] = await Promise.all([
      this.draftsService.getDrafts(userId),
      this.novaPostService.getShipments(userId, { suppressMissingConnection: true }),
    ]);

    const draftRows = drafts.map((draft) => {
      const flags = getShipmentActionFlags(ShipmentStatus.DRAFT);
      const draftData =
        draft.draftData && typeof draft.draftData === 'object' && !Array.isArray(draft.draftData)
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
        recipientName: this.getStringValue(draftData, ['recipientName', 'recipient', 'recipientFullName']),
        createdAt: draft.updatedAt,
        declaredValue: this.getNumberValue(draftData, ['declaredValue', 'insuranceCost', 'value']),
        ...flags,
      } satisfies ShipmentListItem;
    });

    const filtered = [...novaPostShipments, ...draftRows].filter((item) =>
      this.matchesFilters(item, query),
    );

    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      shipments: filtered,
      total: filtered.length,
    };
  }

  getNovaPostShipments(userId: number) {
    return this.novaPostService.getShipments(userId, { suppressMissingConnection: false }).then(
      (shipments) => ({
        shipments,
        total: shipments.length,
      }),
    );
  }

  async getShipmentDetail(userId: number, operator: string, ref: string): Promise<ShipmentDetail> {
    if (operator !== 'nova-post') {
      throw new NotFoundException('Shipment not found');
    }

    return this.novaPostService.getShipmentDetail(userId, ref);
  }

  private matchesFilters(item: ShipmentListItem, query: ListShipmentsQueryDto) {
    if (query.operator && item.operator !== query.operator) return false;
    if (query.status && item.normalizedStatus !== query.status) return false;
    if (query.ttn) {
      const ref = item.ttn ?? item.ref ?? '';
      if (!ref.toLowerCase().includes(query.ttn.toLowerCase())) return false;
    }
    if (query.createdFrom && item.createdAt < query.createdFrom) return false;
    if (query.createdTo && item.createdAt > query.createdTo) return false;
    if (query.valueFrom !== undefined) {
      if (item.declaredValue === null || item.declaredValue < query.valueFrom) return false;
    }
    if (query.valueTo !== undefined) {
      if (item.declaredValue === null || item.declaredValue > query.valueTo) return false;
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
