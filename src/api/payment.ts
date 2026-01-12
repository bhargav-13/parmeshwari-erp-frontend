import { apiClient } from './client';
import type {
  Payment,
  PaginatedResult,
  PaymentReceiveRequest,
  BillingType,
} from '../types';
import { PaymentStatus, PaymentFloor } from '../types';

export const paymentApi = {
  // Get all payments by floor with pagination
  getPaymentList: async (params: {
    floor: PaymentFloor;
    mode: BillingType;
    page?: number;
    size?: number;
    status?: PaymentStatus;
    search?: string;
  }): Promise<PaginatedResult<Payment>> => {
    const { floor, mode, ...restParams } = params;
    const response = await apiClient.get<PaginatedResult<Payment>>(`/api/v1/payments/floor/${floor}/mode/${mode}`, {
      params: { mode, ...restParams },
    });
    return response.data;
  },

  // Get payment by ID
  getPaymentById: async (id: number): Promise<Payment> => {
    const response = await apiClient.get<Payment>(`/api/v1/payments/${id}`);
    return response.data;
  },

  // Delete payment
  deletePayment: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/payments/${id}`);
  },

  // Update payment status
  updatePaymentStatus: async (id: number, paymentStatus: PaymentStatus): Promise<Payment> => {
    const response = await apiClient.patch<Payment>(`/api/v1/payments/${id}/status`, { paymentStatus });
    return response.data;
  },

  // Receive payment (record new payment)
  receivePayment: async (id: number, data: PaymentReceiveRequest): Promise<Payment> => {
    const response = await apiClient.post<Payment>(`/api/v1/payments/${id}/receive`, data);
    return response.data;
  },

  // Send manual reminder
  sendReminder: async (id: number): Promise<void> => {
    await apiClient.post(`/api/v1/payments/${id}/reminder`);
  },
};
