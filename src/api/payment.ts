import { paymentsApi as generatedPaymentsApi, promisify } from '../lib/apiConfig';
import type {
  Payment,
  PaginatedResult,
  PaymentReceiveRequest,
  BillingType,
} from '../types';
import { PaymentStatus, PaymentFloor } from '../types';

export const paymentApi = {
  // Get all payments by floor with pagination
  getPaymentList: (params: {
    floor: PaymentFloor;
    mode: BillingType;
    page?: number;
    size?: number;
    status?: PaymentStatus;
    search?: string;
  }): Promise<PaginatedResult<Payment>> => {
    const { floor, mode, page, size, status, search } = params;
    return promisify<PaginatedResult<Payment>>(cb =>
      generatedPaymentsApi.getPaymentsByFloor(
        floor,
        mode,
        { page, size, status, search },
        cb
      )
    );
  },

  // Get payment by ID
  getPaymentById: (id: number): Promise<Payment> =>
    promisify<Payment>(cb => generatedPaymentsApi.getPaymentById(id, cb)),

  // Delete payment
  deletePayment: (id: number): Promise<void> =>
    promisify<void>(cb => generatedPaymentsApi.deletePayment(id, cb)),

  // Update payment status
  updatePaymentStatus: (id: number, paymentStatus: PaymentStatus): Promise<Payment> =>
    promisify<Payment>(cb => generatedPaymentsApi.updatePaymentStatus(id, { paymentStatus }, cb)),

  // Receive payment (record new payment)
  receivePayment: (id: number, data: PaymentReceiveRequest): Promise<Payment> =>
    promisify<Payment>(cb => generatedPaymentsApi.receivePayment(id, data, cb)),

  // Send manual reminder
  sendReminder: (id: number): Promise<void> =>
    promisify<void>(cb => generatedPaymentsApi.sendManualReminder(id, cb)),
};
