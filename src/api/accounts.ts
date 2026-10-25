import { apiClient } from './client';
import type {
  PartyAccount,
  PartyAccountSummary,
  PaymentFloor,
  PaymentReceipt,
  PaymentReceiptRequest,
} from '../types';

const floorParam = (floor?: PaymentFloor | '') => (floor ? { floor } : {});

/** The server's own message for a failed request, which is written for the person using the app. */
export const errorMessage = (err: unknown, fallback: string): string => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' && data.message) {
    return data.message;
  }
  return fallback;
};

const savePdf = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/** A statement period: blank start means from the beginning, blank end means today. */
export interface StatementPeriod {
  startDate?: string;
  endDate?: string;
}

const periodParams = ({ startDate, endDate }: StatementPeriod, today: string) => ({
  startDate: startDate || '2000-01-01',
  endDate: endDate || today,
});

export const accountsApi = {
  /** Every party's balance on a floor (floor staff always get their own). */
  getAccounts: (floor?: PaymentFloor | ''): Promise<PartyAccountSummary[]> =>
    apiClient.get('/api/v1/payments/accounts', { params: floorParam(floor) }).then((r) => r.data),

  /** One party's balance, orders and payment history. */
  getAccount: (partyId: number, floor?: PaymentFloor | ''): Promise<PartyAccount> =>
    apiClient.get(`/api/v1/payments/accounts/${partyId}`, { params: floorParam(floor) }).then((r) => r.data),

  recordReceipt: (partyId: number, body: PaymentReceiptRequest): Promise<PaymentReceipt> =>
    apiClient.post(`/api/v1/payments/accounts/${partyId}/receipts`, body).then((r) => r.data),

  /** Owner only */
  deleteReceipt: (receiptId: number): Promise<void> =>
    apiClient.delete(`/api/v1/payments/receipts/${receiptId}`).then(() => undefined),

  /** Owner only */
  setOpeningBalance: (partyId: number, official: number, offline: number): Promise<void> =>
    apiClient.put(`/api/v1/payments/accounts/${partyId}/opening-balance`, { official, offline }).then(() => undefined),

  downloadPartyStatement: async (
    partyId: number,
    partyName: string,
    period: StatementPeriod,
    today: string,
    floor?: PaymentFloor | '',
  ): Promise<void> => {
    const response = await apiClient.get(`/api/v1/payments/party-ledger/${partyId}/pdf`, {
      params: { ...periodParams(period, today), ...floorParam(floor) },
      responseType: 'blob',
    });
    savePdf(response.data, `statement-${partyName.replace(/[^\w-]+/g, '_')}.pdf`);
  },

  downloadAllStatements: async (
    period: StatementPeriod,
    today: string,
    floor?: PaymentFloor | '',
    onlyDue?: boolean,
  ): Promise<void> => {
    const response = await apiClient.get('/api/v1/payments/accounts/statement/pdf', {
      params: { ...periodParams(period, today), ...floorParam(floor), ...(onlyDue ? { onlyDue: true } : {}) },
      responseType: 'blob',
    });
    savePdf(response.data, `party-statements-${period.endDate || today}.pdf`);
  },
};
