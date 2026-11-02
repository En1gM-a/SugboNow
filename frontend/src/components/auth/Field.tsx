import { useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { cx, vars } from '@/utils/cx';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: string;
  /** Its place in the form's entrance (rows enter 35 ms apart). */
  row: number;
  error?: string;
  /** Something beside the label, like "Forgot password?". */
  action?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

/** A labeled input; its error shows right under it and is tied to it for screen readers. */
export function Field({ id, label, row, error, action, ref, className, ...input }: FieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className={cx('field', className)} data-row style={vars({ '--k': row })}>
      <div className="field-top">
        <label htmlFor={id}>{label}</label>
        {action}
      </div>
      <input id={id} ref={ref} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} {...input} />
      {error && (
        <p id={errorId} className="field-err">
          {error}
        </p>
      )}
    </div>
  );
}

/** A password input with Show and Hide. */
export function PasswordField({ id, label, row, error, action, ref, ...input }: Omit<FieldProps, 'type'>) {
  const [shown, setShown] = useState(false);
  const errorId = `${id}-error`;
  return (
    <div className="field" data-row style={vars({ '--k': row })}>
      <div className="field-top">
        <label htmlFor={id}>{label}</label>
        {action}
      </div>
      <div className="pw">
        <input
          id={id}
          ref={ref}
          type={shown ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...input}
        />
        <button type="button" className="show-btn" aria-controls={id} aria-label={shown ? 'Hide password' : 'Show password'} onClick={() => setShown((s) => !s)}>
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      {error && (
        <p id={errorId} className="field-err">
          {error}
        </p>
      )}
    </div>
  );
}
