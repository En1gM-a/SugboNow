// Add or edit a saved place: kind, name, address and a map pin for its coordinates, with a search that moves the pin.

import { useState, type FormEvent } from 'react';
import { Field, SelectField } from '@/components/auth/Field';
import { PlaceSearch } from '@/components/locations/PlaceSearch';
import { LazyPinDropMap } from '@/components/map/LazyMaps';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { useFormErrors } from '@/hooks/useFormErrors';
import { useAreas, useProfile } from '@/hooks/useProfile';
import { fieldError } from '@/lib/apiClient';
import { CEBU_CENTER, KIND_META, KINDS } from '@/lib/places';
import { placeAddress, type PlaceResult } from '@/lib/placeSearch';
import type { Location, LocationInput, LocationKind } from '@/types/api';

type FieldName = 'label' | 'addressText';
/** How close the map zooms in on what was chosen. */
const TOWN_ZOOM = 14;
const RESULT_ZOOM: Record<PlaceResult['kind'], number> = { area: 15, landmark: 17, street: 17 };
const ORDER: readonly FieldName[] = ['label', 'addressText'];

interface PlaceFormProps {
  /** Keeps the field ids unique on the page. */
  idBase: string;
  /** The place being edited; leave it out to add a new one. */
  initial?: Location | null;
  /** Which kinds to offer. One kind hides the control. */
  kinds?: readonly LocationKind[];
  defaultKind?: LocationKind;
  defaultAddress?: string;
  onSubmit: (input: LocationInput) => Promise<unknown>;
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
}

export function PlaceForm({ idBase, initial, kinds = KINDS, defaultKind = kinds[0], defaultAddress = '', onSubmit, onCancel, cancelLabel = 'Cancel', submitLabel = 'Save' }: PlaceFormProps) {
  const areas = useAreas();
  const profile = useProfile();
  const [kind, setKind] = useState<LocationKind>(initial?.kind ?? defaultKind);
  const [label, setLabel] = useState(initial?.label ?? KIND_META[defaultKind].label);
  const [address, setAddress] = useState(initial?.addressText ?? defaultAddress);
  // Null until the user moves it: the pin starts at their city (handoff: signup.md).
  const [moved, setMoved] = useState<{ lat: number; lng: number } | null>(initial ? { lat: initial.lat, lng: initial.lng } : null);
  const [jump, setJump] = useState({ count: 0, zoom: TOWN_ZOOM });
  // The address the search last filled in, so a new result may replace it but never what the user typed.
  const [filled, setFilled] = useState('');
  const [serverError, setServerError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const home = areas.data?.find((a) => a.slug === profile.data?.city);
  const pin = moved ?? (home ? { lat: home.lat, lng: home.lng } : CEBU_CENTER);

  const { formRef, shown, blur, validate } = useFormErrors<FieldName>(
    {
      label: label.trim() ? undefined : 'Give this place a name.',
      addressText: address.trim() ? undefined : 'Add an address or a landmark.',
    },
    ORDER,
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate() || saving) return;
    setSaving(true);
    try {
      await onSubmit({ kind, label: label.trim(), addressText: address.trim(), lat: pin.lat, lng: pin.lng });
    } catch (err) {
      setServerError(err);
      setSaving(false);
      return;
    }
    setSaving(false);
  }

  function pickKind(next: LocationKind) {
    // The name follows the kind until the user types their own.
    if (label === KIND_META[kind].label || !label) setLabel(KIND_META[next].label);
    setKind(next);
  }

  function jumpTo(at: { lat: number; lng: number }, zoom: number) {
    setMoved({ lat: at.lat, lng: at.lng });
    setJump((j) => ({ count: j.count + 1, zoom }));
  }

  function pickResult(place: PlaceResult) {
    jumpTo(place, RESULT_ZOOM[place.kind]);
    if (address.trim() && address !== filled) return;
    const next = placeAddress(place).slice(0, 200);
    setAddress(next);
    setFilled(next);
  }

  const pinError = fieldError(serverError, 'lat') ?? fieldError(serverError, 'lng');

  return (
    <form ref={formRef} className="stack-form" noValidate onSubmit={submit}>
      {kinds.length > 1 && (
        <div className="field">
          <span className="field-legend" id={`${idBase}-kind`}>
            Kind of place
          </span>
          <Segmented label="Kind of place" value={kind} onChange={pickKind} options={kinds.map((k) => ({ value: k, label: KIND_META[k].label }))} />
        </div>
      )}
      <Field id={`${idBase}-label`} name="label" label="Name" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} onBlur={blur('label')} error={shown.label ?? fieldError(serverError, 'label')} />
      <Field
        id={`${idBase}-address`}
        name="addressText"
        label="Address or landmark"
        maxLength={200}
        autoComplete="street-address"
        hint="A barangay or street is enough."
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        onBlur={blur('addressText')}
        error={shown.addressText ?? fieldError(serverError, 'addressText')}
      />
      <div className="field">
        <div className="place-find">
          <PlaceSearch id={`${idBase}-search`} near={pin} onPick={pickResult} />
          <SelectField
            id={`${idBase}-jump`}
            label="Or jump to a town"
            value=""
            onChange={(e) => {
              const area = areas.data?.find((a) => a.slug === e.target.value);
              if (area) jumpTo(area, TOWN_ZOOM);
            }}
          >
            <option value="">Choose a town</option>
            {(areas.data ?? []).map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </SelectField>
        </div>
        <p className="field-hint">Then tap the map or drag the pin to the exact spot.</p>
        {/* The user's city can arrive after the map opens, so counting it as a jump brings the map to the pin. */}
        <LazyPinDropMap lat={pin.lat} lng={pin.lng} kind={kind} jump={jump.count + (home ? 1 : 0)} jumpZoom={jump.zoom} onChange={(lat, lng) => setMoved({ lat, lng })} />
        {pinError && <p className="field-err">{pinError}</p>}
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
