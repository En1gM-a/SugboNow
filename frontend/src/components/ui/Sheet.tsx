import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * A bottom sheet for phones (handoff <motion>): a glass panel that slides up on the shared spring and leaves with a
 * 150 ms fade. Close it with its handle, the backdrop or Esc. A native <dialog> traps focus and returns it to what
 * opened the sheet. The backdrop is a solid dim, never a blur.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  return <AnimatePresence>{open && <SheetPanel onClose={onClose} title={title}>{children}</SheetPanel>}</AnimatePresence>;
}

function SheetPanel({ onClose, title, children }: Omit<SheetProps, 'open'>) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <m.dialog
      ref={ref}
      className="sheet glass"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the dialog itself, not its contents, is a click on the backdrop.
        if (e.target === ref.current) onClose();
      }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', visualDuration: 0.3, bounce: 0 }}
    >
      <div className="sheet-inner">
        <button type="button" className="sheet-handle" aria-label="Close" onClick={onClose}>
          <span />
        </button>
        <h2 id={titleId} className="sheet-title">
          {title}
        </h2>
        <div className="sheet-body">{children}</div>
      </div>
    </m.dialog>
  );
}
