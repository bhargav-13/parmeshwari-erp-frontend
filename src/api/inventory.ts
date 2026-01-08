import { apiClient } from './client';
import type {
  StockItem,
  StockItemRequest,
  StockItemStatusRequest,
  RawItem,
  RawItemRequest,
  RawItemStatusRequest,
  Product,
  ProductRequest,
  Category,
  CategoryRequest,
  PaginatedResult,
  InventoryFloor,
  InventoryStatus,
} from '../types';

// Stock Item API
export const stockItemApi = {
  // Create stock item
  createStockItem: async (data: StockItemRequest): Promise<StockItem> => {
    const response = await apiClient.post('/api/v1/stock-item', data);
    return response.data;
  },

  // Get all stock items with pagination by floor
  getStockItems: async (
    floor: InventoryFloor,
    page: number = 0,
    size: number = 10,
    status?: InventoryStatus,
    search?: string
  ): Promise<PaginatedResult<StockItem>> => {
    const response = await apiClient.get(`/api/v1/stock-item/floor/${floor}`, {
      params: {
        page,
        size,
        status: status || undefined,
        search: search || undefined,
      },
    });
    return response.data;
  },

  // Get all stock items without pagination
  getAllStockItems: async (): Promise<StockItem[]> => {
    const response = await apiClient.get('/api/v1/stock-item/all');
    return response.data;
  },

  // Get stock item by ID
  getStockItemById: async (stockItemId: number): Promise<StockItem> => {
    const response = await apiClient.get(`/api/v1/stock-item/${stockItemId}`);
    return response.data;
  },

  // Update stock item
  updateStockItem: async (stockItemId: number, data: StockItemRequest): Promise<StockItem> => {
    const response = await apiClient.put(`/api/v1/stock-item/${stockItemId}`, data);
    return response.data;
  },

  // Delete stock item
  deleteStockItem: async (stockItemId: number): Promise<void> => {
    await apiClient.delete(`/api/v1/stock-item/${stockItemId}`);
  },

  // Update stock item status
  updateStockItemStatus: async (
    stockItemId: number,
    data: StockItemStatusRequest
  ): Promise<StockItem> => {
    const response = await apiClient.patch(`/api/v1/stock-item/${stockItemId}/status`, data);
    return response.data;
  },
};

// Raw Item API
export const rawItemApi = {
  // Create raw item
  createRawItem: async (data: RawItemRequest): Promise<RawItem> => {
    const response = await apiClient.post('/api/v1/raw-item', data);
    return response.data;
  },

  // Get all raw items with pagination
  getRawItems: async (
    page: number = 0,
    size: number = 10,
    status?: InventoryStatus,
    search?: string
  ): Promise<PaginatedResult<RawItem>> => {
    const response = await apiClient.get('/api/v1/raw-item', {
      params: {
        page,
        size,
        status: status || undefined,
        search: search || undefined,
      },
    });
    return response.data;
  },

  // Get raw item by ID
  getRawItemById: async (rawItemId: number): Promise<RawItem> => {
    const response = await apiClient.get(`/api/v1/raw-item/${rawItemId}`);
    return response.data;
  },

  // Update raw item
  updateRawItem: async (rawItemId: number, data: RawItemRequest): Promise<RawItem> => {
    const response = await apiClient.put(`/api/v1/raw-item/${rawItemId}`, data);
    return response.data;
  },

  // Delete raw item
  deleteRawItem: async (rawItemId: number): Promise<void> => {
    await apiClient.delete(`/api/v1/raw-item/${rawItemId}`);
  },

  // Update raw item status
  updateRawItemStatus: async (rawItemId: number, data: RawItemStatusRequest): Promise<RawItem> => {
    const response = await apiClient.patch(`/api/v1/raw-item/${rawItemId}/status`, data);
    return response.data;
  },
};

// Product API
export const productApi = {
  // Create product
  createProduct: async (data: ProductRequest): Promise<Product> => {
    const response = await apiClient.post('/api/v1/product', data);
    return response.data;
  },

  // Get all products
  getProducts: async (): Promise<Product[]> => {
    const response = await apiClient.get('/api/v1/product');
    return response.data;
  },

  // Get product by ID
  getProductById: async (productId: number): Promise<Product> => {
    const response = await apiClient.get(`/api/v1/product/${productId}`);
    return response.data;
  },
};

// Category API
export const categoryApi = {
  // Create category
  createCategory: async (data: CategoryRequest): Promise<Category> => {
    const response = await apiClient.post('/api/v1/category', data);
    return response.data;
  },

  // Get all categories
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get('/api/v1/category');
    return response.data;
  },

  // Get category by ID
  getCategoryById: async (categoryId: number): Promise<Category> => {
    const response = await apiClient.get(`/api/v1/category/${categoryId}`);
    return response.data;
  },
};
