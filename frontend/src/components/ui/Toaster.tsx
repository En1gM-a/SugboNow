import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useSyncExternalStore } from 'react';
import { Icon } from '@/components/icons/Icon';
import { dismissToast, getToasts, holdToast, releaseToast, subscribeToasts } from '@/lib/toast';

/** Toasts: glass panels that rise 16px on the shared spring and leave with a 150 ms fade (handoff <motion>). */
export function Toaster() {
  const items = useSyncExternalStore(subscribeToasts, getToasts);
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <m.div
            key={t.id}
            className="toast glass"
            role={t.tone === 'error' ? 'alert' : undefined}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', visualDuration: 0.3, bounce: 0 }}
            onPointerEnter={() => holdToast(t.id)}
            onPointerLeave={() => releaseToast(t.id)}
            onFocus={() => holdToast(t.id)}
            onBlur={() => releaseToast(t.id)}
          >
            <span className="toast-text">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="btn btn-quiet toast-action"
                onClick={() => {
                  t.action?.onClick();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>
              <Icon name="x" />
            </button>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
