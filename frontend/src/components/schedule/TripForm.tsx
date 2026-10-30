// Add/edit a weekly trip: title, days, arrive-by time, origin and destination.

import { useState, type FormEvent } from 'react';
import { useFormErrors } from '@/hooks/useFormErrors';
import { fieldError } from '@/lib/apiClient';
import type { Location, ScheduleEntry, ScheduleInput } from '@/types/api';
import { Button } from '../ui/Button';
import { DayChips, SelectField, TextField } from '../ui/Controls';

type Field = keyof ScheduleInput;
const FIELDS: readonly Field[] = ['title', 'daysOfWeek', 'arriveBy', 'originLocationId', 'destinationLocationId'];

interface Props {
  initial?: ScheduleEntry | null;
  places: Location[];
  onSubmit: (input: ScheduleInput) => Promise<unknown>;
  onCancel?: () => void;
  submitLabel?: string;
}

export function TripForm({ initial, places, onSubmit, onCancel, submitLabel = 'Save trip' }: Props) {
  const home = places.find((p) => p.kind === 'home') ?? places[0];
  const dest = places.find((p) => p.id !== home?.id && (p.kind === 'school' || p.kind === 'work')) ?? places.find((p) => p.id !== home?.id);
  const [title, setTitle] = useState(initial?.title ?? (dest?.kind === 'work' ? 'Work' : 'Classes'));
  const [days, setDays] = useState<number[]>(initial?.daysOfWeek ?? [1, 2, 3, 4, 5]);
  const [arriveBy, setArriveBy] = useState(initial?.arriveBy ?? '07:30');
  const [origin, setOrigin] = useState(initial?.originLocationId ?? home?.id ?? '');
  const [destination, setDestination] = useState(initial?.destinationLocationId ?? dest?.id ?? '');
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);

  const { formRef, shown, blur, validate } = useFormErrors<Field>(
    {
      title: title.trim() ? undefined : 'Give this trip a name.',
      daysOfWeek: days.length ? undefined : 'Pick at least one day.',
      arriveBy: /^([01]\d|2[0-3]):[0-5]\d$/.test(arriveBy) ? undefined : 'Pick the time you need to arrive.',
      originLocationId: origin ? undefined : 'Pick where you start.',
      destinationLocationId: !destination ? 'Pick where you’re going.' : destination === origin ? 'Pick a different place from where you start.' : undefined,
    },
    FIELDS,
  );
  const err = (k: Field) => shown[k] ?? serverErrors[k];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setServerErrors({});
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), daysOfWeek: days, arriveBy, originLocationId: origin, destinationLocationId: destination });
    } catch (error) {
      setServerErrors(Object.fromEntries(FIELDS.map((k) => [k, fieldError(error, k)])));
    } finally {
      setSaving(false);
    }
  }

  if (places.length < 2) {
    return <p className="rounded-xl bg-marigold-soft p-3 text-sm text-ink">Save at least two places (for example Home and School) first, then add a trip between them.</p>;
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-4">
      <TextField label="Trip name" name="title" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={blur('title')} placeholder="e.g. Classes" error={err('title')} />
      <DayChips name="daysOfWeek" value={days} onChange={setDays} error={err('daysOfWeek')} />
      <TextField label="Arrive by" name="arriveBy" type="time" value={arriveBy} onChange={(e) => setArriveBy(e.target.value)} onBlur={blur('arriveBy')} error={err('arriveBy')} className="max-w-48" />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="From" name="originLocationId" value={origin} onChange={(e) => setOrigin(e.target.value)} onBlur={blur('originLocationId')} error={err('originLocationId')}>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="To"
          name="destinationLocationId"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          onBlur={blur('destinationLocationId')}
          error={err('destinationLocationId')}
        >
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
