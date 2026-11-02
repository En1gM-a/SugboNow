import type { ButtonHTMLAttributes, Ref } from 'react';
import { Icon } from '@/components/icons/Icon';
import { cx } from '@/utils/cx';

type Variant = 'primary' | 'secondary' | 'quiet' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Loading: keeps the button's width, swaps the label for a spinner, sets aria-busy and disables it. */
  busy?: boolean;
  /** Success: a check scales in with "Saved". */
  done?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * The one shared button, with every state (handoff <motion>, Buttons). Press scales to 0.97 in CSS, so it works
 * before any JavaScript loads; hover is one shade brighter on devices that can hover; focus shows a mango ring.
 */
export function Button({ variant = 'primary', busy = false, done = false, className, children, disabled, type = 'button', ref, ...rest }: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('btn', `btn-${variant}`, className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      data-done={done || undefined}
      {...rest}
    >
      <span className="btn-label">
        {done ? (
          <>
            <Icon name="check" className="btn-check" />
            Saved
          </>
        ) : (
          children
        )}
      </span>
      {variant === 'primary' && <span className="btn-spin" aria-hidden="true" />}
    </button>
  );
}
