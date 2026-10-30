// The one shared button: press, hover, focus, loading and "Saved" success states.

import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cx } from '@/utils/cx';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'onDark';
type Size = 'md' | 'sm';

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold select-none cursor-pointer whitespace-nowrap ' +
  'transition-[background-color,color,border-color,transform] duration-150 ease-out ' +
  'active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100';

const variants: Record<Variant, string> = {
  primary: 'hover-shadow bg-mactan-sea text-on-sea hover:bg-mactan-sea-dark',
  secondary: 'bg-surface text-ink border border-line hover:border-mactan-sea/50 hover:bg-mactan-sea-soft/40',
  ghost: 'text-mactan-sea hover:bg-mactan-sea-soft',
  danger: 'bg-surface text-status-high border border-status-high/30 hover:bg-status-high-soft',
  onDark: 'bg-white/10 text-white hover:bg-white/20 focus-visible:outline-marigold',
};

const sizes: Record<Size, string> = {
  md: 'min-h-11 px-4 text-[15px]',
  sm: 'min-h-11 px-3 text-sm',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cx(base, variants[variant], sizes[size], extra);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  /** Set to true (or bump a counter) after a successful save: shows a check and "Saved" for ~1.2 s. */
  success?: boolean | number;
  successLabel?: string;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, loading = false, success = false, successLabel = 'Saved', className, children, disabled, type = 'button', ...rest },
  ref,
) {
  const [showSuccess, setShowSuccess] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!success) return;
    setShowSuccess(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShowSuccess(false), 1200);
    return () => clearTimeout(timer.current);
  }, [success]);

  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {/* Label keeps its width while loading; it fades out under the spinner. */}
      <span className={cx('inline-flex items-center gap-2 transition-opacity duration-150', (loading || showSuccess) && 'opacity-0')}>
        {icon && <Icon name={icon} size={18} />}
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center animate-fade-in" aria-hidden="true">
          <span className="size-5 rounded-full border-2 border-current border-r-transparent animate-spin motion-reduce:animate-none" />
        </span>
      )}
      {showSuccess && !loading && (
        <span className="absolute inset-0 flex items-center justify-center gap-1.5 animate-check-in" role="status">
          <Icon name="check" size={18} />
          {successLabel}
        </span>
      )}
    </button>
  );
});

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
}

export function ButtonLink({ variant = 'primary', size = 'md', icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, typeof className === 'string' ? className : undefined)} {...rest}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </Link>
  );
}

/** "See all →" link whose arrow nudges 2px right on hover. */
export function ArrowLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      className={cx(
        'group inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-mactan-sea transition-colors duration-150 hover:text-mactan-sea-dark',
        className,
      )}
    >
      {children}
      <Icon name="arrowRight" size={16} className="transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
    </Link>
  );
}
