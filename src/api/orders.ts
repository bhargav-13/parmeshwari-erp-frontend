import { ordersApi as generatedOrdersApi, promisify } from '../lib/apiConfig';
import type { Order, OrderRequest, OrderStatus, OrderFloor, PaginatedResult, DispatchRequest } from '../types';

export const ordersApi = {
  createOrder: (payload: OrderRequest): Promise<Order> =>
    promisify<Order>(cb => generatedOrdersApi.createOrder(payload, cb)),

  getOrderList: (params: {
    floor: OrderFloor;
    page?: number;
    size?: number;
    status?: OrderStatus | '';
    search?: string;
  }): Promise<PaginatedResult<Order>> => {
    const { floor, page, size, status, search } = params;
    return promisify<PaginatedResult<Order>>(cb =>
      generatedOrdersApi.getOrderList(
        floor,
        { page, size, status: status || undefined, search },
        cb
      )
    );
  },

  getOrderById: (orderId: number): Promise<Order> =>
    promisify<Order>(cb => generatedOrdersApi.getOrderById(orderId, cb)),

  updateOrder: (orderId: number, payload: OrderRequest): Promise<Order> =>
    promisify<Order>(cb => generatedOrdersApi.updateOrder(orderId, payload, cb)),

  deleteOrder: (orderId: number): Promise<void> =>
    promisify<void>(cb => generatedOrdersApi.deleteOrder(orderId, cb)),

  updateOrderStatus: (orderId: number, status: OrderStatus): Promise<void> =>
    promisify<void>(cb => generatedOrdersApi.updateOrderStatus(orderId, { orderStatus: status }, cb)),

  dispatchOrder: (orderId: number, payload: DispatchRequest): Promise<Order> =>
    promisify<Order>(cb => generatedOrdersApi.dispatchOrder(orderId, payload, cb)),
};
