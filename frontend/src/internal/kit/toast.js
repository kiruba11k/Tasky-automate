import { create } from 'zustand';

/** Toast queue store (original: `Mh`). Keeps the 4 most recent toasts. */
export const useToastStore = create((set) => ({
  toasts: [],
  push: (toast) => set((state) => ({ toasts: [...state.toasts, toast].slice(-4) })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

let counter = 0;

/**
 * Shows a toast (original: `Ye`). Returns the toast id.
 * @param {{ title: string, description?: string, tone?: 'success'|'info'|'celebrate', emoji?: string, durationMs?: number }} options
 */
export function toast(options) {
  counter += 1;
  const id = `toast-${Date.now()}-${counter}`;
  useToastStore.getState().push({
    id,
    title: options.title,
    description: options.description,
    tone: options.tone ?? 'success',
    emoji: options.emoji ?? (options.tone === 'celebrate' ? '🎉' : undefined),
    durationMs: options.durationMs ?? 4000,
  });
  return id;
}

export default toast;
