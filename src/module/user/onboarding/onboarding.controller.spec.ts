import { OnboardingController } from './onboarding.controller.js';
import { OnboardingService } from './onboarding.service.js';
import type { JwtUser } from '../../../types/auth.types.js';

describe('OnboardingController', () => {
  let controller: OnboardingController;
  let service: { getChecklist: jest.Mock };

  beforeEach(() => {
    service = { getChecklist: jest.fn() };
    controller = new OnboardingController(service as unknown as OnboardingService);
  });

  it('getChecklist delegates to service.getChecklist with user id', async () => {
    const user = { id: 7 } as JwtUser;
    const expected = { profileCompleted: true, operatorConnected: false, firstShipmentCreated: false };
    service.getChecklist.mockResolvedValue(expected);

    const result = await controller.getChecklist(user);

    expect(service.getChecklist).toHaveBeenCalledWith(7);
    expect(result).toEqual(expected);
  });
});
