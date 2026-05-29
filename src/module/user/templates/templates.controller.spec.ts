import { TemplatesController } from './templates.controller.js';
import { TemplatesService } from './templates.service.js';
import type { JwtUser } from '../../../types/auth.types.js';

describe('TemplatesController', () => {
  let controller: TemplatesController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getTemplates: jest.fn(),
      getTemplateById: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      incrementUsage: jest.fn(),
    };
    controller = new TemplatesController(service as unknown as TemplatesService);
  });

  const user = { id: 8 } as JwtUser;

  it('getTemplates delegates to service.getTemplates with user id and query', async () => {
    const query = { page: 1, limit: 20 } as any;
    const expected = { items: [], meta: {} };
    service.getTemplates.mockResolvedValue(expected);

    const result = await controller.getTemplates(user, query);

    expect(service.getTemplates).toHaveBeenCalledWith(8, query);
    expect(result).toEqual(expected);
  });

  it('getTemplateById delegates to service.getTemplateById with user id and template id', async () => {
    const expected = { id: 1, name: 'Express' };
    service.getTemplateById.mockResolvedValue(expected);

    const result = await controller.getTemplateById(user, 1);

    expect(service.getTemplateById).toHaveBeenCalledWith(8, 1);
    expect(result).toEqual(expected);
  });

  it('createTemplate delegates to service.createTemplate with user id and dto', async () => {
    const dto = { name: 'New Template', operator: 'nova-poshta' } as any;
    const expected = { id: 5, name: 'New Template' };
    service.createTemplate.mockResolvedValue(expected);

    const result = await controller.createTemplate(user, dto);

    expect(service.createTemplate).toHaveBeenCalledWith(8, dto);
    expect(result).toEqual(expected);
  });

  it('updateTemplate delegates to service.updateTemplate with user id, template id and dto', async () => {
    const dto = { name: 'Updated' } as any;
    const expected = { id: 5, name: 'Updated' };
    service.updateTemplate.mockResolvedValue(expected);

    const result = await controller.updateTemplate(user, 5, dto);

    expect(service.updateTemplate).toHaveBeenCalledWith(8, 5, dto);
    expect(result).toEqual(expected);
  });

  it('deleteTemplate delegates to service.deleteTemplate with user id and template id', async () => {
    service.deleteTemplate.mockResolvedValue(undefined);

    await controller.deleteTemplate(user, 5);

    expect(service.deleteTemplate).toHaveBeenCalledWith(8, 5);
  });

  it('incrementUsage delegates to service.incrementUsage with user id and template id', async () => {
    const expected = { id: 5, usageCount: 4 };
    service.incrementUsage.mockResolvedValue(expected);

    const result = await controller.incrementUsage(user, 5);

    expect(service.incrementUsage).toHaveBeenCalledWith(8, 5);
    expect(result).toEqual(expected);
  });
});
