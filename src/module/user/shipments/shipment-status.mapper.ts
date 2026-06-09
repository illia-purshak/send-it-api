import { ShipmentStatus } from '../../../../generated/prisma/enums.js';

// Document-level statuses returned in the `status` field of GET /shipments items
const novaPostStatusMap: Record<string, ShipmentStatus> = {
  Draft: ShipmentStatus.DRAFT,
  ReadyToShip: ShipmentStatus.CREATED,
  Accepted: ShipmentStatus.PREPARING,
  Issued: ShipmentStatus.PREPARING,
  Delivered: ShipmentStatus.DELIVERED,
  Returned: ShipmentStatus.RETURNED,
  Utilized: ShipmentStatus.RETURNED,
  Deleted: ShipmentStatus.CANCELLED,
};

// Numeric tracking codes from the `tracking[]` history array embedded in shipment detail
const novaPostTrackingCodeMap: Partial<Record<number, ShipmentStatus>> = {
  1: ShipmentStatus.CREATED,
  2: ShipmentStatus.CANCELLED,
  4: ShipmentStatus.PREPARING,
  5: ShipmentStatus.IN_TRANSIT,
  6: ShipmentStatus.IN_TRANSIT,
  7: ShipmentStatus.IN_TRANSIT,
  8: ShipmentStatus.IN_TRANSIT,
  9: ShipmentStatus.DELIVERED,
  10: ShipmentStatus.DELIVERED,
  11: ShipmentStatus.DELIVERED,
  13: ShipmentStatus.IN_TRANSIT,
  16: ShipmentStatus.IN_TRANSIT,
  30: ShipmentStatus.IN_TRANSIT,
  31: ShipmentStatus.IN_TRANSIT,
  99: ShipmentStatus.UNKNOWN,
  101: ShipmentStatus.IN_TRANSIT,
  102: ShipmentStatus.RETURNED,
  103: ShipmentStatus.RETURNED,
  104: ShipmentStatus.IN_TRANSIT,
  105: ShipmentStatus.RETURNED,
  106: ShipmentStatus.RETURNED,
  110: ShipmentStatus.IN_TRANSIT,
  111: ShipmentStatus.IN_TRANSIT,
  112: ShipmentStatus.IN_TRANSIT,
  113: ShipmentStatus.IN_TRANSIT,
  114: ShipmentStatus.IN_TRANSIT,
  115: ShipmentStatus.IN_TRANSIT,
  116: ShipmentStatus.IN_TRANSIT,
  117: ShipmentStatus.IN_TRANSIT,
  118: ShipmentStatus.IN_TRANSIT,
  119: ShipmentStatus.IN_TRANSIT,
  120: ShipmentStatus.IN_TRANSIT,
  121: ShipmentStatus.IN_TRANSIT,
  122: ShipmentStatus.IN_TRANSIT,
  123: ShipmentStatus.IN_TRANSIT,
  124: ShipmentStatus.IN_TRANSIT,
  125: ShipmentStatus.IN_TRANSIT,
  126: ShipmentStatus.IN_TRANSIT,
  127: ShipmentStatus.IN_TRANSIT,
  128: ShipmentStatus.IN_TRANSIT,
  130: ShipmentStatus.IN_TRANSIT,
  131: ShipmentStatus.IN_TRANSIT,
  132: ShipmentStatus.IN_TRANSIT,
  141: ShipmentStatus.IN_TRANSIT,
  144: ShipmentStatus.IN_TRANSIT,
  149: ShipmentStatus.IN_TRANSIT,
  155: ShipmentStatus.RETURNED,
  197: ShipmentStatus.IN_TRANSIT,
  198: ShipmentStatus.IN_TRANSIT,
  199: ShipmentStatus.IN_TRANSIT,
  999: ShipmentStatus.UNKNOWN,
};

export function mapNovaPostStatus(rawStatus: string | null | undefined): ShipmentStatus {
  if (!rawStatus) return ShipmentStatus.UNKNOWN;
  return novaPostStatusMap[rawStatus] ?? ShipmentStatus.UNKNOWN;
}

const ukrposhtaStatusMap: Record<string, ShipmentStatus> = {
  Created: ShipmentStatus.CREATED,
  Accepted: ShipmentStatus.PREPARING,
  InTransit: ShipmentStatus.IN_TRANSIT,
  Delivered: ShipmentStatus.DELIVERED,
  Returned: ShipmentStatus.RETURNED,
  Cancelled: ShipmentStatus.CANCELLED,
};

export function mapUkrposhtaStatus(rawStatus: string | null | undefined): ShipmentStatus {
  if (!rawStatus) return ShipmentStatus.UNKNOWN;
  return ukrposhtaStatusMap[rawStatus] ?? ShipmentStatus.UNKNOWN;
}

const meestStatusMap: Record<string, ShipmentStatus> = {
  Created: ShipmentStatus.CREATED,
  Accepted: ShipmentStatus.PREPARING,
  InTransit: ShipmentStatus.IN_TRANSIT,
  Delivered: ShipmentStatus.DELIVERED,
  Returned: ShipmentStatus.RETURNED,
  Cancelled: ShipmentStatus.CANCELLED,
};

export function mapMeestStatus(rawStatus: string | null | undefined): ShipmentStatus {
  if (!rawStatus) return ShipmentStatus.UNKNOWN;
  return meestStatusMap[rawStatus] ?? ShipmentStatus.UNKNOWN;
}

export function mapNovaPostTrackingCode(code: number): ShipmentStatus {
  return novaPostTrackingCodeMap[code] ?? ShipmentStatus.UNKNOWN;
}

export function getShipmentActionFlags(normalizedStatus: ShipmentStatus) {
  const editableStatuses = new Set<ShipmentStatus>([
    ShipmentStatus.DRAFT,
    ShipmentStatus.CREATED,
    ShipmentStatus.PREPARING,
  ]);

  return {
    canEdit: editableStatuses.has(normalizedStatus),
    canCancel: editableStatuses.has(normalizedStatus),
    canDuplicate: true,
  };
}
