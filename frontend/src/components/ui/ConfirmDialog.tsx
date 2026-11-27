import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** The confirm button stays busy until this settles, then the dialog closes. It handles its own errors. */
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/**
 * A question to answer before something happens. Use it only where an undo toast can't work, such as signing out.
 * A native <dialog> traps focus. Cancel is first, so it has the focus: Enter, Esc and the backdrop all keep things as they are.
 */
export function ConfirmDialog({ open, ...props }: ConfirmDialogProps) {
  return open ? <ConfirmPanel {...props} /> : null;
}

function ConfirmPanel({
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: Omit<ConfirmDialogProps, 'open'>) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const textId = useId();
  const [busy, setBusy] = useState(false);

  // A layout effect closes it while it's still in the page, so the browser can return focus to what opened it.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  const cancel = () => {
    if (!busy) onClose();
  };

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      onClose();
    }
  }

  return (
    <dialog
      ref={ref}
      className="confirm"
      aria-labelledby={titleId}
      aria-describedby={textId}
      onCancel={(e) => {
        e.preventDefault();
        cancel();
      }}
      onClose={() => {
        // Some browsers close on a second Esc even after preventDefault. Ignore the close that a remount causes.
        if (!ref.current?.open) onClose();
      }}
      onClick={(e) => {
        // A click on the dialog itself, not its contents, is a click on the backdrop.
        if (e.target === ref.current) cancel();
      }}
    >
      <div className="confirm-inner">
        <h2 id={titleId} className="confirm-title">
          {title}
        </h2>
        <p id={textId} className="muted">
          {children}
        </p>
        <div className="confirm-actions">
          <Button variant="secondary" onClick={cancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button busy={busy} onClick={() => void confirm()}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
