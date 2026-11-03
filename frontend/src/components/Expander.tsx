import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import type { ReactNode } from 'react';

/** Small details that open in place (Motion height: "auto", 200 ms). The content mounts when it first opens. */
export function Expander({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <m.div
          key={id}
          id={id}
          className="expander"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}
