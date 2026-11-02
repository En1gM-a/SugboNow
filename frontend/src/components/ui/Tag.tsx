import type { ReactNode } from 'react';
import type { Severity } from '@/types/api';
import { cx } from '@/utils/cx';

/** A small chip: mango for the one thing that needs attention, quiet for everything else. */
export function Tag({ tone = 'mango', className, children }: { tone?: 'mango' | 'quiet'; className?: string; children: ReactNode }) {
  return <span className={cx('tag', `tag-${tone}`, className)}>{children}</span>;
}

const SEVERITY_LABEL: Record<Severity, string> = { high: 'High', medium: 'Medium', low: 'Low' };

/** Severity as a colored chip with its label, never color alone. */
export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return <span className={cx('tag', `sev-${severity}`, className)}>{SEVERITY_LABEL[severity]}</span>;
}
