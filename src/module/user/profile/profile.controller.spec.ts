import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';
import type { JwtUser } from '../../../types/auth.types.js';

describe('ProfileController', () => {
  let controller: ProfileController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      updateSettings: jest.fn(),
      scheduleDelete: jest.fn(),
      restoreAccount: jest.fn(),
    };
    controller = new ProfileController(service as unknown as ProfileService);
  });

  const user = { id: 5 } as JwtUser;

  it('getProfile delegates to service.getProfile with user id', async () => {
    const expected = { id: 5, companyName: 'Acme' };
    service.getProfile.mockResolvedValue(expected);

    const result = await controller.getProfile(user);

    expect(service.getProfile).toHaveBeenCalledWith(5);
    expect(result).toEqual(expected);
  });

  it('updateProfile delegates to service.updateProfile with user id and dto', async () => {
    const dto = { companyName: 'Updated Co' } as any;
    const expected = { id: 5, companyName: 'Updated Co' };
    service.updateProfile.mockResolvedValue(expected);

    const result = await controller.updateProfile(user, dto);

    expect(service.updateProfile).toHaveBeenCalledWith(5, dto);
    expect(result).toEqual(expected);
  });

  it('updateSettings delegates to service.updateSettings with user id and dto', async () => {
    const dto = { language: 'uk', timezone: 'Europe/Kyiv' } as any;
    const expected = { language: 'uk' };
    service.updateSettings.mockResolvedValue(expected);

    const result = await controller.updateSettings(user, dto);

    expect(service.updateSettings).toHaveBeenCalledWith(5, dto);
    expect(result).toEqual(expected);
  });

  it('scheduleDelete delegates to service.scheduleDelete with user id', async () => {
    service.scheduleDelete.mockResolvedValue(undefined);

    await controller.scheduleDelete(user);

    expect(service.scheduleDelete).toHaveBeenCalledWith(5);
  });

  it('restoreAccount delegates to service.restoreAccount with user id', async () => {
    const expected = { message: 'Account restored' };
    service.restoreAccount.mockResolvedValue(expected);

    const result = await controller.restoreAccount(user);

    expect(service.restoreAccount).toHaveBeenCalledWith(5);
    expect(result).toEqual(expected);
  });
});
