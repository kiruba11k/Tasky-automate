import { createEntity, request } from '@/api/client';

export const User = {
  ...createEntity('User'),
  me: () => request('GET', '/api/auth/me'),
  updateMyUserData: (data) => request('PATCH', '/api/auth/me', data),
};
