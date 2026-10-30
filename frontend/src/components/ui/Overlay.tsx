// Toasts and the bottom sheet / dialog. CSS handles enter (spring-like ease-out) and the 150 ms leave fade.

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { dismissToast, holdToast, releaseToast, subscribeToasts, type ToastItem } from '@/lib/toast';
import { cx } from '@/utils/cx';
import { Icon } from './Icon';

const TOAST_ICON = { info: 'info', success: 'checkCircle', error: 'alert' } as const;

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setItems), []);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          // Reading or reaching for a toast pauses its timer.
          onPointerEnter={() => holdToast(t.id)}
          onPointerLeave={() => releaseToast(t.id)}
          onFocus={() => holdToast(t.id)}
          onBlur={() => releaseToast(t.id)}
          className={cx(
            'pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl bg-mactan-navy py-2 pr-2 pl-4 text-sm text-white shadow-raised dark:ring-1 dark:ring-white/15',
            t.leaving ? 'opacity-0 transition-opacity duration-150 ease-in' : 'animate-toast-in motion-reduce:animate-fade-in',
          )}
        >
          <Icon
            name={TOAST_ICON[t.tone]}
            size={18}
            className={t.tone === 'error' ? 'text-[#fca5a5]' : t.tone === 'success' ? 'text-[#86efac]' : 'text-marigold'}
          />
          <span className="flex-1 py-1.5">{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.onClick();
                dismissToast(t.id);
              }}
              className="min-h-11 rounded-lg px-3 font-semibold text-marigold transition-colors duration-150 hover:bg-white/10 focus-visible:outline-marigold"
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
            className="flex size-11 items-center justify-center rounded-lg text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-marigold"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Bottom sheet on phones, centered dialog on larger screens. Uses native <dialog> for focus trapping and Esc. */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setLeaving(false);
      d.showModal();
    } else if (!open && d.open) {
      setLeaving(true);
      const t = setTimeout(() => {
        d.close();
        setLeaving(false);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        'm-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-2xl bg-surface p-0 text-ink backdrop:bg-mactan-navy/60',
        'sm:m-auto sm:max-w-lg sm:rounded-2xl',
        leaving ? 'opacity-0 transition-opacity duration-150 ease-in' : 'open:animate-sheet-in motion-reduce:open:animate-fade-in',
      )}
    >
      {open || leaving ? (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 flex size-11 items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-stone-100 hover:text-ink"
            >
              <Icon name="x" size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </div>
      ) : null}
    </dialog>
  );
}
