import { createEntity, request } from '@/api/client';

export const User = {
  ...createEntity('User'),
  me: () => request('GET', '/api/auth/me'),
  updateMyUserData: (data) => request('PATCH', '/api/auth/me', data),
  /** Issues a fresh invitation (also resets the user's password). Returns { invite_token }. */
  invite: (id) => request('POST', `/api/users/${encodeURIComponent(id)}/invite`),
};
