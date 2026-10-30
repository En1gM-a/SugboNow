// A tiny toast store, so hooks (e.g. optimistic-update rollbacks) can show toasts
// without needing React context. <Toaster> renders them.

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  action?: { label: string; onClick: () => void };
  leaving?: boolean;
}

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

/** Time left after the pointer or focus leaves a paused toast. */
const RESUME_MS = 2500;

function emit() {
  for (const l of listeners) l(items);
}

function schedule(id: number, ms: number) {
  clearTimeout(timers.get(id));
  timers.set(id, setTimeout(() => dismissToast(id), ms));
}

export function subscribeToasts(l: Listener): () => void {
  listeners.add(l);
  l(items);
  return () => listeners.delete(l);
}

export function dismissToast(id: number) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  items = items.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  // Matches the 150 ms leave animation.
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 150);
}

/** Pauses auto-dismiss while the toast is hovered or focused. */
export function holdToast(id: number) {
  clearTimeout(timers.get(id));
  timers.delete(id);
}

export function releaseToast(id: number) {
  if (items.some((t) => t.id === id && !t.leaving)) schedule(id, RESUME_MS);
}

export function showToast(message: string, tone: ToastTone = 'info', action?: ToastItem['action'], ms = 5000): number {
  const id = nextId++;
  const dropped = items.slice(0, -2);
  for (const t of dropped) holdToast(t.id);
  items = [...items.slice(-2), { id, tone, message, action }];
  emit();
  schedule(id, ms);
  return id;
}

export const toast = {
  info: (m: string, action?: ToastItem['action']) => showToast(m, 'info', action),
  success: (m: string, action?: ToastItem['action']) => showToast(m, 'success', action),
  error: (m: string, action?: ToastItem['action']) => showToast(m, 'error', action, 7000),
};
