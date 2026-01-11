import { apiClient } from './client';
import type {
  Invoice,
  PaginatedResult,
} from '../types';
import { InvoiceStatus, InvoiceFloor } from '../types';

export const invoiceApi = {
  // Get all invoices by floor with pagination
  getInvoiceList: async (params: {
    floor: InvoiceFloor;
    page?: number;
    size?: number;
    status?: InvoiceStatus;
    search?: string;
  }): Promise<PaginatedResult<Invoice>> => {
    const { floor, ...queryParams } = params;
    const response = await apiClient.get<PaginatedResult<Invoice>>(`/api/v1/invoices/floor/${floor}`, {
      params: queryParams,
    });
    return response.data;
  },

  // Get invoice by ID
  getInvoiceById: async (id: number): Promise<Invoice> => {
    const response = await apiClient.get<Invoice>(`/api/v1/invoices/${id}`);
    return response.data;
  },

  // Delete invoice
  deleteInvoice: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/invoices/${id}`);
  },

  // Update invoice status
  updateInvoiceStatus: async (id: number, invoiceStatus: InvoiceStatus): Promise<void> => {
    await apiClient.patch(`/api/v1/invoices/${id}/status`, { invoiceStatus });
  },

  // Download invoice PDF
  downloadInvoicePdf: async (id: number): Promise<Blob> => {
    const response = await apiClient.get(`/api/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
