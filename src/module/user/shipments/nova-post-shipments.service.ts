import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PostalConnectionStatus } from '../../../../generated/prisma/enums.js';
import { ShipmentStatus } from '../../../../generated/prisma/enums.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { CreateNovaPostShipmentDto } from '../../../validation/shipments/nova-post-shipment.schema.js';
import { NovaPostApiClient } from '../postal-connections/nova-post/nova-post-api.client.js';
import {
  getShipmentActionFlags,
  mapNovaPostStatus,
} from './shipment-status.mapper.js';
import type {
  ShipmentDetail,
  ShipmentListItem,
  TrackingHistoryItem,
} from './shipments.types.js';

// ─── Nova Post API response shapes ───────────────────────────────────────────

interface NovaPostAddressParts {
  city?: string;
  region?: string;
  street?: string;
  building?: string;
  flat?: string;
  postCode?: string;
  countryCode?: string;
  note?: string;
}

interface NovaPostParty {
  name: string;
  phone: string;
  email: string;
  countryCode: string;
  address: string;
  addressParts: NovaPostAddressParts;
}

interface NovaPostTrackingEntry {
  code: string;
  code_name: string;
  country_code: string;
  settlement: string;
  date: string;
}

interface NovaPostShipmentItem {
  id: string;
  number: string;
  status: string;
  scheduledDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  parcelsAmount: number;
  totalWeight: number;
  totalInsuranceCost: number;
  totalCost: number;
  sender: NovaPostParty;
  recipient: NovaPostParty;
  tracking: NovaPostTrackingEntry[];
}

interface NovaPostPaginatedResponse {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  items: NovaPostShipmentItem[];
}

// POST /shipments 201 response
interface NovaPostCreateResponse {
  id: string;
  number: string;
  status: string;
  scheduledDeliveryDate: string | null;
  cost: number;
  parcelsAmount: number;
  createdAt: string;
}

// DELETE /shipments/{id} 200 response
interface NovaPostDeleteResponse {
  deletedAt: string;
}

// ─── Options ─────────────────────────────────────────────────────────────────

