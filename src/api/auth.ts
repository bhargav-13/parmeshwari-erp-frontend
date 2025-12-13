import { apiClient } from './client';
import type { SignInRequest, AuthResponse, RefreshTokenRequest } from '../types';

export const authApi = {
  signIn: async (data: SignInRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/signin', data);
    return response.data;
  },

  refreshToken: async (data: RefreshTokenRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/refresh', data);
    return response.data;
  },
};
