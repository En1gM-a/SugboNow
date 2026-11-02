import { Icon } from '@/components/icons/Icon';
import { toggleMode, useDisplay } from '@/lib/display';
import { cx } from '@/utils/cx';

/** Light and dark mode. The new mode spreads out in a circle from this button; the sun and moon swap with a turn. */
export function ThemeSwitch({ onSky = false }: { onSky?: boolean }) {
  const { mode } = useDisplay();
  return (
    <button
      type="button"
      className={cx('btn', 'btn-icon', 'theme-btn', onSky && 'on-sky')}
      aria-label="Dark mode"
      aria-pressed={mode === 'dark'}
      onClick={(e) => toggleMode(e.currentTarget)}
    >
      <span className="ts-sun">
        <Icon name="sun" />
      </span>
      <span className="ts-moon">
        <Icon name="moon" />
      </span>
    </button>
  );
}
