import { apiClient } from './client';

export interface StockHistoryRow {
  id: number;
  stockItemId: number | null;
  productName: string | null;
  floor: string | null;
  action: string;
  note: string | null;
  kgBefore: number | null;
  kgAfter: number | null;
  pcBefore: number | null;
  pcAfter: number | null;
  changedBy: string | null;
  /** Local (India) date and time of the change, e.g. 2026-11-25T16:05:00 */
  createdAt: string | null;
}

export interface StockHistoryPage {
  data: StockHistoryRow[];
  totalElements: number;
  page: number;
  size: number;
}

export const stockHistoryApi = {
  getHistory: (params: {
    itemId?: number;
    floor?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<StockHistoryPage> =>
    apiClient.get<StockHistoryPage>('/api/v1/stock-history', { params }).then((r) => r.data),
};