interface GetShipmentsOptions {
  suppressMissingConnection: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────────────

const MAX_PAGES = 10;
const PAGE_SIZE = 100;

@Injectable()
export class NovaPostShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiClient: NovaPostApiClient,
  ) {}

  async createShipment(userId: number, dto: CreateNovaPostShipmentDto) {
    const postalService = await this.getNovaPostPostalService();
    if (!postalService) {
      throw new NotFoundException('Nova Post service is not available.');
    }

    await this.requireActiveConnection(userId, postalService.id);

    const { draftId, ...shipmentPayload } = dto;

    const body = await this.apiClient.request<NovaPostCreateResponse>(
      userId,
      postalService.id,
      'POST',
      '/shipments',
      undefined,
      shipmentPayload,
    );

    const normalizedStatus = mapNovaPostStatus(body.status);

    if (draftId) {
      await this.prisma.db.shipmentDraft
        .delete({ where: { id: draftId, userId } })
        .catch(() => {});
    }

    return {
      ttn: body.number,
      id: body.id,
      status: body.status,
      normalizedStatus,
      scheduledDeliveryDate: body.scheduledDeliveryDate,
      cost: body.cost,
      parcelsAmount: body.parcelsAmount,
      createdAt: body.createdAt,
    };
  }

  async getShipments(
    userId: number,
    options: GetShipmentsOptions,
  ): Promise<ShipmentListItem[]> {
    const postalService = await this.getNovaPostPostalService();
    if (!postalService) return [];

    const connection = await this.getActiveConnection(userId, postalService.id);
    if (!connection) {
      if (options.suppressMissingConnection) return [];
      throw new UnauthorizedException(
        'Nova Post connection is not active. Please connect or reconnect in your profile.',
      );
    }

    const rawShipments = await this.fetchAllShipments(userId, postalService.id);

    return rawShipments.map((item) =>
      this.normalizeShipment(
        item,
        postalService.id,
        postalService.name,
        postalService.logoUrl,
      ),
    );
  }

  async getShipmentDetail(userId: number, ref: string): Promise<ShipmentDetail> {
    const postalService = await this.getNovaPostPostalService();
    if (!postalService) throw new NotFoundException('Shipment not found');

    const item = await this.fetchShipmentByNumber(userId, postalService.id, ref);
    const normalized = this.normalizeShipment(
      item,
      postalService.id,
      postalService.name,
      postalService.logoUrl,
    );

    const trackingHistory = this.mapTrackingHistory(item.tracking ?? []);

    return {
      kind: 'shipment',
      operator: 'nova-post',
      ref: item.number,
      ttn: item.number,
      postalServiceId: postalService.id,
      postalServiceName: postalService.name,
      postalServiceLogoUrl: postalService.logoUrl ?? null,
      normalizedStatus: normalized.normalizedStatus,
      rawStatus: item.status,
      recipientName: item.recipient.name || null,
      recipientPhone: item.recipient.phone || null,
      recipientEmail: item.recipient.email || null,
      deliveryAddress: this.composeAddress(item.recipient.addressParts),
      declaredValue: item.totalInsuranceCost,
      weight: item.totalWeight,
      scheduledDeliveryDate: this.parseDate(item.scheduledDeliveryDate),
      createdAt: this.parseDate(item.createdAt),
      lastSyncedAt: new Date(),
      trackingHistory,
      metadata: item,
      ...getShipmentActionFlags(normalized.normalizedStatus),
    };
  }

  async deleteShipment(userId: number, ref: string): Promise<{ deletedAt: string }> {
    const postalService = await this.getNovaPostPostalService();
    if (!postalService) throw new NotFoundException('Nova Post service is not available.');

    await this.requireActiveConnection(userId, postalService.id);

    const result = await this.apiClient.request<NovaPostDeleteResponse>(
      userId,
      postalService.id,
      'DELETE',
      `/shipments/${encodeURIComponent(ref)}`,
    );

    return { deletedAt: result.deletedAt };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async fetchAllShipments(
    userId: number,
    postalServiceId: number,
  ): Promise<NovaPostShipmentItem[]> {
    const firstPage = await this.apiClient.request<NovaPostPaginatedResponse>(
      userId,
      postalServiceId,
      'GET',
      '/shipments',
      { limit: PAGE_SIZE, page: 1 },
    );

    const items = [...firstPage.items];
    const pagesToFetch = Math.min(firstPage.last_page, MAX_PAGES);

    if (pagesToFetch > 1) {
      const pageNumbers = Array.from(
        { length: pagesToFetch - 1 },
        (_, i) => i + 2,
      );
      const pages = await Promise.all(
        pageNumbers.map((page) =>
          this.apiClient.request<NovaPostPaginatedResponse>(
            userId,
            postalServiceId,
            'GET',
            '/shipments',
            { limit: PAGE_SIZE, page },
          ),
        ),
      );
      for (const page of pages) {
        items.push(...page.items);
      }
    }

    return items;
  }

  private async fetchShipmentByNumber(
    userId: number,
    postalServiceId: number,
    number: string,
  ): Promise<NovaPostShipmentItem> {
    const response = await this.apiClient.request<NovaPostPaginatedResponse>(
      userId,
      postalServiceId,
      'GET',
      '/shipments',
      { 'numbers[]': [number], limit: 1 },
    );

    const item = response.items[0];
    if (!item) throw new NotFoundException('Shipment not found');
    return item;
  }

  private normalizeShipment(
    item: NovaPostShipmentItem,
    postalServiceId: number,
    postalServiceName: string,
    postalServiceLogoUrl: string | null,
  ): ShipmentListItem {
    const rawStatus = item.status ?? null;
    const normalizedStatus = rawStatus
      ? mapNovaPostStatus(rawStatus)
      : ShipmentStatus.UNKNOWN;

    return {
      kind: 'shipment',
      operator: 'nova-post',
      draftId: null,
      ref: item.number,
      ttn: item.number,
      postalServiceId,
      operatorName: postalServiceName,
      operatorLogoUrl: postalServiceLogoUrl ?? null,
      normalizedStatus,
      rawStatus,
      recipientName: item.recipient.name || null,
      createdAt: this.parseDate(item.createdAt) ?? new Date(),
      declaredValue: item.totalInsuranceCost ?? null,
      ...getShipmentActionFlags(normalizedStatus),
    };
  }

  private mapTrackingHistory(entries: NovaPostTrackingEntry[]): TrackingHistoryItem[] {
    return entries.map((e) => ({
      code: e.code,
      codeName: e.code_name,
      countryCode: e.country_code,
      settlement: e.settlement,
      date: new Date(e.date),
    }));
  }

  private async getNovaPostPostalService() {
    return this.prisma.db.postalService.findUnique({
      where: { slug: 'nova-post' },
      select: { id: true, name: true, logoUrl: true },
    });
  }

  private async getActiveConnection(userId: number, postalServiceId: number) {
    const connection = await this.prisma.db.userPostalConnection.findUnique({
      where: { userId_postalServiceId: { userId, postalServiceId } },
    });
    return connection?.status === PostalConnectionStatus.ACTIVE ? connection : null;
  }

  private async requireActiveConnection(userId: number, postalServiceId: number) {
    const connection = await this.getActiveConnection(userId, postalServiceId);
    if (!connection) {
      throw new UnauthorizedException(
        'Nova Post connection is not active. Please connect or reconnect in your profile.',
      );
    }
  }

  private composeAddress(parts: NovaPostAddressParts): string | null {
    const segments = [
      parts.countryCode,
      parts.region,
      parts.city,
      parts.street,
      parts.building,
      parts.flat,
      parts.postCode,
    ].filter((p): p is string => Boolean(p));
    return segments.length ? segments.join(', ') : null;
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
