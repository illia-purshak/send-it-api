import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let controller: AppController;
  let appService: { getHello: jest.Mock };

  beforeEach(() => {
    appService = { getHello: jest.fn() };
    controller = new AppController(appService as unknown as AppService);
  });

  it('getHello returns result from appService.getHello', () => {
    appService.getHello.mockReturnValue('SendIt server online');

    const result = controller.getHello();

    expect(appService.getHello).toHaveBeenCalled();
    expect(result).toBe('SendIt server online');
  });
});
