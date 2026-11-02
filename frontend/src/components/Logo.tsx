import { cx } from '@/utils/cx';

/** The logo mark (the sun over the sea) and "SugboNow". */
export function Logo({ onSky = false, className }: { onSky?: boolean; className?: string }) {
  return (
    <span className={cx('brand', onSky && 'brand-on-sky', className)}>
      <span className="mark" aria-hidden="true" />
      SugboNow
    </span>
  );
}
