import { NotFoundException } from '@nestjs/common';
import { PostalConnectionsController } from './postal-connections.controller.js';
import { PostalConnectionsService } from './postal-connections.service.js';
import { NovaPostAuthService } from './nova-post/nova-post-auth.service.js';
import type { JwtUser } from '../../../types/auth.types.js';

const user = { id: 3 } as JwtUser;

function makeController(
  svc: Partial<PostalConnectionsService>,
  auth: Partial<NovaPostAuthService> = {},
) {
  return new PostalConnectionsController(
    svc as PostalConnectionsService,
    auth as NovaPostAuthService,
  );
}

describe('PostalConnectionsController', () => {
  describe('getAll', () => {
    it('delegates to service.getConnectionsForUser with user id', async () => {
      const service = { getConnectionsForUser: jest.fn().mockResolvedValue({ connections: [] }) };
      const result = await makeController(service).getAll(user);
      expect(service.getConnectionsForUser).toHaveBeenCalledWith(3);
      expect(result).toEqual({ connections: [] });
    });
  });

  describe('connect', () => {
    it('routes nova-post to novaPostAuthService.connect', async () => {
      const auth = { connect: jest.fn().mockResolvedValue(undefined) };
      const service = {};
      const controller = makeController(service, auth);

      const result = await controller.connect(user, { operator: 'nova-post' } as any, { apiKey: 'key123' });

      expect(auth.connect).toHaveBeenCalledWith(3, 'key123');
      expect(result).toEqual({ connected: true });
    });

    it('routes ukrposhta to service.connectGeneric', async () => {
      const expected = { id: 5, status: 'ACTIVE' };
      const service = { connectGeneric: jest.fn().mockResolvedValue(expected) };
      const controller = makeController(service);

      const result = await controller.connect(user, { operator: 'ukrposhta' } as any, { apiKey: 'ukr-key' });

      expect(service.connectGeneric).toHaveBeenCalledWith(3, 'ukrposhta', 'ukr-key');
      expect(result).toEqual(expected);
    });

    it('routes meest to service.connectGeneric', async () => {
      const service = { connectGeneric: jest.fn().mockResolvedValue({ id: 6 }) };
      const controller = makeController(service);

      await controller.connect(user, { operator: 'meest' } as any, { apiKey: 'meest-key' });

      expect(service.connectGeneric).toHaveBeenCalledWith(3, 'meest', 'meest-key');
    });
  });

  describe('getById', () => {
    it('delegates to service.getConnectionById', async () => {
      const expected = { id: 7, status: 'ACTIVE' };
      const service = { getConnectionById: jest.fn().mockResolvedValue(expected) };

      const result = await makeController(service).getById(user, 7);

      expect(service.getConnectionById).toHaveBeenCalledWith(3, 7);
      expect(result).toEqual(expected);
    });
  });

  describe('updateKey', () => {
    it('delegates to service.updateConnectionKey and returns { updated: true }', async () => {
      const service = { updateConnectionKey: jest.fn().mockResolvedValue(undefined) };

      const result = await makeController(service).updateKey(user, 4, { apiKey: 'new-key' });

      expect(service.updateConnectionKey).toHaveBeenCalledWith(3, 4, 'new-key');
      expect(result).toEqual({ updated: true });
    });
  });

  describe('remove', () => {
    it('delegates to service.deleteConnection', async () => {
      const service = { deleteConnection: jest.fn().mockResolvedValue(undefined) };

      await makeController(service).remove(user, 9);

      expect(service.deleteConnection).toHaveBeenCalledWith(3, 9);
    });
  });
});
