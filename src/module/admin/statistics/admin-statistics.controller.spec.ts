import { AdminStatisticsController } from './admin-statistics.controller.js';
import { AdminStatisticsService } from './admin-statistics.service.js';

describe('AdminStatisticsController', () => {
  let controller: AdminStatisticsController;
  let service: { getStatistics: jest.Mock };

  beforeEach(() => {
    service = { getStatistics: jest.fn() };
    controller = new AdminStatisticsController(service as unknown as AdminStatisticsService);
  });

  it('getStatistics delegates to service.getStatistics', async () => {
    const expected = { summary: {}, postalOperators: [] };
    service.getStatistics.mockResolvedValue(expected);

    const result = await controller.getStatistics();

    expect(service.getStatistics).toHaveBeenCalled();
    expect(result).toEqual(expected);
  });
});
