// Inline form validation. Errors are derived in render by the caller; this hook decides which to show:
// a field's error appears once it is blurred (or after a submit attempt) and disappears as soon as it is fixed.
// A failed submit moves focus to the first invalid field, so screen readers announce its message.

import { useCallback, useRef, useState } from 'react';

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function useFormErrors<K extends string>(errors: FieldErrors<K>, order: readonly K[]) {
  const formRef = useRef<HTMLFormElement>(null);
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [attempted, setAttempted] = useState(false);

  const shown: FieldErrors<K> = {};
  for (const k of order) if (errors[k] && (attempted || touched[k])) shown[k] = errors[k];

  const blur = useCallback((k: K) => () => setTouched((t) => (t[k] ? t : { ...t, [k]: true })), []);

  /** Call first in onSubmit. Returns true when valid; otherwise shows every error and focuses the first. */
  function validate(): boolean {
    setAttempted(true);
    const first = order.find((k) => errors[k]);
    if (!first) return true;
    // Wait for React to paint aria-invalid and the message before focusing.
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"], [data-field="${first}"]`)?.focus();
    });
    return false;
  }

  return { formRef, shown, blur, validate };
}
