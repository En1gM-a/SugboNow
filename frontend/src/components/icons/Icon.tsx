import { cx } from '@/utils/cx';
import { ICON_PATHS, type IconName } from './paths';

export type { IconName };

interface IconProps {
  name: IconName;
  className?: string;
  /** Only for an icon that stands alone with no visible text; beside text it's hidden from screen readers. */
  label?: string;
}

/** A still Phosphor line icon for navigation and buttons. Its size is a CSS token (--icon): 20px, or 22px in the nav. */
export function Icon({ name, className, label }: IconProps) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="currentColor"
      className={cx('ic', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
