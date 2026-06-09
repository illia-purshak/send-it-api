import { AdminProfileController } from './profile.controller.js';
import { AdminProfileService } from './profile.service.js';
import type { AdminJwtUser } from '../../../types/admin-auth.types.js';

describe('AdminProfileController', () => {
  let controller: AdminProfileController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      updateSettings: jest.fn(),
    };
    controller = new AdminProfileController(service as unknown as AdminProfileService);
  });

  const admin = { id: 2, email: 'admin@example.com' } as AdminJwtUser;

  it('getProfile delegates to service.getProfile with admin id', async () => {
    const expected = { id: 2, firstName: 'Jane' };
    service.getProfile.mockResolvedValue(expected);

    const result = await controller.getProfile(admin);

    expect(service.getProfile).toHaveBeenCalledWith(2);
    expect(result).toEqual(expected);
  });

  it('updateProfile delegates to service.updateProfile with admin id and dto', async () => {
    const dto = { firstName: 'Jane', lastName: 'Doe' } as any;
    const expected = { id: 2, firstName: 'Jane', lastName: 'Doe' };
    service.updateProfile.mockResolvedValue(expected);

    const result = await controller.updateProfile(admin, dto);

    expect(service.updateProfile).toHaveBeenCalledWith(2, dto);
    expect(result).toEqual(expected);
  });

  it('updateSettings delegates to service.updateSettings with admin id and dto', async () => {
    const dto = { language: 'uk', timezone: 'Europe/Kyiv' } as any;
    const expected = { language: 'uk' };
    service.updateSettings.mockResolvedValue(expected);

    const result = await controller.updateSettings(admin, dto);

    expect(service.updateSettings).toHaveBeenCalledWith(2, dto);
    expect(result).toEqual(expected);
  });
});
