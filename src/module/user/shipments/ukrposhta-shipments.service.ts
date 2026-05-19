import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PostalConnectionStatus, ShipmentStatus } from '../../../../generated/prisma/enums.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { CreateUkrposhtaShipmentDto } from '../../../validation/shipments/ukrposhta-shipment.schema.js';
import { getShipmentActionFlags, mapUkrposhtaStatus } from './shipment-status.mapper.js';
import type { ShipmentDetail, ShipmentListItem } from './shipments.types.js';

interface GetShipmentsOptions {
  suppressMissingConnection: boolean;
}

@Injectable()
export class UkrposhtaShipmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createShipment(userId: number, dto: CreateUkrposhtaShipmentDto) {
    const postalService = await this.getOrCreatePostalService();

    await this.requireActiveConnection(userId, postalService.id);

    const ttn = `UP${Date.now()}${Math.floor(Math.random() * 1000)}`;

    await this.prisma.db.ukrposhtaShipment.create({
      data: {
        userId,
        ttn,
        senderName: dto.sender.name,
        senderPhone: dto.sender.phone,
        recipientName: dto.recipient.name,
        recipientPhone: dto.recipient.phone,
        recipientAddress: dto.recipient.address,
        recipientCity: dto.recipient.city,
        weight: dto.weight,
        declaredValue: dto.declaredValue,
        description: dto.description,
        rawStatus: 'Created',
        normalizedStatus: ShipmentStatus.CREATED,
      },
    });

    if (dto.draftId) {
      await this.prisma.db.shipmentDraft
        .delete({ where: { id: dto.draftId, userId } })
        .catch(() => {});
    }

    return {
      ttn,
      normalizedStatus: ShipmentStatus.CREATED,
      declaredValue: dto.declaredValue,
      weight: dto.weight,
      createdAt: new Date().toISOString(),
    };
  }

  async getShipments(
    userId: number,
    options: GetShipmentsOptions,
  ): Promise<ShipmentListItem[]> {
    const postalService = await this.getOrCreatePostalService();

    const connection = await this.getActiveConnection(userId, postalService.id);
    if (!connection) {
      if (options.suppressMissingConnection) return [];
      throw new UnauthorizedException(
        'Ukrposhta connection is not active. Please connect or reconnect in your profile.',
      );
    }

    const rows = await this.prisma.db.ukrposhtaShipment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      kind: 'shipment' as const,
      operator: 'ukrposhta',
      draftId: null,
      ref: row.ttn,
      ttn: row.ttn,
      postalServiceId: postalService.id,
      operatorName: postalService.name,
      operatorLogoUrl: postalService.logoUrl ?? null,
      normalizedStatus: row.normalizedStatus,
      rawStatus: row.rawStatus,
      recipientName: row.recipientName,
      createdAt: row.createdAt,
      declaredValue: Number(row.declaredValue),
      ...getShipmentActionFlags(row.normalizedStatus),
    }));
  }

  async getShipmentDetail(userId: number, ref: string): Promise<ShipmentDetail> {
    const postalService = await this.getOrCreatePostalService();

    const row = await this.prisma.db.ukrposhtaShipment.findFirst({
      where: { ttn: ref, userId },
    });

    if (!row) throw new NotFoundException('Shipment not found');

    return {
      kind: 'shipment',
      operator: 'ukrposhta',
      ref: row.ttn,
      ttn: row.ttn,
      postalServiceId: postalService.id,
      postalServiceName: postalService.name,
      postalServiceLogoUrl: postalService.logoUrl ?? null,
      normalizedStatus: row.normalizedStatus,
      rawStatus: row.rawStatus,
      recipientName: row.recipientName,
      recipientPhone: row.recipientPhone,
      recipientEmail: null,
      deliveryAddress: `${row.recipientCity}, ${row.recipientAddress}`,
      declaredValue: Number(row.declaredValue),
      weight: row.weight,
      scheduledDeliveryDate: null,
      createdAt: row.createdAt,
      lastSyncedAt: row.updatedAt,
      trackingHistory: [],
      metadata: null,
      ...getShipmentActionFlags(row.normalizedStatus),
    };
  }

  async deleteShipment(userId: number, ref: string): Promise<{ deletedAt: string }> {
    const postalService = await this.getOrCreatePostalService();

    await this.requireActiveConnection(userId, postalService.id);

    const row = await this.prisma.db.ukrposhtaShipment.findFirst({
      where: { ttn: ref, userId },
    });
    if (!row) throw new NotFoundException('Shipment not found');

    await this.prisma.db.ukrposhtaShipment.delete({ where: { id: row.id } });

    return { deletedAt: new Date().toISOString() };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async getOrCreatePostalService() {
    return this.prisma.db.postalService.upsert({
      where: { slug: 'ukrposhta' },
      create: { name: 'Ukrposhta', slug: 'ukrposhta', isActive: true },
      update: {},
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
        'Ukrposhta connection is not active. Please connect or reconnect in your profile.',
      );
    }
  }
}
