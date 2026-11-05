// A small toast store, so hooks (like the rollback after a failed optimistic update) can show toasts without React
// context. <Toaster> renders them at the app root.

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  action?: ToastAction;
}

/** Time left after the pointer or focus leaves a paused toast. */
const RESUME_MS = 2500;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, number>();

const emit = () => listeners.forEach((listener) => listener());

export const getToasts = () => items;

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function schedule(id: number, ms: number) {
  window.clearTimeout(timers.get(id));
  timers.set(id, window.setTimeout(() => dismissToast(id), ms));
}

export function dismissToast(id: number) {
  window.clearTimeout(timers.get(id));
  timers.delete(id);
  items = items.filter((t) => t.id !== id);
  emit();
}

/** Reading or reaching for a toast pauses its timer. */
export function holdToast(id: number) {
  window.clearTimeout(timers.get(id));
  timers.delete(id);
}

export function releaseToast(id: number) {
  if (items.some((t) => t.id === id)) schedule(id, RESUME_MS);
}

function show(tone: ToastTone, message: string, action?: ToastAction, ms = 5000) {
  const id = nextId++;
  // At most three at once: the oldest goes first.
  items.slice(0, -2).forEach((t) => holdToast(t.id));
  items = [...items.slice(-2), { id, tone, message, action }];
  emit();
  schedule(id, ms);
  return id;
}

export const toast = {
  info: (message: string, action?: ToastAction) => show('info', message, action),
  success: (message: string, action?: ToastAction) => show('success', message, action),
  error: (message: string, action?: ToastAction) => show('error', message, action, 7000),
};
