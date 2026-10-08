import { request } from '@/api/client';
import { emitFun } from '@/fun/bus';

const run = async (action, fn, extra) => {
  emitFun({ type: 'busy', on: true });
  try {
    const res = await fn();
    emitFun({ type: 'weekly', action, ...extra(res) });
    return res;
  } catch (e) {
    emitFun({ type: 'error', message: e.message });
    throw e;
  } finally {
    emitFun({ type: 'busy', on: false });
  }
};

export const saveWeek = (payload) => run('save', () => request('POST', '/api/weekly/save', payload), (res) => ({ count: res.changes }));
export const submitAssignment = (id, body) => run('submit', () => request('POST', `/api/weekly/assignments/${id}/submit`, body), () => ({}));
export const approveAssignment = (id) => run('approve', () => request('POST', `/api/weekly/assignments/${id}/approve`, {}), () => ({}));
export const rejectAssignment = (id, note) => run('reject', () => request('POST', `/api/weekly/assignments/${id}/reject`, { note }), () => ({}));
