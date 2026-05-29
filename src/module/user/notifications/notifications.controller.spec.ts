import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import type { JwtUser } from '../../../types/auth.types.js';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getNotifications: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      deleteOne: jest.fn(),
      deleteBulk: jest.fn(),
    };
    controller = new NotificationsController(service as unknown as NotificationsService);
  });

  const user = { id: 11 } as JwtUser;

  it('getNotifications delegates to service.getNotifications with user id and query', async () => {
    const query = { page: 1, limit: 20 } as any;
    const expected = { items: [], meta: {} };
    service.getNotifications.mockResolvedValue(expected);

    const result = await controller.getNotifications(user, query);

    expect(service.getNotifications).toHaveBeenCalledWith(11, query);
    expect(result).toEqual(expected);
  });

  it('getUnreadCount delegates to service.getUnreadCount with user id', async () => {
    const expected = { count: 3 };
    service.getUnreadCount.mockResolvedValue(expected);

    const result = await controller.getUnreadCount(user);

    expect(service.getUnreadCount).toHaveBeenCalledWith(11);
    expect(result).toEqual(expected);
  });

  it('markAsRead delegates to service.markAsRead with user id and notification id', async () => {
    const expected = { id: 5, isRead: true };
    service.markAsRead.mockResolvedValue(expected);

    const result = await controller.markAsRead(user, 5);

    expect(service.markAsRead).toHaveBeenCalledWith(11, 5);
    expect(result).toEqual(expected);
  });

  it('markAllAsRead delegates to service.markAllAsRead with user id', async () => {
    const expected = { updated: 3 };
    service.markAllAsRead.mockResolvedValue(expected);

    const result = await controller.markAllAsRead(user);

    expect(service.markAllAsRead).toHaveBeenCalledWith(11);
    expect(result).toEqual(expected);
  });

  it('deleteOne delegates to service.deleteOne with user id and notification id', async () => {
    service.deleteOne.mockResolvedValue(undefined);

    await controller.deleteOne(user, 5);

    expect(service.deleteOne).toHaveBeenCalledWith(11, 5);
  });

  it('deleteBulk delegates to service.deleteBulk with user id and query', async () => {
    const query = { filter: 'read' } as any;
    service.deleteBulk.mockResolvedValue(undefined);

    await controller.deleteBulk(user, query);

    expect(service.deleteBulk).toHaveBeenCalledWith(11, query);
  });
});
