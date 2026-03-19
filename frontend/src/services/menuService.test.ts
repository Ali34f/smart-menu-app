import api from './api';
import { menuService } from './menuService';

jest.mock('./api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));

describe('menuService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAllItems calls api.get with /menu', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: [], count: 0 },
    });
    await menuService.getAllItems();
    expect(api.get).toHaveBeenCalledWith('/menu');
  });

  it('getItem calls api.get with /menu/:id', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: { _id: '1', name: 'Pizza' } },
    });
    await menuService.getItem('1');
    expect(api.get).toHaveBeenCalledWith('/menu/1');
  });

  it('createItem calls api.post with /menu and data', async () => {
    const item = {
      name: 'Pizza',
      description: 'Cheese',
      category: 'Mains',
      price: 10,
      isAvailable: true,
    };
    (api.post as jest.Mock).mockResolvedValue({
      data: { success: true, data: { ...item, _id: '1' } },
    });
    await menuService.createItem(item);
    expect(api.post).toHaveBeenCalledWith('/menu', item);
  });

  it('updateItem calls api.put with /menu/:id and data', async () => {
    (api.put as jest.Mock).mockResolvedValue({
      data: { success: true, data: {} },
    });
    await menuService.updateItem('1', { name: 'Updated' });
    expect(api.put).toHaveBeenCalledWith('/menu/1', { name: 'Updated' });
  });

  it('deleteItem calls api.delete with /menu/:id', async () => {
    (api.delete as jest.Mock).mockResolvedValue({ data: { success: true } });
    await menuService.deleteItem('1');
    expect(api.delete).toHaveBeenCalledWith('/menu/1');
  });

  it('toggleAvailability calls api.patch with /menu/:id/toggle', async () => {
    (api.patch as jest.Mock).mockResolvedValue({
      data: { success: true, data: {} },
    });
    await menuService.toggleAvailability('1');
    expect(api.patch).toHaveBeenCalledWith('/menu/1/toggle');
  });
});
