import { request } from '@/api/client';

export const saveWeek = (payload) => request('POST', '/api/weekly/save', payload);
export const submitAssignment = (id, body) => request('POST', `/api/weekly/assignments/${id}/submit`, body);
export const approveAssignment = (id) => request('POST', `/api/weekly/assignments/${id}/approve`, {});
export const rejectAssignment = (id, note) => request('POST', `/api/weekly/assignments/${id}/reject`, { note });
