import { apiClient } from './client';
import type {
  Subcontracting,
  SubOrderRequest,
  SubReturnRequest,
  PaginatedResult,
} from '../types';
import { SubcontractingStatus } from '../types';

export const subcontractingApi = {
  // Create new subcontracting order
  addSubcontracting: async (data: SubOrderRequest): Promise<Subcontracting> => {
    const response = await apiClient.post<Subcontracting>('/api/v1/subcontracting', data);
    return response.data;
  },

  // Get all subcontracting orders with pagination
  getSubcontractingList: async (params: {
    page?: number;
    size?: number;
    status?: SubcontractingStatus;
    search?: string;
  }): Promise<PaginatedResult<Subcontracting>> => {
    const response = await apiClient.get<PaginatedResult<Subcontracting>>('/api/v1/subcontracting', {
      params,
    });
    return response.data;
  },

  // Get subcontracting order by ID
  getSubcontractingById: async (id: number): Promise<Subcontracting> => {
    const response = await apiClient.get<Subcontracting>(`/api/v1/subcontracting/${id}`);
    return response.data;
  },

  // Update subcontracting order
  updateSubcontracting: async (id: number, data: SubOrderRequest): Promise<Subcontracting> => {
    const response = await apiClient.put<Subcontracting>(`/api/v1/subcontracting/${id}`, data);
    return response.data;
  },

  // Delete subcontracting order
  deleteSubcontracting: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/subcontracting/${id}`);
  },

  // Return subcontracting record
  returnSubcontracting: async (id: number, data: SubReturnRequest): Promise<Subcontracting> => {
    const response = await apiClient.post<Subcontracting>(
      `/api/v1/subcontracting/${id}/return`,
      data
    );
    return response.data;
  },

  // Update subcontracting status
  updateSubcontractingStatus: async (id: number, status: SubcontractingStatus): Promise<void> => {
    await apiClient.patch(`/api/v1/subcontracting/${id}/status`, { status });
  },
};
