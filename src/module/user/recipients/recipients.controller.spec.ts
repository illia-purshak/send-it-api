import { RecipientsController } from './recipients.controller.js';
import { RecipientsService } from './recipients.service.js';
import type { JwtUser } from '../../../types/auth.types.js';

describe('RecipientsController', () => {
  let controller: RecipientsController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      getRecipients: jest.fn(),
      getRecipientById: jest.fn(),
      createRecipient: jest.fn(),
      updateRecipient: jest.fn(),
      deleteRecipient: jest.fn(),
    };
    controller = new RecipientsController(service as unknown as RecipientsService);
  });

  const user = { id: 9 } as JwtUser;

  it('getRecipients delegates to service.getRecipients with user id and query', async () => {
    const query = { page: 1, limit: 10 } as any;
    const expected = { items: [], meta: {} };
    service.getRecipients.mockResolvedValue(expected);

    const result = await controller.getRecipients(user, query);

    expect(service.getRecipients).toHaveBeenCalledWith(9, query);
    expect(result).toEqual(expected);
  });

  it('getRecipientById delegates to service.getRecipientById with user id and recipient id', async () => {
    const expected = { id: 1, name: 'Alice' };
    service.getRecipientById.mockResolvedValue(expected);

    const result = await controller.getRecipientById(user, 1);

    expect(service.getRecipientById).toHaveBeenCalledWith(9, 1);
    expect(result).toEqual(expected);
  });

  it('createRecipient delegates to service.createRecipient with user id and dto', async () => {
    const dto = { name: 'Bob', phone: '+380501234567' } as any;
    const expected = { id: 2, name: 'Bob' };
    service.createRecipient.mockResolvedValue(expected);

    const result = await controller.createRecipient(user, dto);

    expect(service.createRecipient).toHaveBeenCalledWith(9, dto);
    expect(result).toEqual(expected);
  });

  it('updateRecipient delegates to service.updateRecipient with user id, recipient id and dto', async () => {
    const dto = { name: 'Bobby' } as any;
    const expected = { id: 2, name: 'Bobby' };
    service.updateRecipient.mockResolvedValue(expected);

    const result = await controller.updateRecipient(user, 2, dto);

    expect(service.updateRecipient).toHaveBeenCalledWith(9, 2, dto);
    expect(result).toEqual(expected);
  });

  it('deleteRecipient delegates to service.deleteRecipient with user id and recipient id', async () => {
    service.deleteRecipient.mockResolvedValue(undefined);

    await controller.deleteRecipient(user, 2);

    expect(service.deleteRecipient).toHaveBeenCalledWith(9, 2);
  });
});
