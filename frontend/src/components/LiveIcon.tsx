import { cx } from '@/utils/cx';
import { LIVE_ART, type LiveKind } from './liveIconArt';

interface LiveIconProps {
  kind: LiveKind;
  /** The same drawing with its loop turned off (the header weather chip, the hour strip, the "Right now" glance). */
  still?: boolean;
  /** Give one only when the icon carries meaning on its own, as in the hour strip; beside text it's decorative. */
  label?: string;
  className?: string;
}

/** A flat cartoon icon that shows a condition and loops on the shared 1.6 s beat (handoff <icons>). Size it with font-size. */
export function LiveIcon({ kind, still, label, className }: LiveIconProps) {
  return (
    <i
      className={cx('wi', still && 'still', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      // Static, authored markup from liveIconArt.ts; nothing here comes from user input or the API.
      dangerouslySetInnerHTML={{ __html: LIVE_ART[kind] }}
    />
  );
}
