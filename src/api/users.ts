import { userManagementApi as generatedUserApi, promisify } from '../lib/apiConfig';
import type { User, UserGroup, PaginatedResult } from '../types';

export const usersApi = {
  getUsers: (search?: string): Promise<PaginatedResult<User>> =>
    promisify<PaginatedResult<User>>(cb =>
      generatedUserApi.getAllUsers({ page: 0, size: 200, search: search || undefined }, cb)
    ),

  createUser: (email: string, password: string, userGroup: UserGroup): Promise<User> =>
    promisify<User>(cb => generatedUserApi.registerUser({ email, password, userGroup }, cb)),

  changeRole: (id: number, userGroup: UserGroup): Promise<User> =>
    promisify<User>(cb => generatedUserApi.updateUserGroup(id, { userGroup }, cb)),

  resetPassword: (id: number, password: string): Promise<void> =>
    promisify<void>(cb => generatedUserApi.resetUserPassword(id, { password }, cb)),

  setEnabled: (id: number, enabled: boolean): Promise<User> =>
    promisify<User>(cb => generatedUserApi.setUserEnabled(id, { enabled }, cb)),

  deleteUser: (id: number): Promise<void> =>
    promisify<void>(cb => generatedUserApi.deleteUser(id, cb)),
};

/** The server's reason for refusing a change, e.g. "Only an Owner can delete an Owner account". */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { body?: { message?: string } } } | undefined;
  return e?.response?.body?.message || fallback;
}
