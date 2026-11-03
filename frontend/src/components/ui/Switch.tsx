import { useId } from 'react';

interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** An on/off switch; the thumb slides with a CSS transform (200 ms). */
export function Switch({ label, description, checked, onChange }: SwitchProps) {
  const id = useId();
  return (
    <div className="switch-row">
      <div className="switch-text">
        <label htmlFor={id} className="switch-label">
          {label}
        </label>
        {description && <p className="muted small">{description}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
        <span className="switch-thumb" />
      </button>
    </div>
  );
}
