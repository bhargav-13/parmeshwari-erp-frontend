import {
  purchaseApiClient as generatedPurchaseApi,
  promisify,
} from '../lib/apiConfig';
import type {
  PurchaseRequest,
  PurchaseResponse,
  PaginatedResult,
} from '../types';

export const purchaseApi = {
  createPurchase: (data: PurchaseRequest): Promise<PurchaseResponse> =>
    promisify<PurchaseResponse>(cb => generatedPurchaseApi.addPurchase(data, cb)),

  getPurchases: (
    page: number = 0,
    size: number = 10,
    search?: string,
    direction?: string
  ): Promise<PaginatedResult<PurchaseResponse>> =>
    promisify<PaginatedResult<PurchaseResponse>>(cb =>
      generatedPurchaseApi.getPurchaseList({ page, size, search, direction }, cb)
    ),

  getPurchaseById: (purchaseId: number): Promise<PurchaseResponse> =>
    promisify<PurchaseResponse>(cb => generatedPurchaseApi.getPurchaseById(purchaseId, cb)),
};
