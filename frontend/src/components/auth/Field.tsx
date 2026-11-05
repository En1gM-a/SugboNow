import { useState, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes } from 'react';
import { Icon } from '@/components/icons/Icon';
import { cx, vars } from '@/utils/cx';

interface FieldBase {
  id: string;
  label: string;
  /** Its place in the auth form's entrance (rows enter 35 ms apart). Leave it out everywhere else. */
  row?: number;
  error?: string;
  /** A short note under the input, like "A barangay or street is enough." */
  hint?: ReactNode;
  /** Something beside the label, like "Forgot password?". */
  action?: ReactNode;
}

interface FieldProps extends FieldBase, Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  ref?: Ref<HTMLInputElement>;
}

interface SelectFieldProps extends FieldBase, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  ref?: Ref<HTMLSelectElement>;
}

const rowProps = (row: number | undefined) => (row === undefined ? {} : { 'data-row': true, style: vars({ '--k': row }) });

function describedBy(id: string, error?: string, hint?: ReactNode) {
  const ids = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

function FieldNotes({ id, error, hint }: { id: string; error?: string; hint?: ReactNode }) {
  return (
    <>
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-err">
          {error}
        </p>
      )}
    </>
  );
}

/** A labeled input; its error shows right under it and is tied to it for screen readers. */
export function Field({ id, label, row, error, hint, action, ref, className, ...input }: FieldProps) {
  return (
    <div className={cx('field', className)} {...rowProps(row)}>
      <div className="field-top">
        <label htmlFor={id}>{label}</label>
        {action}
      </div>
      <input id={id} ref={ref} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...input} />
      <FieldNotes id={id} error={error} hint={hint} />
    </div>
  );
}

/** A labeled select, styled like the inputs. */
export function SelectField({ id, label, row, error, hint, action, ref, className, children, ...select }: SelectFieldProps) {
  return (
    <div className={cx('field', className)} {...rowProps(row)}>
      <div className="field-top">
        <label htmlFor={id}>{label}</label>
        {action}
      </div>
      <div className="select-wrap">
        <select id={id} ref={ref} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...select}>
          {children}
        </select>
        <Icon name="caret-down" />
      </div>
      <FieldNotes id={id} error={error} hint={hint} />
    </div>
  );
}

/** A password input with Show and Hide. */
export function PasswordField({ id, label, row, error, hint, action, ref, ...input }: Omit<FieldProps, 'type'>) {
  const [shown, setShown] = useState(false);
  return (
    <div className="field" {...rowProps(row)}>
      <div className="field-top">
        <label htmlFor={id}>{label}</label>
        {action}
      </div>
      <div className="pw">
        <input id={id} ref={ref} type={shown ? 'text' : 'password'} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...input} />
        <button type="button" className="show-btn" aria-controls={id} aria-label={shown ? 'Hide password' : 'Show password'} onClick={() => setShown((s) => !s)}>
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      <FieldNotes id={id} error={error} hint={hint} />
    </div>
  );
}
