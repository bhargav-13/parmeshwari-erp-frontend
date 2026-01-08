import { apiClient } from './client';
import type { Order, OrderRequest, OrderStatus, OrderFloor, PaginatedResult } from '../types';

export const ordersApi = {
  createOrder: async (payload: OrderRequest): Promise<Order> => {
    const response = await apiClient.post<Order>('/api/v1/orders', payload);
    return response.data;
  },

  getOrderList: async (params: {
    floor: OrderFloor;
    page?: number;
    size?: number;
    status?: OrderStatus | '';
    search?: string;
  }): Promise<PaginatedResult<Order>> => {
    const { floor, ...queryParams } = params;
    const response = await apiClient.get<PaginatedResult<Order>>(`/api/v1/orders/floor/${floor}`, {
      params: {
        ...queryParams,
        status: queryParams.status || undefined,
        search: queryParams.search || undefined,
      },
    });
    return response.data;
  },

  getOrderById: async (orderId: number): Promise<Order> => {
    const response = await apiClient.get<Order>(`/api/v1/orders/${orderId}`);
    return response.data;
  },

  updateOrder: async (orderId: number, payload: OrderRequest): Promise<Order> => {
    const response = await apiClient.put<Order>(`/api/v1/orders/${orderId}`, payload);
    return response.data;
  },

  deleteOrder: async (orderId: number): Promise<void> => {
    await apiClient.delete(`/api/v1/orders/${orderId}`);
  },

  updateOrderStatus: async (orderId: number, status: OrderStatus): Promise<void> => {
    await apiClient.patch(`/api/v1/orders/${orderId}/status`, { orderStatus: status });
  },
};
