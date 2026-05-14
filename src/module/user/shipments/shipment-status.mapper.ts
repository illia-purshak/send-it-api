import { ShipmentStatus } from '../../../../generated/prisma/enums.js';

const novaPostStatusMap: Record<string, ShipmentStatus> = {
  Created: ShipmentStatus.CREATED,
  Accepted: ShipmentStatus.PREPARING,
  Preparing: ShipmentStatus.PREPARING,
  'Shipment in city': ShipmentStatus.PREPARING,
  'Shipment in transit': ShipmentStatus.IN_TRANSIT,
  'Arrived in city': ShipmentStatus.IN_TRANSIT,
  'Arrived at branch': ShipmentStatus.IN_TRANSIT,
  Delivered: ShipmentStatus.DELIVERED,
  Received: ShipmentStatus.DELIVERED,
  Cancelled: ShipmentStatus.CANCELLED,
  Returned: ShipmentStatus.RETURNED,
  'Recipient refused': ShipmentStatus.RETURNED,
};

export function mapNovaPostStatus(rawStatus: string | null | undefined): ShipmentStatus {
  if (!rawStatus) return ShipmentStatus.UNKNOWN;
  return novaPostStatusMap[rawStatus] ?? ShipmentStatus.UNKNOWN;
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
