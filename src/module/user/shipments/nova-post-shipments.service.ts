import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostalConnectionStatus, Prisma } from '../../../../generated/prisma/client.js';
import { ShipmentStatus } from '../../../../generated/prisma/enums.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { CreateNovaPostShipmentDto } from '../../../validation/shipments/nova-post-shipment.schema.js';
import { NovaPostAuthService } from '../postal-connections/nova-post/nova-post-auth.service.js';
import { PostalConnectionsService } from '../postal-connections/postal-connections.service.js';
import { getShipmentActionFlags, mapNovaPostStatus } from './shipment-status.mapper.js';
import type {
  DuplicateDataResponse,
  ShipmentDetail,
  ShipmentListItem,
} from './shipments.types.js';

interface NovaPostShipmentResponse {
  id: string;
  number: string;
  status: string;
  scheduledDeliveryDate: string | null;
  cost: number;
  parcelsAmount: number;
  createdAt: string;
}

interface GetShipmentsOptions {
  suppressMissingConnection: boolean;
}

@Injectable()
export class NovaPostShipmentsService {
  private readonly logger = new Logger(NovaPostShipmentsService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly novaPostAuth: NovaPostAuthService,
    private readonly postalConnections: PostalConnectionsService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('NOVA_POST_BASE_URL');
  }

