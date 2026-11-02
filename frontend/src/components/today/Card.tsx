import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { cx, vars } from '@/utils/cx';

interface CardProps {
  /** Its place in the page's entrance: card i starts i × 65 ms after the first. */
  i: number;
  /** Desktop width in the 12-column grid, e.g. "span-7". */
  span: string;
  tone?: 'glass' | 'night';
  className?: string;
  id?: string;
  labelledBy?: string;
  children: ReactNode;
}

/** A card on Today: a glass panel (or the one dark glass hero) that enters with the page. */
export function Card({ i, span, tone = 'glass', className, id, labelledBy, children }: CardProps) {
  return (
    <article id={id} aria-labelledby={labelledBy} className={cx('card', tone, 'e-card', span, className)} style={vars({ '--i': i })}>
      {children}
    </article>
  );
}

/**
 * When card i's parts start on a page's first open (handoff <motion>): with d = 120 ms + i × 65 ms, number reels start
 * at d + 50 ms and count-ups at d + 150 ms. Rows, chips, bars and lines are timed in CSS.
 */
export function timing(i: number) {
  const d = 120 + i * 65;
  return { reel: d + 50, count: d + 150 };
}

/** Errors in plain language, with a Retry button. */
export function CardError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="card-error">
      <p>Couldn&apos;t load {what}. Check your connection and try again.</p>
      <Button variant="secondary" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
