// Add or edit a weekly trip: name, days, arrive-by time, and from and to.

import { useState, type FormEvent } from 'react';
import { Field, SelectField } from '@/components/auth/Field';
import { Button } from '@/components/ui/Button';
import { DayChips } from '@/components/ui/DayChips';
import { useFormErrors } from '@/hooks/useFormErrors';
import { fieldError } from '@/lib/apiClient';
import type { Location, ScheduleEntry, ScheduleInput } from '@/types/api';

type FieldName = keyof ScheduleInput;
const ORDER: readonly FieldName[] = ['title', 'daysOfWeek', 'arriveBy', 'originLocationId', 'destinationLocationId'];

interface TripFormProps {
  /** Keeps the field ids unique on the page. */
  idBase: string;
  /** The trip being edited; leave it out to add a new one. */
  initial?: ScheduleEntry | null;
  /** The user's saved places. A trip needs two different ones. */
  places: Location[];
  onSubmit: (input: ScheduleInput) => Promise<unknown>;
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
}

export function TripForm({ idBase, initial, places, onSubmit, onCancel, cancelLabel = 'Cancel', submitLabel = 'Save' }: TripFormProps) {
  const start = places.find((p) => p.kind === 'home') ?? places[0];
  const end = places.find((p) => p.id !== start?.id && (p.kind === 'school' || p.kind === 'work')) ?? places.find((p) => p.id !== start?.id);
  const [title, setTitle] = useState(initial?.title ?? (end?.kind === 'work' ? 'Work' : end?.kind === 'school' ? 'Classes' : ''));
  const [days, setDays] = useState<number[]>(initial?.daysOfWeek ?? [1, 2, 3, 4, 5]);
  const [arriveBy, setArriveBy] = useState(initial?.arriveBy ?? '07:30');
  const [origin, setOrigin] = useState(initial?.originLocationId ?? start?.id ?? '');
  const [destination, setDestination] = useState(initial?.destinationLocationId ?? end?.id ?? '');
  const [serverError, setServerError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const { formRef, shown, blur, validate } = useFormErrors<FieldName>(
    {
      title: title.trim() ? undefined : 'Give this trip a name.',
      daysOfWeek: days.length ? undefined : 'Pick at least one day.',
      arriveBy: /^([01]\d|2[0-3]):[0-5]\d$/.test(arriveBy) ? undefined : 'Pick the time you need to arrive.',
      originLocationId: origin ? undefined : 'Pick where you start.',
      destinationLocationId: !destination ? "Pick where you're going." : destination === origin ? 'Pick a different place from where you start.' : undefined,
    },
    ORDER,
  );
  const err = (name: FieldName) => shown[name] ?? fieldError(serverError, name);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate() || saving) return;
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), daysOfWeek: days, arriveBy, originLocationId: origin, destinationLocationId: destination });
    } catch (error) {
      setServerError(error);
      setSaving(false);
      return;
    }
    setSaving(false);
  }

  return (
    <form ref={formRef} className="stack-form" noValidate onSubmit={submit}>
      <Field id={`${idBase}-title`} name="title" label="Trip name" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} onBlur={blur('title')} error={err('title')} />
      <DayChips name="daysOfWeek" value={days} onChange={setDays} error={err('daysOfWeek')} />
      <Field id={`${idBase}-arrive`} name="arriveBy" label="Arrive by" type="time" value={arriveBy} onChange={(e) => setArriveBy(e.target.value)} onBlur={blur('arriveBy')} error={err('arriveBy')} className="field-time" />
      <div className="field-pair">
        <SelectField id={`${idBase}-from`} name="originLocationId" label="From" value={origin} onChange={(e) => setOrigin(e.target.value)} onBlur={blur('originLocationId')} error={err('originLocationId')}>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </SelectField>
        <SelectField id={`${idBase}-to`} name="destinationLocationId" label="To" value={destination} onChange={(e) => setDestination(e.target.value)} onBlur={blur('destinationLocationId')} error={err('destinationLocationId')}>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="form-actions">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" busy={saving} className="ml-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
