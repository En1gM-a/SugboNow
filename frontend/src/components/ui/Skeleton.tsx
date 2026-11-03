import type { CSSProperties } from 'react';
import { cx } from '@/utils/cx';

/** A soft pulsing block shaped like the content it stands in for. */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span className={cx('skel', className)} style={style} aria-hidden="true" />;
}
