// Light/dark mode switch. Shows the moon in light mode and the sun in dark mode.

import { useTheme } from '@/hooks/useBrowser';
import { setTheme } from '@/lib/theme';
import { cx } from '@/utils/cx';
import { Icon } from '../ui/Icon';

export function ThemeToggle({ onDark = true, className }: { onDark?: boolean; className?: string }) {
  const dark = useTheme() === 'dark';
  return (
    <button
      type="button"
      aria-label="Dark mode"
      aria-pressed={dark}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className={cx(
        'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-150',
        onDark ? 'text-white/85 hover:bg-white/10 hover:text-white focus-visible:outline-marigold' : 'text-muted hover:bg-stone-100 hover:text-ink',
        className,
      )}
    >
      {/* Re-keyed so the new icon fades in, confirming the switch. */}
      <Icon key={dark ? 'sun' : 'moon'} name={dark ? 'sun' : 'moon'} size={20} className="animate-fade-in" />
    </button>
  );
}
