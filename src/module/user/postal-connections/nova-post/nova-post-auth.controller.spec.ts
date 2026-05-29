import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { NovaPostAuthController } from './nova-post-auth.controller.js';
import { NovaPostAuthService } from './nova-post-auth.service.js';
import { NovaPostApiClient } from './nova-post-api.client.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { JwtUser } from '../../../../types/auth.types.js';

const user = { id: 5 } as JwtUser;

function makeController(
  authService: Partial<NovaPostAuthService> = {},
  apiClient: Partial<NovaPostApiClient> = {},
  prisma: Partial<PrismaService> = {},
) {
  return new NovaPostAuthController(
    authService as NovaPostAuthService,
    apiClient as NovaPostApiClient,
    prisma as unknown as PrismaService,
  );
}

describe('NovaPostAuthController', () => {
  describe('requestKey', () => {
    it('delegates to authService.requestApiKey', async () => {
      const authService = { requestApiKey: jest.fn().mockResolvedValue({ apiKey: 'test-key' }) };
      const result = await makeController(authService).requestKey({ phone: '+380501234567' });
      expect(authService.requestApiKey).toHaveBeenCalledWith('+380501234567');
      expect(result).toEqual({ apiKey: 'test-key' });
    });
  });

  describe('getDivisions', () => {
    const baseQuery = { countryCode: 'UA' } as any;

    it('throws NotFoundException when postal service slug not found', async () => {
      const prisma = { db: { postalService: { findUnique: jest.fn().mockResolvedValue(null) } } };
      const controller = makeController({}, {}, prisma as any);

      await expect(controller.getDivisions(user, baseQuery)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when user has no connection', async () => {
      const prisma = {
        db: {
          postalService: { findUnique: jest.fn().mockResolvedValue({ id: 2 }) },
          userPostalConnection: { findUnique: jest.fn().mockResolvedValue(null) },
        },
      };
      const controller = makeController({}, {}, prisma as any);

      await expect(controller.getDivisions(user, baseQuery)).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException when connection is INVALID', async () => {
      const prisma = {
        db: {
          postalService: { findUnique: jest.fn().mockResolvedValue({ id: 2 }) },
          userPostalConnection: {
            findUnique: jest.fn().mockResolvedValue({ status: 'INVALID', postalServiceId: 2 }),
          },
        },
      };
      const controller = makeController({}, {}, prisma as any);

      await expect(controller.getDivisions(user, baseQuery)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('calls apiClient.getDivisions with correct params when connection is ACTIVE', async () => {
      const expected = { data: [], total: 0 };
      const prisma = {
        db: {
          postalService: { findUnique: jest.fn().mockResolvedValue({ id: 2 }) },
          userPostalConnection: {
            findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE', postalServiceId: 2 }),
          },
        },
      };
      const apiClient = { getDivisions: jest.fn().mockResolvedValue(expected) };
      const controller = makeController({}, apiClient, prisma as any);

      const result = await controller.getDivisions(user, {
        countryCode: 'UA',
        page: 1,
        limit: 10,
      } as any);

      expect(apiClient.getDivisions).toHaveBeenCalledWith(5, 2, {
        countryCodes: ['UA'],
        divisionCategories: undefined,
        settlementIds: undefined,
        limit: 10,
        page: 1,
      });
      expect(result).toEqual(expected);
    });

    it('omits countryCode when not provided', async () => {
      const prisma = {
        db: {
          postalService: { findUnique: jest.fn().mockResolvedValue({ id: 2 }) },
          userPostalConnection: {
            findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE', postalServiceId: 2 }),
          },
        },
      };
      const apiClient = { getDivisions: jest.fn().mockResolvedValue({ data: [], total: 0 }) };
      const controller = makeController({}, apiClient, prisma as any);

      await controller.getDivisions(user, {} as any);

      expect(apiClient.getDivisions).toHaveBeenCalledWith(
        5,
        2,
        expect.objectContaining({ countryCodes: undefined }),
      );
    });
  });
});
