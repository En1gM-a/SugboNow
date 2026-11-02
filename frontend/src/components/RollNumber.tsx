import { useLayoutEffect, useRef } from 'react';
import { useDisplay } from '@/lib/display';
import { useEntrance } from '@/lib/entrance';
import { cx } from '@/utils/cx';

const DIGITS = Array.from({ length: 20 }, (_, i) => <span key={i}>{i % 10}</span>);

interface RollNumberProps {
  /** The text to show, e.g. "6:43" or "25". Only the digits roll. */
  value: string;
  /** When the first column starts rolling, in ms after the page's entrance starts. */
  delay?: number;
  className?: string;
}

/**
 * Number reels (handoff: RollNumber; sample: wheelTo). Each digit is a 1em window over a strip of 0–9 twice. On a page's
 * first open every digit starts at 0 and makes one full turn before stopping on its value: column n takes
 * 900 ms + n × 100 ms and starts n × 70 ms late, so the last digit lands last. Later changes roll straight from the old
 * digit to the new one (600 ms). Screen readers get one copy of the real value; the strips are hidden from them.
 */
export function RollNumber({ value, delay = 0, className }: RollNumberProps) {
  const { mode, start } = useEntrance();
  const { still } = useDisplay();
  const shape = value.replace(/\d/g, '0');
  const strips = useRef<Array<HTMLSpanElement | null>>([]);
  const shown = useRef<{ shape: string; digits: number[] } | null>(null);

  let column = 0;
  const chars = [...value].map((ch) => ({ ch, column: /\d/.test(ch) ? column++ : -1 }));
  strips.current.length = column;

  useLayoutEffect(() => {
    const els = strips.current.filter((el): el is HTMLSpanElement => el !== null);
    const digits = [...value].filter((ch) => /\d/.test(ch)).map(Number);
    const place = (el: HTMLSpanElement, position: number, transition: string) => {
      el.style.transition = transition;
      el.style.transform = `translateY(${-position}em)`;
    };
    const prev = shown.current;

    if (still) {
      els.forEach((el, i) => place(el, 10 + digits[i], 'none'));
      shown.current = { shape, digits };
      return;
    }
    // A live change with the same layout: roll straight from the old digit to the new one.
    if (prev && prev.shape === shape) {
      els.forEach((el, i) => {
        if (prev.digits[i] !== digits[i]) place(el, 10 + digits[i], 'transform 600ms var(--ease-settle)');
      });
      shown.current = { shape, digits };
      return;
    }
    if (mode !== 'first') {
      els.forEach((el, i) => place(el, 10 + digits[i], 'none'));
      shown.current = { shape, digits };
      return;
    }
    // First open: start at 0 and make one full turn once the page's entrance has started.
    els.forEach((el) => place(el, 0, 'none'));
    if (start === null) return;
    void els[0]?.offsetHeight;
    const wait = Math.max(0, start + delay - performance.now());
    els.forEach((el, i) => place(el, 10 + digits[i], `transform ${900 + i * 100}ms var(--ease-settle) ${wait + i * 70}ms`));
    shown.current = { shape, digits };
  }, [value, shape, mode, start, still, delay]);

  return (
    <span className={cx('reel', className)}>
      <span className="sr-only">{value}</span>
      <span className="reel-row" aria-hidden="true">
        {chars.map(({ ch, column: col }, i) =>
          col >= 0 ? (
            <span key={`${shape}-${i}`} className="reel-d">
              <span
                className="reel-s"
                ref={(el) => {
                  strips.current[col] = el;
                }}
              >
                {DIGITS}
              </span>
            </span>
          ) : (
            <span key={`${shape}-${i}`} className="reel-c">
              {ch}
            </span>
          ),
        )}
      </span>
    </span>
  );
}
