import type { ShipmentStatus } from '../../../../generated/prisma/enums.js';

export type ShipmentOperatorSlug = 'nova-post' | 'draft';

export interface TrackingHistoryItem {
  code: string;
  codeName: string;
  countryCode: string;
  settlement: string;
  date: Date;
}

export interface ShipmentListItem {
  kind: 'shipment' | 'draft';
  operator: string;
  draftId: number | null;
  ref: string | null;
  ttn: string | null;
  postalServiceId: number | null;
  operatorName: string;
  operatorLogoUrl: string | null;
  normalizedStatus: ShipmentStatus;
  rawStatus: string | null;
  recipientName: string | null;
  createdAt: Date;
  declaredValue: number | null;
  canEdit: boolean;
  canCancel: boolean;
  canDuplicate: boolean;
}

export interface ShipmentDetail {
  kind: 'shipment';
  operator: string;
  ref: string;
  ttn: string;
  postalServiceId: number;
  postalServiceName: string;
  postalServiceLogoUrl: string | null;
  normalizedStatus: ShipmentStatus;
  rawStatus: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  deliveryAddress: string | null;
  declaredValue: number | null;
  weight: number | null;
  scheduledDeliveryDate: Date | null;
  createdAt: Date | null;
  lastSyncedAt: Date | null;
  trackingHistory: TrackingHistoryItem[];
  metadata: unknown;
  canEdit: boolean;
  canCancel: boolean;
  canDuplicate: boolean;
}

