// Form controls: labeled inputs, selects, a switch, a segmented control and day chips.

import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cx } from '@/utils/cx';
import { DAY_SHORT } from '@/utils/format';
import { Icon } from './Icon';

const inputBase =
  'w-full min-h-11 rounded-xl border bg-surface px-3.5 text-base text-ink placeholder:text-stone-500 ' +
  'transition-colors duration-150 hover:border-stone-400 focus-visible:border-mactan-sea focus-visible:outline-2 focus-visible:outline-offset-0';

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
}

export function TextField({ label, error, hint, className, id, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        className={cx(inputBase, error ? 'border-status-high' : 'border-line')}
        {...rest}
      />
      {error ? <FieldError id={`${fid}-err`}>{error}</FieldError> : hint && <p id={`${fid}-hint`} className="mt-1.5 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function PasswordField(props: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const { label, error, hint, className, id, ...rest } = props;
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={fid}
          type={show ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
          className={cx(inputBase, 'pr-12', error ? 'border-status-high' : 'border-line')}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-xl text-muted transition-colors duration-150 hover:text-ink"
        >
          <Icon name={show ? 'eyeOff' : 'eye'} size={20} />
        </button>
      </div>
      {error ? <FieldError id={`${fid}-err`}>{error}</FieldError> : hint && <p id={`${fid}-hint`} className="mt-1.5 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function SelectField({ label, error, hint, className, id, children, ...rest }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={fid}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
          className={cx(inputBase, 'cursor-pointer appearance-none pr-10', error ? 'border-status-high' : 'border-line')}
          {...rest}
        >
          {children}
        </select>
        <Icon name="chevronDown" size={18} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted" />
      </div>
      {error ? <FieldError id={`${fid}-err`}>{error}</FieldError> : hint && <div id={`${fid}-hint`} className="mt-1.5 text-sm text-muted">{hint}</div>}
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-status-high">
      <Icon name="alert" size={16} className="mt-0.5" />
      {children}
    </p>
  );
}

/** On/off switch. The thumb slides with a 200 ms transform. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-1 text-sm font-semibold text-ink"
    >
      <span className={cx('relative h-6 w-11 rounded-full transition-colors duration-200', checked ? 'bg-mactan-sea' : 'bg-stone-300 group-hover:bg-stone-400')}>
        <span
          className={cx(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
            checked && 'translate-x-5',
          )}
        />
      </span>
      {label}
    </button>
  );
}

/**
 * Equal-width segmented control; the indicator moves by translateX(index × 100%).
 * Keyboard follows the radio-group pattern: one tab stop, arrow keys move the selection.
 */
export function Segmented<T extends string>({ options, value, onChange, label, onDark }: { options: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void; label: string; onDark?: boolean }) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : step ? (index + step + options.length) % options.length : -1;
    if (to < 0) return;
    e.preventDefault();
    onChange(options[to].value);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[to]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx('relative inline-grid rounded-xl p-1', onDark ? 'bg-white/10' : 'bg-stone-100')}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-lg bg-surface shadow-card transition-transform duration-200 ease-out dark:bg-stone-200"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={cx(
            'relative z-10 min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors duration-150',
            o.value === value ? 'text-ink' : onDark ? 'text-white/80 hover:text-white' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DayChips({ value, onChange, error, label = 'Days', name }: { value: number[]; onChange: (d: number[]) => void; error?: string; label?: string; name?: string }) {
  const toggle = (d: number) => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort());
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {DAY_SHORT.map((day, d) => {
          const on = value.includes(d);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              data-field={d === 0 ? name : undefined}
              onClick={() => toggle(d)}
              className={cx(
                'min-h-11 min-w-11 cursor-pointer rounded-full border px-3 text-sm font-semibold transition-colors duration-200 active:scale-[0.97]',
                on ? 'border-mactan-sea bg-mactan-sea text-on-sea' : 'border-line bg-surface text-ink hover:border-mactan-sea/50',
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </fieldset>
  );
}

/** Filter chip (toggle). */
export function Chip({ active, onClick, children, icon }: { active: boolean; onClick: () => void; children: ReactNode; icon?: Parameters<typeof Icon>[0]['name'] }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150 active:scale-[0.97]',
        active ? 'border-selected bg-selected text-on-selected' : 'border-line bg-surface text-ink hover:border-mactan-sea/50',
      )}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}
