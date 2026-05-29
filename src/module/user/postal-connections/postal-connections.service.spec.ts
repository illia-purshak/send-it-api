import { ForbiddenException, NotFoundException } from '@nestjs/common';

jest.mock('../../../utils/crypto.util.js', () => ({
  encryptTotp: jest.fn().mockReturnValue('encrypted-value'),
  decryptTotp: jest.fn().mockReturnValue('decrypted-value'),
  hashSha256: jest.fn(),
  generateToken: jest.fn(),
}));

import { PostalConnectionsService } from './postal-connections.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PostalConnectionStatus, SubscriptionBalanceStatus } from '../../../../generated/prisma/enums.js';

function makeService(prismaDb: Record<string, unknown>, notifications: Record<string, unknown> = {}) {
  const prisma = { db: prismaDb } as unknown as PrismaService;
  const notificationsSvc = { create: jest.fn(), ...notifications } as unknown as NotificationsService;
  return new PostalConnectionsService(prisma, notificationsSvc);
}

describe('PostalConnectionsService', () => {
  describe('checkOperatorLimit', () => {
    it('throws ForbiddenException when activeCount >= maxOperators', async () => {
      const db = {
        userSubscriptionBalance: {
          findFirst: jest.fn().mockResolvedValue({ plan: { maxOperators: 1, level: 0 } }),
        },
        userPostalConnection: {
          count: jest.fn().mockResolvedValue(1),
        },
      };
      const service = makeService(db);

      await expect(service.checkOperatorLimit(1)).rejects.toThrow(ForbiddenException);
    });

    it('returns { canConnect: true } when under the limit', async () => {
      const db = {
        userSubscriptionBalance: {
          findFirst: jest.fn().mockResolvedValue({ plan: { maxOperators: 3, level: 1 } }),
        },
        userPostalConnection: {
          count: jest.fn().mockResolvedValue(1),
        },
      };
      const result = await makeService(db).checkOperatorLimit(1);
      expect(result).toEqual({ canConnect: true });
    });
  });

  describe('getConnectionById', () => {
    it('returns connection when found', async () => {
      const conn = { id: 7, status: 'ACTIVE' };
      const db = {
        userPostalConnection: { findFirst: jest.fn().mockResolvedValue(conn) },
      };
      const result = await makeService(db).getConnectionById(1, 7);
      expect(result).toEqual(conn);
    });

    it('throws NotFoundException when not found', async () => {
      const db = {
        userPostalConnection: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      await expect(makeService(db).getConnectionById(1, 99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('connectGeneric', () => {
    it('throws NotFoundException for unknown operator slug', async () => {
      const db = {
        postalService: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      await expect(makeService(db).connectGeneric(1, 'unknown', 'key')).rejects.toThrow(NotFoundException);
    });

    it('checks operator limit only for new connections', async () => {
      const db = {
        postalService: { findUnique: jest.fn().mockResolvedValue({ id: 2 }) },
        userPostalConnection: {
          findUnique: jest.fn().mockResolvedValue(null),
          upsert: jest.fn().mockResolvedValue({ id: 10, status: 'ACTIVE' }),
          count: jest.fn().mockResolvedValue(0),
        },
        userSubscriptionBalance: {
          findFirst: jest.fn().mockResolvedValue({ plan: { maxOperators: 3, level: 1 } }),
        },
      };
      const service = makeService(db);
      jest.spyOn(service, 'checkOperatorLimit');

      await service.connectGeneric(1, 'ukrposhta', 'key');

      expect(service.checkOperatorLimit).toHaveBeenCalledWith(1);
    });

    it('skips operator limit check when connection already exists', async () => {
      const existingConn = { id: 5 };
      const db = {
        postalService: { findUnique: jest.fn().mockResolvedValue({ id: 2 }) },
        userPostalConnection: {
          findUnique: jest.fn().mockResolvedValue(existingConn),
          upsert: jest.fn().mockResolvedValue({ id: 5, status: 'ACTIVE' }),
        },
      };
      const service = makeService(db);
      jest.spyOn(service, 'checkOperatorLimit');

      await service.connectGeneric(1, 'ukrposhta', 'new-key');

      expect(service.checkOperatorLimit).not.toHaveBeenCalled();
      expect(db.userPostalConnection.upsert).toHaveBeenCalled();
    });

    it('upserts with encrypted apiKey and ACTIVE status', async () => {
      const db = {
        postalService: { findUnique: jest.fn().mockResolvedValue({ id: 3 }) },
        userPostalConnection: {
          findUnique: jest.fn().mockResolvedValue({ id: 5 }),
          upsert: jest.fn().mockResolvedValue({ id: 5, status: 'ACTIVE' }),
        },
      };
      await makeService(db).connectGeneric(1, 'meest', 'raw-key');

      const upsertCall = db.userPostalConnection.upsert.mock.calls[0][0];
      expect(upsertCall.update.status).toBe(PostalConnectionStatus.ACTIVE);
      expect(typeof upsertCall.update.apiKey).toBe('string');
      expect(upsertCall.update.apiKey).not.toBe('raw-key'); // encrypted
    });
  });

  describe('updateConnectionKey', () => {
    it('updates key for found connection', async () => {
      const conn = { id: 4, status: 'ACTIVE' };
      const db = {
        userPostalConnection: {
          findFirst: jest.fn().mockResolvedValue(conn),
          update: jest.fn().mockResolvedValue(conn),
        },
      };
      await makeService(db).updateConnectionKey(1, 4, 'new-key');
      expect(db.userPostalConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 4 } }),
      );
    });

    it('throws NotFoundException for missing connection', async () => {
      const db = {
        userPostalConnection: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
      };
      await expect(makeService(db).updateConnectionKey(1, 99, 'key')).rejects.toThrow(NotFoundException);
      expect(db.userPostalConnection.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteConnection', () => {
    it('deletes connection when found', async () => {
      const db = {
        userPostalConnection: {
          findFirst: jest.fn().mockResolvedValue({ id: 6 }),
          delete: jest.fn().mockResolvedValue(undefined),
        },
      };
      await makeService(db).deleteConnection(1, 6);
      expect(db.userPostalConnection.delete).toHaveBeenCalledWith({ where: { id: 6 } });
    });

    it('throws NotFoundException when connection not found', async () => {
      const db = {
        userPostalConnection: {
          findFirst: jest.fn().mockResolvedValue(null),
          delete: jest.fn(),
        },
      };
      await expect(makeService(db).deleteConnection(1, 99)).rejects.toThrow(NotFoundException);
      expect(db.userPostalConnection.delete).not.toHaveBeenCalled();
    });
  });

  describe('markAsInvalid', () => {
    it('updates status to INVALID and sends notification', async () => {
      const db = {
        userPostalConnection: { updateMany: jest.fn().mockResolvedValue(undefined) },
      };
      const notifications = { create: jest.fn().mockResolvedValue(undefined) };
      const service = makeService(db, notifications);

      await service.markAsInvalid(1, 2);

      expect(db.userPostalConnection.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, postalServiceId: 2 },
        data: { status: PostalConnectionStatus.INVALID },
      });
      expect(notifications.create).toHaveBeenCalled();
    });
  });
});
