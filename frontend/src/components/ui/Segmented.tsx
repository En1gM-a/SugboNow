import { useEffect, type KeyboardEvent } from 'react';
import { useStretchyPill } from '@/hooks/useStretchyPill';
import { useDisplay } from '@/lib/display';
import { cx } from '@/utils/cx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  /** What the control chooses, for screen readers. */
  label: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** "tab" when it switches between panels: pass panelId, and give each panel id `${panelId}-${value}`. */
  kind?: 'radio' | 'tab';
  panelId?: string;
  className?: string;
}

/**
 * A segmented control with the stretchy mango pill. It scrolls sideways when it doesn't fit, and the keyboard follows
 * the radio or tab pattern: one tab stop, and the arrow keys move the selection.
 */
export function Segmented<T extends string>({ label, options, value, onChange, kind = 'radio', panelId, className }: SegmentedProps<T>) {
  const index = options.findIndex((o) => o.value === value);
  const { box, pill } = useStretchyPill('x', index, 999);
  const { still } = useDisplay();
  const isTabs = kind === 'tab';

  // Keep the selected one in view when the row scrolls sideways.
  useEffect(() => {
    const track = box.current;
    const scroller = track?.parentElement;
    const tab = track?.querySelectorAll<HTMLElement>('[data-tab]')[index];
    if (!scroller || !tab || scroller.scrollWidth <= scroller.clientWidth) return;
    scroller.scrollTo({ left: tab.offsetLeft - (scroller.clientWidth - tab.offsetWidth) / 2, behavior: still ? 'auto' : 'smooth' });
  }, [box, index, still]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const last = options.length - 1;
    const from = Math.max(0, index);
    let to = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = from === last ? 0 : from + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = from === 0 ? last : from - 1;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = last;
    if (to < 0) return;
    e.preventDefault();
    onChange(options[to].value);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-tab]')[to]?.focus();
  }

  return (
    <div className={cx('segment', className)}>
      <div className="segment-track" ref={box} role={isTabs ? 'tablist' : 'radiogroup'} aria-label={label} onKeyDown={onKeyDown}>
        <span className="segment-pill" ref={pill} aria-hidden="true" />
        {options.map((option, i) => {
          const selected = i === index;
          return (
            <button
              key={option.value}
              type="button"
              data-tab
              role={isTabs ? 'tab' : 'radio'}
              aria-checked={isTabs ? undefined : selected}
              aria-selected={isTabs ? selected : undefined}
              aria-controls={isTabs && panelId ? `${panelId}-${option.value}` : undefined}
              id={isTabs && panelId ? `${panelId}-tab-${option.value}` : undefined}
              tabIndex={selected || (index < 0 && i === 0) ? 0 : -1}
              className="segment-btn"
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
