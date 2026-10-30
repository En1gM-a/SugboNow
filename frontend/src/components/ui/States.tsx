// Loading, empty, error and freshness states. Every tile and page uses these.

import type { ReactNode } from 'react';
import { useNow } from '@/hooks/useBrowser';
import { formatRelative } from '@/utils/format';
import { cx } from '@/utils/cx';
import { Button } from './Button';
import { Icon } from './Icon';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('rounded-lg bg-skeleton animate-pulse-soft', className)} />;
}

/** A few text lines shaped like the paragraph they stand in for. */
export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx('space-y-2.5', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cx('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/** Screen-reader text while a region loads. */
export function LoadingLabel({ children = 'Loading…' }: { children?: ReactNode }) {
  return (
    <span className="sr-only" role="status">
      {children}
    </span>
  );
}

/** Original abstract ribbon motif for empty states. */
function RibbonArt() {
  return (
    <svg viewBox="0 0 120 64" className="h-14 w-28" aria-hidden="true">
      <path d="M4 40 C 30 10, 50 60, 80 26 S 112 22, 116 14" fill="none" stroke="#C8102E" strokeWidth="5" strokeLinecap="round" />
      <path d="M4 50 C 34 24, 56 66, 86 38 S 112 34, 116 28" fill="none" stroke="#F5A623" strokeWidth="5" strokeLinecap="round" />
      <path d="M4 60 C 38 38, 62 70, 92 50 S 112 46, 116 42" fill="none" stroke="#0E7490" strokeWidth="5" strokeLinecap="round" />
      <circle cx="100" cy="10" r="4" fill="#15803D" />
    </svg>
  );
}

export function EmptyState({ title, children, action, compact }: { title: string; children?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={cx('flex flex-col items-center text-center', compact ? 'gap-2 py-4' : 'gap-3 py-8')}>
      <RibbonArt />
      <p className="font-heading text-base font-semibold text-ink">{title}</p>
      {children && <p className="max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'We couldn’t load this right now.', onRetry, compact }: { message?: string; onRetry?: () => void; compact?: boolean }) {
  return (
    <div role="alert" className={cx('flex flex-col items-center gap-3 text-center', compact ? 'py-3' : 'py-8')}>
      <span className="flex size-10 items-center justify-center rounded-full bg-status-high-soft text-status-high">
        <Icon name="alert" size={20} />
      </span>
      <p className="max-w-sm text-sm text-ink">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

/** "Updated 3 min ago": live data always says how fresh it is. */
export function UpdatedAgo({ at, refreshing, className }: { at: number | string | undefined; refreshing?: boolean; className?: string }) {
  const now = useNow();
  if (!at) return null;
  const label = formatRelative(at, now);
  return (
    <span className={cx('inline-flex items-center gap-1 text-xs text-muted tabular-nums', className)}>
      <Icon name="refresh" size={12} className={cx(refreshing && 'animate-spin motion-reduce:animate-none')} />
      Updated {label === 'just now' ? 'just now' : label}
    </span>
  );
}
