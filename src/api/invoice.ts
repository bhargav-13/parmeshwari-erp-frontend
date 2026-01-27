import { invoicesApi as generatedInvoicesApi, promisify } from '../lib/apiConfig';
import type {
  Invoice,
  PaginatedResult,
  BillingType,
} from '../types';
import { InvoiceStatus, InvoiceFloor } from '../types';

export const invoiceApi = {
  // Get all invoices by floor with pagination
  getInvoiceList: (params: {
    floor: InvoiceFloor;
    mode: BillingType;
    page?: number;
    size?: number;
    status?: InvoiceStatus;
    search?: string;
  }): Promise<PaginatedResult<Invoice>> => {
    const { floor, mode, page, size, status, search } = params;
    return promisify<PaginatedResult<Invoice>>(cb =>
      generatedInvoicesApi.getInvoiceList(
        floor,
        mode,
        { page, size, status, search },
        cb
      )
    );
  },

  // Get invoice by ID
  getInvoiceById: (id: number): Promise<Invoice> =>
    promisify<Invoice>(cb => generatedInvoicesApi.getInvoiceById(id, cb)),

  // Delete invoice
  deleteInvoice: (id: number): Promise<void> =>
    promisify<void>(cb => generatedInvoicesApi.deleteInvoice(id, cb)),

  // Update invoice status
  updateInvoiceStatus: (id: number, invoiceStatus: InvoiceStatus): Promise<void> =>
    promisify<void>(cb => generatedInvoicesApi.updateInvoiceStatus(id, { invoiceStatus }, cb)),

  // Download invoice PDF
  downloadInvoicePdf: async (id: number): Promise<Blob> => {
    // Note: PDF download might need special handling - keeping as-is for now
    // This may need to be implemented differently depending on the generated API
    return promisify<Blob>(cb => generatedInvoicesApi.downloadInvoicePdf(id, cb));
  },
};