  async createShipment(userId: number, dto: CreateNovaPostShipmentDto) {
    const postalService = await this.getNovaPostPostalService();

    if (postalService) {
      const connection = await this.prisma.db.userPostalConnection.findUnique({
        where: {
          userId_postalServiceId: {
            userId,
            postalServiceId: postalService.id,
          },
        },
      });
      if (!connection || connection.status !== PostalConnectionStatus.ACTIVE) {
        throw new UnauthorizedException(
          'Nova Post connection is not active. Please connect or reconnect in your profile.',
        );
      }
    }

    const jwt = await this.novaPostAuth.getJwt(userId);

    const { draftId, ...shipmentPayload } = dto;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/shipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: jwt,
        },
        body: JSON.stringify(shipmentPayload),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Could not reach Nova Post. Please try again.',
      );
    }

    if (response.status === 401) {
      await this.handleInvalidConnection(userId, postalService?.id);
      throw new BadRequestException({
        code: 'CONNECTION_INVALID',
        operator: 'nova-post',
        message:
          'Your Nova Post connection is no longer valid. Please reconnect.',
      });
    }

    if (response.status === 422) {
      const body = (await response.json()) as { errors?: unknown };
      throw new BadRequestException({
        code: 'OPERATOR_VALIDATION_ERROR',
        errors: body.errors ?? body,
      });
    }

    if (response.status === 503 || !response.ok) {
      this.logger.error(`Nova Post /shipments returned ${response.status}`);
      throw new ServiceUnavailableException(
        'An error occurred while creating the shipment. Please try again.',
      );
    }

    const body = (await response.json()) as NovaPostShipmentResponse;
    const normalizedStatus = mapNovaPostStatus(body.status);

    if (postalService) {
      await this.upsertShipmentMetadata(userId, postalService.id, {
        operatorRef: body.number,
        rawStatus: body.status,
        normalizedStatus,
        recipientName: dto.recipient.name,
        declaredValue: dto.parcels.reduce(
          (sum, parcel) => sum + parcel.insuranceCost,
          0,
        ),
        operatorCreatedAt: this.parseDate(body.createdAt),
        metadata: {
          remoteId: body.id,
          scheduledDeliveryDate: body.scheduledDeliveryDate,
          cost: body.cost,
          parcelsAmount: body.parcelsAmount,
        },
      });
    }

    if (draftId) {
      await this.prisma.db.shipmentDraft
        .delete({ where: { id: draftId, userId } })
        .catch(() => {
          // draft may already be deleted - ignore
        });
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
    if (!postalService) {
      return [];
    }

    const connection = await this.getActiveConnection(userId, postalService.id);
    if (!connection) {
      if (options.suppressMissingConnection) {
        return [];
      }
      throw new UnauthorizedException(
        'Nova Post connection is not active. Please connect or reconnect in your profile.',
      );
    }

    const rawShipments = await this.fetchShipmentsFromApi(userId);
    const cachedShipments = await this.prisma.db.shipment.findMany({
      where: { userId, postalServiceId: postalService.id },
    });
    const cachedByRef = new Map(
      cachedShipments.map((shipment) => [shipment.operatorRef, shipment]),
    );

    const normalizedShipments: ShipmentListItem[] = [];
    for (const shipment of rawShipments) {
      const ref = this.extractOperatorRef(shipment);
      if (!ref) continue;

      const normalized = this.normalizeRemoteShipment(
        shipment,
        postalService.id,
        postalService.name,
        postalService.logoUrl,
        cachedByRef.get(ref),
      );

      await this.upsertShipmentMetadata(userId, postalService.id, {
        operatorRef: normalized.ref!,
        rawStatus: normalized.rawStatus,
        normalizedStatus: normalized.normalizedStatus,
        recipientName: normalized.recipientName,
        declaredValue: normalized.declaredValue,
        operatorCreatedAt: normalized.createdAt,
        metadata: shipment,
      });

      normalizedShipments.push(normalized);
    }

    return normalizedShipments;
  }

  async getShipmentDetail(userId: number, ref: string): Promise<ShipmentDetail> {
    const postalService = await this.getNovaPostPostalService();
    if (!postalService) {
      throw new NotFoundException('Shipment not found');
    }

    const shipment = await this.findRemoteShipmentByRef(userId, ref);
    const cached = await this.prisma.db.shipment.findUnique({
      where: {
        userId_postalServiceId_operatorRef: {
          userId,
          postalServiceId: postalService.id,
          operatorRef: ref,
        },
      },
    });

    const normalized = this.normalizeRemoteShipment(
      shipment,
      postalService.id,
      postalService.name,
      postalService.logoUrl,
      cached,
    );

    await this.upsertShipmentMetadata(userId, postalService.id, {
      operatorRef: normalized.ref!,
      rawStatus: normalized.rawStatus,
      normalizedStatus: normalized.normalizedStatus,
      recipientName: normalized.recipientName,
      declaredValue: normalized.declaredValue,
      operatorCreatedAt: normalized.createdAt,
      metadata: shipment,
    });

    const shipmentRecord = this.asRecord(shipment);
    const recipient = this.getNestedRecord(shipmentRecord, 'recipient');
    const addressParts = this.getNestedRecord(recipient, 'addressParts');

    return {
      kind: 'shipment',
      operator: 'nova-post',
      ref: normalized.ref!,
      ttn: normalized.ttn!,
      postalServiceId: postalService.id,
      postalServiceName: postalService.name,
      postalServiceLogoUrl: postalService.logoUrl ?? null,
      normalizedStatus: normalized.normalizedStatus,
      rawStatus: normalized.rawStatus,
      recipientName: normalized.recipientName,
      recipientPhone:
        this.getStringField(recipient, ['phone']) ??
        this.getStringField(shipmentRecord, ['recipientPhone']),
      recipientEmail:
        this.getStringField(recipient, ['email']) ??
        this.getStringField(shipmentRecord, ['recipientEmail']),
      deliveryAddress:
        this.composeAddress(addressParts) ??
        this.getStringField(shipmentRecord, [
          'deliveryAddress',
          'branch',
          'address',
        ]),
      declaredValue: normalized.declaredValue,
      weight: this.extractWeight(shipmentRecord),
      createdAt: normalized.createdAt,
      lastSyncedAt: new Date(),
      metadata: shipment,
      ...getShipmentActionFlags(normalized.normalizedStatus),
    };
  }

  async getShipmentDuplicateData(
    userId: number,
    ttn: string,
  ): Promise<DuplicateDataResponse> {
    const postalService = await this.getNovaPostPostalService();
    if (!postalService) {
      throw new NotFoundException('Shipment not found');
    }

    const shipment = await this.findRemoteShipmentByRef(userId, ttn);

    return {
      postalServiceId: postalService.id,
      formData: this.extractFormDataForDuplicate(shipment),
    };
  }

  private async handleInvalidConnection(
    userId: number,
    postalServiceId: number | undefined,
  ) {
    this.novaPostAuth.invalidateJwt(userId);

    if (postalServiceId) {
      await this.postalConnections.markAsInvalid(userId, postalServiceId);
    }

    await this.prisma.db.notification.create({
      data: {
        userId,
        type: 'SYSTEM',
        title: 'Nova Post connection invalid',
        body: 'Your Nova Post API key is no longer valid. Please reconnect it in your profile to continue creating shipments.',
      },
    });
  }

  private async getNovaPostPostalService() {
    return this.prisma.db.postalService.findUnique({
      where: { slug: 'nova-post' },
      select: { id: true, name: true, logoUrl: true },
    });
  }

  private async getActiveConnection(userId: number, postalServiceId: number) {
    const connection = await this.prisma.db.userPostalConnection.findUnique({
      where: {
        userId_postalServiceId: {
          userId,
          postalServiceId,
        },
      },
    });

    return connection && connection.status === PostalConnectionStatus.ACTIVE
      ? connection
      : null;
  }

  private async fetchShipmentsFromApi(userId: number): Promise<unknown[]> {
    const postalService = await this.getNovaPostPostalService();
    const jwt = await this.novaPostAuth.getJwt(userId);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/shipments`, {
        method: 'GET',
        headers: {
          Authorization: jwt,
        },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Could not reach Nova Post. Please try again.',
      );
    }

    if (response.status === 401) {
      await this.handleInvalidConnection(userId, postalService?.id);
      throw new BadRequestException({
        code: 'CONNECTION_INVALID',
        operator: 'nova-post',
        message:
          'Your Nova Post connection is no longer valid. Please reconnect.',
      });
    }

    if (!response.ok) {
      this.logger.error(`Nova Post GET /shipments returned ${response.status}`);
      throw new ServiceUnavailableException(
        'Could not reach Nova Post. Please try again.',
      );
    }

    const body = (await response.json()) as unknown;

    if (Array.isArray(body)) {
      return body;
    }
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      if (Array.isArray(record['shipments'])) return record['shipments'];
      if (Array.isArray(record['items'])) return record['items'];
      if (Array.isArray(record['data'])) return record['data'];
    }

    return [];
  }

  private async findRemoteShipmentByRef(userId: number, ref: string) {
    const shipments = await this.fetchShipmentsFromApi(userId);
    const match = shipments.find(
      (shipment) => this.extractOperatorRef(shipment) === ref,
    );

    if (!match) {
      throw new NotFoundException('Shipment not found');
    }

    return match;
  }

  private normalizeRemoteShipment(
    shipment: unknown,
    postalServiceId: number,
    postalServiceName: string,
    postalServiceLogoUrl: string | null,
    cachedShipment?: {
      rawStatus: string | null;
      normalizedStatus: ShipmentStatus;
      recipientName: string | null;
      declaredValue: Prisma.Decimal | null;
      operatorCreatedAt: Date | null;
    } | null,
  ): ShipmentListItem {
    const record = this.asRecord(shipment);
    const rawStatus =
      this.getStringField(record, ['status']) ?? cachedShipment?.rawStatus ?? null;
    const normalizedStatus =
      rawStatus !== null
        ? mapNovaPostStatus(rawStatus)
        : cachedShipment?.normalizedStatus ?? ShipmentStatus.UNKNOWN;
    const flags = getShipmentActionFlags(normalizedStatus);
    const recipient = this.getNestedRecord(record, 'recipient');

    return {
      kind: 'shipment',
      operator: 'nova-post',
      draftId: null,
      ref: this.extractOperatorRef(record),
      ttn: this.extractOperatorRef(record),
      postalServiceId,
      operatorName: postalServiceName,
      operatorLogoUrl: postalServiceLogoUrl ?? null,
      normalizedStatus,
      rawStatus,
      recipientName:
        this.getStringField(recipient, ['name']) ??
        this.getStringField(record, ['recipientName']) ??
        cachedShipment?.recipientName ??
        null,
      createdAt:
        this.extractCreatedAt(record) ??
        cachedShipment?.operatorCreatedAt ??
        new Date(),
      declaredValue:
        this.extractDeclaredValue(record) ??
        (cachedShipment?.declaredValue
          ? Number(cachedShipment.declaredValue)
          : null),
      ...flags,
    };
  }

  private extractOperatorRef(shipment: unknown) {
    const record = this.asRecord(shipment);
    return (
      this.getStringField(record, ['number', 'ttn', 'trackingNumber', 'ref']) ??
      this.getIdAsString(record['id'])
    );
  }

  private extractCreatedAt(shipment: unknown) {
    const record = this.asRecord(shipment);
    return this.parseDate(
      this.getStringField(record, ['createdAt', 'dateCreated', 'created_at']),
    );
  }

  private extractDeclaredValue(shipment: unknown) {
    const record = this.asRecord(shipment);
    const directValue =
      this.getNumericField(record, ['declaredValue', 'cost', 'value']) ??
      this.getNumericField(this.getNestedRecord(record, 'invoice'), ['cost']);

    if (directValue !== null) {
      return directValue;
    }

    const parcels = Array.isArray(record['parcels']) ? record['parcels'] : [];
    if (parcels.length) {
      return parcels.reduce((sum, parcel) => {
        const insurance = this.getNumericField(this.asRecord(parcel), [
          'insuranceCost',
        ]);
        return sum + (insurance ?? 0);
      }, 0);
    }

    return null;
  }

  private extractWeight(shipment: unknown) {
    const record = this.asRecord(shipment);
    const directWeight = this.getNumericField(record, ['weight', 'actualWeight']);
    if (directWeight !== null) return directWeight;

    const parcels = Array.isArray(record['parcels']) ? record['parcels'] : [];
    if (!parcels.length) return null;

    return parcels.reduce((sum, parcel) => {
      const weight = this.getNumericField(this.asRecord(parcel), [
        'actualWeight',
        'weight',
      ]);
      return sum + (weight ?? 0);
    }, 0);
  }

  private extractFormDataForDuplicate(shipment: unknown) {
    const record = this.asRecord(shipment);
    const formData: Record<string, unknown> = {};

    for (const key of [
      'clientOrder',
      'note',
      'deliveryType',
      'payerType',
      'payerContractNumber',
      'sender',
      'recipient',
      'parcels',
      'invoice',
    ]) {
      if (record[key] !== undefined) {
        formData[key] = record[key];
      }
    }

    return formData;
  }

  private async upsertShipmentMetadata(
    userId: number,
    postalServiceId: number,
    shipment: {
      operatorRef: string;
      rawStatus: string | null;
      normalizedStatus: ShipmentStatus;
      recipientName: string | null;
      declaredValue: number | null;
      operatorCreatedAt: Date | null;
      metadata: unknown;
    },
  ) {
    return this.prisma.db.shipment.upsert({
      where: {
        userId_postalServiceId_operatorRef: {
          userId,
          postalServiceId,
          operatorRef: shipment.operatorRef,
        },
      },
      create: {
        userId,
        postalServiceId,
        operatorRef: shipment.operatorRef,
        rawStatus: shipment.rawStatus,
        normalizedStatus: shipment.normalizedStatus,
        recipientName: shipment.recipientName,
        declaredValue: shipment.declaredValue,
        operatorCreatedAt: shipment.operatorCreatedAt,
        lastSyncedAt: new Date(),
        metadata: this.toJsonValue(shipment.metadata),
      },
      update: {
        rawStatus: shipment.rawStatus,
        normalizedStatus: shipment.normalizedStatus,
        recipientName: shipment.recipientName,
        declaredValue: shipment.declaredValue,
        operatorCreatedAt: shipment.operatorCreatedAt,
        lastSyncedAt: new Date(),
        metadata: this.toJsonValue(shipment.metadata),
      },
    });
  }

  private toJsonValue(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
    if (value === null || value === undefined) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private asRecord(value: unknown) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private getNestedRecord(source: Record<string, unknown>, key: string) {
    return this.asRecord(source[key]);
  }

  private getStringField(source: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    return null;
  }

  private getNumericField(source: Record<string, unknown>, keys: string[]) {
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

  private parseDate(value: string | null) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private getIdAsString(value: unknown) {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return null;
  }

  private composeAddress(addressParts: Record<string, unknown>) {
    const parts = [
      this.getStringField(addressParts, ['countryCode']),
      this.getStringField(addressParts, ['region']),
      this.getStringField(addressParts, ['city']),
      this.getStringField(addressParts, ['street']),
      this.getStringField(addressParts, ['building']),
      this.getStringField(addressParts, ['flat']),
      this.getStringField(addressParts, ['postCode']),
    ].filter((part): part is string => Boolean(part));

    return parts.length ? parts.join(', ') : null;
  }
}
