// Add/edit a saved place: kind, label, address and a map pin for coordinates.

import { useState, type FormEvent } from 'react';
import { useFormErrors } from '@/hooks/useFormErrors';
import { useAreas } from '@/hooks/useProfile';
import { fieldError } from '@/lib/apiClient';
import type { Location, LocationInput, LocationKind } from '@/types/api';
import { cx } from '@/utils/cx';
import { KIND_HEX } from '@/utils/places';
import { Button } from '../ui/Button';
import { FieldError, SelectField, TextField } from '../ui/Controls';
import { Icon, type IconName } from '../ui/Icon';
import { LazyPinDropMap } from '../map/LazyMaps';

export const KIND_META: Record<LocationKind, { label: string; icon: IconName }> = {
  home: { label: 'Home', icon: 'home' },
  school: { label: 'School', icon: 'school' },
  work: { label: 'Work', icon: 'briefcase' },
  other: { label: 'Other', icon: 'pin' },
};

/** Round marker in the same color as the place's map pin, so the list and the map read together. */
export function KindIcon({ kind, size = 'md' }: { kind: LocationKind; size?: 'sm' | 'md' }) {
  const m = KIND_META[kind];
  return (
    <span className={cx('flex shrink-0 items-center justify-center rounded-full text-white', size === 'sm' ? 'size-8' : 'size-10')} style={{ background: KIND_HEX[kind] }}>
      <Icon name={m.icon} size={size === 'sm' ? 16 : 20} />
    </span>
  );
}

interface Props {
  initial?: Location | null;
  defaultKind?: LocationKind;
  onSubmit: (input: LocationInput) => Promise<unknown>;
  onCancel?: () => void;
  submitLabel?: string;
}

type Field = 'label' | 'addressText' | 'pin';
const FIELDS: readonly Field[] = ['label', 'addressText', 'pin'];

export function PlaceForm({ initial, defaultKind = 'home', onSubmit, onCancel, submitLabel = 'Save place' }: Props) {
  const areas = useAreas();
  const [kind, setKind] = useState<LocationKind>(initial?.kind ?? defaultKind);
  const [label, setLabel] = useState(initial?.label ?? KIND_META[defaultKind].label);
  const [address, setAddress] = useState(initial?.addressText ?? '');
  const [lat, setLat] = useState<number | null>(initial?.lat ?? null);
  const [lng, setLng] = useState<number | null>(initial?.lng ?? null);
  const [recenter, setRecenter] = useState<string | undefined>();
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);

  const { formRef, shown, blur, validate } = useFormErrors<Field>(
    {
      label: label.trim() ? undefined : 'Give this place a name.',
      addressText: address.trim() ? undefined : 'Add an address or landmark.',
      pin: lat !== null && lng !== null ? undefined : 'Drop a pin: tap the map, or start from an area above it.',
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
      await onSubmit({ kind, label: label.trim(), addressText: address.trim(), lat: lat!, lng: lng! });
    } catch (error) {
      setServerErrors({
        label: fieldError(error, 'label'),
        addressText: fieldError(error, 'addressText'),
        pin: fieldError(error, 'lat') ?? fieldError(error, 'lng'),
      });
    } finally {
      setSaving(false);
    }
  }

  function pin(a: number, b: number) {
    setLat(a);
    setLng(b);
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink">Kind of place</legend>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(KIND_META) as LocationKind[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => {
                if (label === KIND_META[kind].label || !label) setLabel(KIND_META[k].label);
                setKind(k);
              }}
              className={cx(
                'flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition-colors duration-150 active:scale-[0.97]',
                kind === k ? 'border-mactan-sea bg-mactan-sea-soft text-mactan-sea-dark' : 'border-line bg-surface text-ink hover:border-mactan-sea/50',
              )}
            >
              <Icon name={KIND_META[k].icon} size={20} />
              {KIND_META[k].label}
            </button>
          ))}
        </div>
      </fieldset>
      <TextField label="Name" name="label" value={label} onChange={(e) => setLabel(e.target.value)} onBlur={blur('label')} maxLength={60} error={err('label')} />
      <TextField
        label="Address or landmark"
        name="addressText"
        autoComplete="street-address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        onBlur={blur('addressText')}
        maxLength={200}
        placeholder="e.g. Guadalupe, Cebu City"
        error={err('addressText')}
      />
      <div>
        <p className="mb-1.5 text-sm font-semibold text-ink">Pin on the map</p>
        <SelectField
          label="Start from an area"
          className="mb-2"
          value=""
          onChange={(e) => {
            const a = areas.data?.find((x) => x.slug === e.target.value);
            if (!a) return;
            pin(a.lat, a.lng);
            setRecenter(a.slug);
          }}
          hint="Sets the pin to the town's center. Drag it to the exact spot."
        >
          <option value="">Choose an area…</option>
          {(areas.data ?? []).map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
            </option>
          ))}
        </SelectField>
        <div data-field="pin" tabIndex={-1} className="rounded-xl outline-offset-2">
          <LazyPinDropMap lat={lat} lng={lng} kind={kind} recenterKey={recenter} onChange={pin} className="h-56 overflow-hidden rounded-xl border border-line" />
        </div>
        {err('pin') ? (
          <FieldError>{err('pin')}</FieldError>
        ) : (
          <p className="mt-1.5 text-sm text-muted tabular-nums">
            {lat !== null ? `Pinned at ${lat.toFixed(4)}, ${lng!.toFixed(4)}. Drag the pin to adjust.` : 'Tap the map where this place is.'}
          </p>
        )}
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
