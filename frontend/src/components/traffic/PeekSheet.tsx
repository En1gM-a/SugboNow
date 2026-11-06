import { useIsPresent } from 'motion/react';
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/utils/cx';

/**
 * The phone's sheet on map pages (handoff <pages>, Traffic): it peeks at about 35% of the screen over the map and expands
 * to full height. It isn't a modal, so the map stays usable behind it. It lives outside the page, because a page's exit
 * animation would otherwise turn its fixed position into a position inside the page.
 */
export function PeekSheet({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const present = useIsPresent();

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  }

  return createPortal(
    <section className={cx('peek-sheet glass', open && 'is-open', !present && 'is-leaving')} aria-label={label} onKeyDown={onKeyDown}>
      <button type="button" className="sheet-handle" aria-expanded={open} aria-label={open ? 'Collapse the list' : 'Expand the list'} onClick={() => setOpen((o) => !o)}>
        <span />
      </button>
      <div className="peek-body" data-scroll>
        {children}
      </div>
    </section>,
    document.body,
  );
}
