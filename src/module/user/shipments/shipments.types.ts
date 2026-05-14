import type { ShipmentStatus } from '../../../../generated/prisma/enums.js';

export type ShipmentOperatorSlug = 'nova-post' | 'draft';

export interface ShipmentListItem {
  kind: 'shipment' | 'draft';
  operator: ShipmentOperatorSlug | string;
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
  createdAt: Date | null;
  lastSyncedAt: Date | null;
  metadata: unknown;
  canEdit: boolean;
  canCancel: boolean;
  canDuplicate: boolean;
}

export interface DuplicateDataResponse {
  postalServiceId: number | null;
  formData: Record<string, unknown>;
}
