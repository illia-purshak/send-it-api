import { NotFoundException } from '@nestjs/common';
import { ShipmentsController } from './shipments.controller.js';
import { NovaPostShipmentsService } from './nova-post-shipments.service.js';
import { UkrposhtaShipmentsService } from './ukrposhta-shipments.service.js';
import { MeestShipmentsService } from './meest-shipments.service.js';
import { ShipmentReadService } from './shipment-read.service.js';
import type { JwtUser } from '../../../types/auth.types.js';

const user = { id: 7 } as JwtUser;

function makeController(overrides: {
  novaPost?: Partial<NovaPostShipmentsService>;
  ukrposhta?: Partial<UkrposhtaShipmentsService>;
  meest?: Partial<MeestShipmentsService>;
  read?: Partial<ShipmentReadService>;
} = {}) {
  return new ShipmentsController(
    (overrides.novaPost ?? {}) as NovaPostShipmentsService,
    (overrides.ukrposhta ?? {}) as UkrposhtaShipmentsService,
    (overrides.meest ?? {}) as MeestShipmentsService,
    (overrides.read ?? {}) as ShipmentReadService,
  );
}

describe('ShipmentsController', () => {
  describe('getUnifiedShipments', () => {
    it('delegates to shipmentReadService.getUnifiedShipments', async () => {
      const expected = { items: [], meta: {} };
      const read = { getUnifiedShipments: jest.fn().mockResolvedValue(expected) };
      const query = { page: 1, limit: 20 } as any;

      const result = await makeController({ read }).getUnifiedShipments(user, query);

      expect(read.getUnifiedShipments).toHaveBeenCalledWith(7, query);
      expect(result).toEqual(expected);
    });
  });

  describe('getShipmentOperators', () => {
    it('delegates to shipmentReadService.getOperatorsForUser', async () => {
      const expected = { operators: [] };
      const read = { getOperatorsForUser: jest.fn().mockResolvedValue(expected) };

      const result = await makeController({ read }).getShipmentOperators(user);

      expect(read.getOperatorsForUser).toHaveBeenCalledWith(7);
      expect(result).toEqual(expected);
    });
  });

  describe('getShipmentDetail', () => {
    it('delegates to shipmentReadService.getShipmentDetail', async () => {
      const expected = { kind: 'shipment', ttn: 'TTN123' };
      const read = { getShipmentDetail: jest.fn().mockResolvedValue(expected) };

      const result = await makeController({ read }).getShipmentDetail(user, 'nova-post', 'TTN123');

      expect(read.getShipmentDetail).toHaveBeenCalledWith(7, 'nova-post', 'TTN123');
      expect(result).toEqual(expected);
    });
  });

  describe('createShipment', () => {
    it('routes nova-post to novaPostService.createShipment', async () => {
      const expected = { ttn: 'NP001', id: 'abc' };
      const novaPost = { createShipment: jest.fn().mockResolvedValue(expected) };
      const dto = { operator: 'nova-post', sender: {}, recipient: {}, parcels: [] } as any;

      const result = await makeController({ novaPost }).createShipment(user, dto);

      expect(novaPost.createShipment).toHaveBeenCalledWith(7, expect.not.objectContaining({ operator: expect.anything() }));
      expect(result).toEqual(expected);
    });

    it('routes ukrposhta to ukrposhtaService.createShipment', async () => {
      const expected = { ttn: 'UP002' };
      const ukrposhta = { createShipment: jest.fn().mockResolvedValue(expected) };
      const dto = { operator: 'ukrposhta', sender: {}, recipient: {}, weight: 1 } as any;

      const result = await makeController({ ukrposhta }).createShipment(user, dto);

      expect(ukrposhta.createShipment).toHaveBeenCalledWith(7, expect.not.objectContaining({ operator: expect.anything() }));
      expect(result).toEqual(expected);
    });

    it('routes meest to meestService.createShipment', async () => {
      const expected = { ttn: 'ME003' };
      const meest = { createShipment: jest.fn().mockResolvedValue(expected) };
      const dto = { operator: 'meest', sender: {}, recipient: {}, weight: 2 } as any;

      const result = await makeController({ meest }).createShipment(user, dto);

      expect(meest.createShipment).toHaveBeenCalledWith(7, expect.not.objectContaining({ operator: expect.anything() }));
      expect(result).toEqual(expected);
    });

    it('strips operator field before passing to service', async () => {
      const novaPost = { createShipment: jest.fn().mockResolvedValue({}) };
      const dto = { operator: 'nova-post', sender: { name: 'Alice' }, parcels: [{ weight: 1 }] } as any;

      await makeController({ novaPost }).createShipment(user, dto);

      const passedDto = novaPost.createShipment.mock.calls[0][1];
      expect(passedDto).not.toHaveProperty('operator');
      expect(passedDto).toHaveProperty('sender', { name: 'Alice' });
    });
  });

  describe('deleteShipment', () => {
    it('routes nova-post to novaPostService.deleteShipment', async () => {
      const expected = { deletedAt: '2025-01-01' };
      const novaPost = { deleteShipment: jest.fn().mockResolvedValue(expected) };

      const result = await makeController({ novaPost }).deleteShipment(user, 'nova-post', 'TTN001');

      expect(novaPost.deleteShipment).toHaveBeenCalledWith(7, 'TTN001');
      expect(result).toEqual(expected);
    });

    it('routes ukrposhta to ukrposhtaService.deleteShipment', async () => {
      const ukrposhta = { deleteShipment: jest.fn().mockResolvedValue({ deletedAt: '2025-01-02' }) };

      await makeController({ ukrposhta }).deleteShipment(user, 'ukrposhta', 'UP456');

      expect(ukrposhta.deleteShipment).toHaveBeenCalledWith(7, 'UP456');
    });

    it('routes meest to meestService.deleteShipment', async () => {
      const meest = { deleteShipment: jest.fn().mockResolvedValue({ deletedAt: '2025-01-03' }) };

      await makeController({ meest }).deleteShipment(user, 'meest', 'ME789');

      expect(meest.deleteShipment).toHaveBeenCalledWith(7, 'ME789');
    });

    it('throws NotFoundException for unknown operator', () => {
      expect(() =>
        makeController().deleteShipment(user, 'unknown-operator', 'TTN'),
      ).toThrow(NotFoundException);
    });
  });
});
