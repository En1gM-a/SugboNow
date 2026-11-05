import { cx } from '@/utils/cx';
import { DAY_SHORT } from '@/utils/format';

// Monday first, the way a school or work week reads. The API counts from 0 = Sunday.
const WEEK = [1, 2, 3, 4, 5, 6, 0];

interface DayChipsProps {
  value: number[];
  onChange: (days: number[]) => void;
  error?: string;
  label?: string;
  /** Lets a failed submit move focus here. */
  name?: string;
}

/** Pick the days of a weekly trip. */
export function DayChips({ value, onChange, error, label = 'Days', name }: DayChipsProps) {
  const toggle = (day: number) => onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));
  return (
    <fieldset className={cx('field', 'days')}>
      <legend className="field-legend">{label}</legend>
      <div className="day-row">
        {WEEK.map((day, i) => (
          <button key={day} type="button" className="chip day" aria-pressed={value.includes(day)} data-field={i === 0 ? name : undefined} onClick={() => toggle(day)}>
            {DAY_SHORT[day]}
          </button>
        ))}
      </div>
      {error && <p className="field-err">{error}</p>}
    </fieldset>
  );
}
