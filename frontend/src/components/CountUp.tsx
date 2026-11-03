import { useCountUp } from '@/hooks/useCountUp';
import { cx } from '@/utils/cx';

interface CountUpProps {
  value: number;
  decimals?: number;
  suffix?: string;
  /** When it starts counting, in ms after the page's entrance starts. */
  delay?: number;
  className?: string;
}

/** A small stat that counts up on a page's first open, with tabular numbers so nothing jumps. */
export function CountUp({ value, decimals = 0, suffix = '', delay = 0, className }: CountUpProps) {
  const shown = useCountUp(value, delay);
  return <span className={cx('tabular-nums', className)}>{shown.toFixed(decimals) + suffix}</span>;
}

/** 4754 → { value: 4.8, decimals: 1, suffix: "K" }, for counts like "4.8K reactions". */
export function compact(n: number): { value: number; decimals: number; suffix: string } {
  if (n >= 1_000_000) return { value: Math.round(n / 100_000) / 10, decimals: 1, suffix: 'M' };
  if (n >= 1000) return { value: Math.round(n / 100) / 10, decimals: 1, suffix: 'K' };
  return { value: n, decimals: 0, suffix: '' };
}
