import {
  rejectionApi as generatedRejectionApi,
  promisify,
} from '../lib/apiConfig';
import { apiClient } from './client';
import { purchasePartyApi } from './purchaseParty';
import { partyApi } from './party';
import type {
  RejectionRequest,
  RejectionResponse,
  PaginatedResultRejection,
  RejectionReturnType,
  RejectionPartyType,
} from '../types';

/** A party selectable in Rejection — from either the Purchase or the Sales party master. */
export interface RejectionPartyOption {
  key: string; // `${partyType}:${id}` — unique across both masters
  id: number;
  name: string;
  partyType: RejectionPartyType;
}

export const rejectionPartyKey = (partyType: RejectionPartyType, id: number) => `${partyType}:${id}`;

/**
 * Loads purchase and sales parties together. If one list fails the other is still returned;
 * it only rejects when both fail.
 */
export const getRejectionPartyOptions = async (): Promise<RejectionPartyOption[]> => {
  const [purchase, sales] = await Promise.allSettled([
    purchasePartyApi.getAll(),
    partyApi.getAllParties(),
  ]);
  if (purchase.status === 'rejected' && sales.status === 'rejected') {
    throw purchase.reason;
  }
  const byName = (a: RejectionPartyOption, b: RejectionPartyOption) => a.name.localeCompare(b.name);
  const purchaseOptions: RejectionPartyOption[] = purchase.status === 'fulfilled'
    ? purchase.value.map(p => ({ key: rejectionPartyKey('PURCHASE', p.id), id: p.id, name: p.name, partyType: 'PURCHASE' as const }))
    : [];
  const salesOptions: RejectionPartyOption[] = sales.status === 'fulfilled'
    ? sales.value.map(p => ({ key: rejectionPartyKey('SALES', p.partyId), id: p.partyId, name: p.name, partyType: 'SALES' as const }))
    : [];
  return [...purchaseOptions.sort(byName), ...salesOptions.sort(byName)];
};

export const rejectionApi = {
  createRejection: (data: RejectionRequest): Promise<RejectionResponse> =>
    promisify<RejectionResponse>(cb => generatedRejectionApi.addRejection(data, cb)),

  getRejections: (
    page: number = 0,
    size: number = 10,
    returnType?: RejectionReturnType
  ): Promise<PaginatedResultRejection> =>
    promisify<PaginatedResultRejection>(cb =>
      generatedRejectionApi.getRejectionList({ page, size, returnType }, cb)
    ),

  getRejectionById: (rejectionId: number): Promise<RejectionResponse> =>
    promisify<RejectionResponse>(cb =>
      generatedRejectionApi.getRejectionById(rejectionId, cb)
    ),

  updateRejection: (rejectionId: number, data: RejectionRequest): Promise<RejectionResponse> =>
    promisify<RejectionResponse>(cb =>
      generatedRejectionApi.updateRejection(rejectionId, data, cb)
    ),

  deleteRejection: (rejectionId: number): Promise<void> =>
    promisify<void>(cb => generatedRejectionApi.deleteRejection(rejectionId, cb)),

  exportPdf: async (opts?: {
    partyId?: number;
    partyType?: RejectionPartyType;
    fromDate?: string;
    toDate?: string;
  }): Promise<void> => {
    const params: Record<string, any> = {};
    if (opts?.partyId) params.partyId = opts.partyId;
    if (opts?.partyId && opts?.partyType) params.partyType = opts.partyType;
    if (opts?.fromDate) params.fromDate = opts.fromDate;
    if (opts?.toDate) params.toDate = opts.toDate;
    const response = await apiClient.get('/api/v1/rejection/export/pdf', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rejection-report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
