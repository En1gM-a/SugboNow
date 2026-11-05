// Profile (/profile, handoff <pages> page 9): "Is my info right?" One section at a time. Desktop lists the sections beside
// the selected one; phones show the list first and open each section as its own screen. The section lives in the URL
// (/profile?section=trips). Each section saves on its own, and places and trips are edited in place, never in a modal.

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Field, SelectField } from '@/components/auth/Field';
import { Icon, type IconName } from '@/components/icons/Icon';
import { Page } from '@/components/layout/Page';
import { PlaceForm } from '@/components/locations/PlaceForm';
import { RightNow } from '@/components/RightNow';
import { TripForm } from '@/components/schedule/TripForm';
import { CardError } from '@/components/today/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { useDoneFlash, useMediaQuery } from '@/hooks/useBrowser';
import { useDeleteLocation, useDeleteTrip, useLocations, useSaveLocation, useSaveTrip, useSchedule } from '@/hooks/usePlaces';
import { useAreas, useLguSources, useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useSignOut } from '@/hooks/useSignOut';
import { fieldError } from '@/lib/apiClient';
import { setLite, setStill, useDisplay } from '@/lib/display';
import { KIND_META } from '@/lib/places';
import { CLASS_SUSPENSION_NOTE, HOME_CITIES, MAYORS } from '@/lib/signupOptions';
import { toast } from '@/lib/toast';
import type { Location, LocationInput, Profile, ScheduleEntry, ScheduleInput } from '@/types/api';
import { cx, vars } from '@/utils/cx';
import { formatClock, formatDays } from '@/utils/format';

type SectionId = 'details' | 'places' | 'trips' | 'display' | 'signout';

const SECTIONS: ReadonlyArray<{ id: SectionId; label: string; note: string; icon: IconName }> = [
  { id: 'details', label: 'Your details', note: 'Name, city, mayor and commute', icon: 'user' },
  { id: 'places', label: 'Saved places', note: 'Home, school, work and more', icon: 'map-pin' },
  { id: 'trips', label: 'Weekly trips', note: 'When you need to arrive', icon: 'calendar-blank' },
  { id: 'display', label: 'Display', note: 'Lite mode and animations', icon: 'sliders-horizontal' },
  { id: 'signout', label: 'Sign out', note: 'Leave SugboNow on this device', icon: 'sign-out' },
];

function DetailsForm({ profile }: { profile: Profile }) {
  const areas = useAreas();
  const sources = useLguSources();
  const locations = useLocations();
  const update = useUpdateProfile();
  const [done, flash] = useDoneFlash();
  const [form, setForm] = useState({
    firstName: profile.firstName ?? '',
    displayName: profile.displayName ?? '',
    city: profile.city ?? '',
    addressText: profile.addressText ?? '',
    subscribedMayor: profile.subscribedMayor ?? '',
    commuteOriginLocationId: profile.commuteOriginLocationId ?? '',
    commuteDestinationLocationId: profile.commuteDestinationLocationId ?? '',
  });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const err = (path: keyof typeof form) => fieldError(update.error, path);
  const places = locations.data ?? [];
  const commuteClash = form.commuteOriginLocationId && form.commuteOriginLocationId === form.commuteDestinationLocationId;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (commuteClash) return;
    const orNull = (value: string) => value.trim() || null;
    update.mutate(
      {
        firstName: orNull(form.firstName),
        displayName: orNull(form.displayName),
        city: orNull(form.city),
        addressText: orNull(form.addressText),
        subscribedMayor: orNull(form.subscribedMayor),
        commuteOriginLocationId: orNull(form.commuteOriginLocationId),
        commuteDestinationLocationId: orNull(form.commuteDestinationLocationId),
      },
      { onSuccess: flash },
    );
  }

  return (
    <form className="stack-form" noValidate onSubmit={submit}>
      <div className="field-pair">
        <Field id="p-first" name="firstName" label="First name" autoComplete="given-name" maxLength={40} hint="Used in your greeting." value={form.firstName} onChange={set('firstName')} error={err('firstName')} />
        <Field id="p-display" name="displayName" label="Display name" autoComplete="nickname" maxLength={60} value={form.displayName} onChange={set('displayName')} error={err('displayName')} />
      </div>
      <SelectField id="p-city" name="city" label="Home city" hint="Picks your weather and your sky." value={form.city} onChange={set('city')} error={err('city')}>
        <option value="">Choose your city or town</option>
        {(areas.data ?? HOME_CITIES).map((area) => (
          <option key={area.slug} value={area.slug}>
            {area.name}
          </option>
        ))}
      </SelectField>
      <Field id="p-address" name="addressText" label="Address" autoComplete="street-address" maxLength={200} hint="A barangay or street is enough." value={form.addressText} onChange={set('addressText')} error={err('addressText')} />
      <SelectField id="p-mayor" name="subscribedMayor" label="Mayor to follow" hint={CLASS_SUSPENSION_NOTE} value={form.subscribedMayor} onChange={set('subscribedMayor')} error={err('subscribedMayor')}>
        <option value="">Choose a mayor</option>
        {sources.data
          ? sources.data.map((source) => (
              <option key={source.slug} value={source.slug}>
                {source.displayName}
                {source.officialName ? ` (${source.officialName})` : ''}
              </option>
            ))
          : MAYORS.map((mayor) => (
              <option key={mayor.slug} value={mayor.slug}>
                {mayor.label}
              </option>
            ))}
      </SelectField>
      <fieldset className="field">
        <legend className="field-legend">Usual commute</legend>
        {places.length < 2 ? (
          <p className="field-hint">
            Save two places to choose your commute.{' '}
            <Link to="/profile?section=places" className="inline-link">
              Saved places
            </Link>
          </p>
        ) : (
          <div className="field-pair">
            <SelectField id="p-from" name="commuteOriginLocationId" label="From" value={form.commuteOriginLocationId} onChange={set('commuteOriginLocationId')} error={err('commuteOriginLocationId')}>
              <option value="">Not set</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              id="p-to"
              name="commuteDestinationLocationId"
              label="To"
              value={form.commuteDestinationLocationId}
              onChange={set('commuteDestinationLocationId')}
              error={commuteClash ? 'Pick a different place from where you start.' : err('commuteDestinationLocationId')}
            >
              <option value="">Not set</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.label}
                </option>
              ))}
            </SelectField>
          </div>
        )}
      </fieldset>
      <div className="form-actions">
        <Button type="submit" className="ml-auto" done={done}>
          Save
        </Button>
      </div>
    </form>
  );
}

function DetailsSection() {
  const profile = useProfile();
  if (profile.isPending) {
    return (
      <div className="post-skel" aria-hidden="true">
        <Skeleton className="skel-row" />
        <Skeleton className="skel-row" />
        <Skeleton className="skel-row" />
      </div>
    );
  }
  if (profile.isError) return <CardError what="your details" onRetry={() => void profile.refetch()} />;
  return <DetailsForm profile={profile.data} />;
}

const placeInput = ({ label, kind, addressText, lat, lng }: Location): LocationInput => ({ label, kind, addressText, lat, lng });

function PlacesSection() {
  const locations = useLocations();
  const save = useSaveLocation();
  const remove = useDeleteLocation();
  const [editing, setEditing] = useState<Location | 'new' | null>(null);

  if (editing) {
    const place = editing === 'new' ? null : editing;
    const hasHome = locations.data?.some((l) => l.kind === 'home');
    return (
      <>
        <h3 className="sub-title">{place ? `Edit ${place.label}` : 'Add a place'}</h3>
        <PlaceForm
          key={place?.id ?? 'new'}
          idBase="p-place"
          initial={place}
          defaultKind={hasHome ? 'school' : 'home'}
          onCancel={() => setEditing(null)}
          onSubmit={async (input) => {
            const saved = await save.mutateAsync({ id: place?.id, input });
            setEditing(null);
            toast.success(`${saved.label} saved.`, {
              label: 'Undo',
              onClick: () => (place ? save.mutate({ id: place.id, input: placeInput(place) }) : remove.mutate(saved.id)),
            });
          }}
        />
      </>
    );
  }
  if (locations.isPending) {
    return (
      <div className="rows-skel" aria-hidden="true">
        <Skeleton className="skel-row" />
        <Skeleton className="skel-row" />
      </div>
    );
  }
  if (locations.isError) return <CardError what="your saved places" onRetry={() => void locations.refetch()} />;

  return (
    <>
      {locations.data.length === 0 ? (
        <p className="muted small">Save home, school and work, so alerts near them reach you.</p>
      ) : (
        <ul className="rows">
          {locations.data.map((place) => (
            <li key={place.id} className="item-row">
              <span className="item-ico">
                <Icon name={KIND_META[place.kind].icon} />
              </span>
              <span className="row-main">
                <b>{place.label}</b>
                <span className="muted small">{place.addressText}</span>
              </span>
              <span className="item-actions">
                <button type="button" className="btn btn-icon" aria-label={`Edit ${place.label}`} onClick={() => setEditing(place)}>
                  <Icon name="pencil-simple" />
                </button>
                <button
                  type="button"
                  className="btn btn-icon"
                  aria-label={`Delete ${place.label}`}
                  onClick={() =>
                    remove.mutate(place.id, {
                      onSuccess: () => toast.info(`${place.label} deleted.`, { label: 'Undo', onClick: () => save.mutate({ input: placeInput(place) }) }),
                    })
                  }
                >
                  <Icon name="trash" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" className="add-row" onClick={() => setEditing('new')}>
        <Icon name="plus" />
        Add a place
      </Button>
    </>
  );
}

const tripInput = ({ title, daysOfWeek, arriveBy, originLocationId, destinationLocationId }: ScheduleEntry): ScheduleInput => ({ title, daysOfWeek, arriveBy, originLocationId, destinationLocationId });

function TripsSection() {
  const schedule = useSchedule();
  const locations = useLocations();
  const save = useSaveTrip();
  const remove = useDeleteTrip();
  const [editing, setEditing] = useState<ScheduleEntry | 'new' | null>(null);
  const places = locations.data ?? [];

  if (editing) {
    const trip = editing === 'new' ? null : editing;
    return (
      <>
        <h3 className="sub-title">{trip ? `Edit ${trip.title}` : 'Add a trip'}</h3>
        <TripForm
          key={trip?.id ?? 'new'}
          idBase="p-trip"
          initial={trip}
          places={places}
          onCancel={() => setEditing(null)}
          onSubmit={async (input) => {
            const saved = await save.mutateAsync({ id: trip?.id, input });
            setEditing(null);
            toast.success(`${saved.title} saved.`, {
              label: 'Undo',
              onClick: () => (trip ? save.mutate({ id: trip.id, input: tripInput(trip) }) : remove.mutate(saved.id)),
            });
          }}
        />
      </>
    );
  }
  if (schedule.isPending || locations.isPending) {
    return (
      <div className="rows-skel" aria-hidden="true">
        <Skeleton className="skel-row" />
        <Skeleton className="skel-row" />
      </div>
    );
  }
  if (schedule.isError) return <CardError what="your weekly trips" onRetry={() => void schedule.refetch()} />;

  return (
    <>
      {schedule.data.length === 0 ? (
        <p className="muted small">Tell us when you need to arrive, and we&apos;ll tell you when to leave.</p>
      ) : (
        <ul className="rows">
          {schedule.data.map((trip) => (
            <li key={trip.id} className="item-row">
              <span className="item-ico">
                <Icon name="clock" />
              </span>
              <span className="row-main">
                <b>{trip.title}</b>
                <span className="muted small tabular-nums">
                  {formatDays(trip.daysOfWeek)} · arrive {formatClock(trip.arriveBy)} · {trip.origin.label} → {trip.destination.label}
                </span>
              </span>
              <span className="item-actions">
                <button type="button" className="btn btn-icon" aria-label={`Edit ${trip.title}`} onClick={() => setEditing(trip)}>
                  <Icon name="pencil-simple" />
                </button>
                <button
                  type="button"
                  className="btn btn-icon"
                  aria-label={`Delete ${trip.title}`}
                  onClick={() =>
                    remove.mutate(trip.id, {
                      onSuccess: () => toast.info(`${trip.title} deleted.`, { label: 'Undo', onClick: () => save.mutate({ input: tripInput(trip) }) }),
                    })
                  }
                >
                  <Icon name="trash" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {places.length < 2 ? (
        <p className="muted small">
          A trip needs two places.{' '}
          <Link to="/profile?section=places" className="inline-link">
            Save your places first
          </Link>
        </p>
      ) : (
        <Button variant="secondary" className="add-row" onClick={() => setEditing('new')}>
          <Icon name="plus" />
          Add a trip
        </Button>
      )}
    </>
  );
}

function DisplaySection() {
  const { lite, reduceAnimations } = useDisplay();
  return (
    <div className="settings-switches">
      <Switch label="Lite mode" description="Cheaper visuals for slower phones: solid panels and a lighter sky." checked={lite} onChange={setLite} />
      <Switch label="Reduce animations" description="Nothing moves. Every value and icon still shows." checked={reduceAnimations} onChange={setStill} />
    </div>
  );
}

function SignOutSection() {
  const signOut = useSignOut();
  return (
    <div className="signout">
      <p className="muted">You can sign back in any time. Your places and trips stay saved.</p>
      <Button variant="secondary" onClick={signOut}>
        <Icon name="sign-out" />
        Sign out
      </Button>
    </div>
  );
}

const CONTENT: Record<SectionId, () => ReactNode> = {
  details: () => <DetailsSection />,
  places: () => <PlacesSection />,
  trips: () => <TripsSection />,
  display: () => <DisplaySection />,
  signout: () => <SignOutSection />,
};

/** The selected section. Its title takes focus when the user moves to it, but not on a fresh page load. */
function SectionPanel({ id, moved, i }: { id: SectionId; moved: boolean; i: number }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const section = SECTIONS.find((s) => s.id === id);

  useEffect(() => {
    if (moved) heading.current?.focus({ preventScroll: true });
  }, [id, moved]);

  return (
    <section className="card glass e-card span-8 profile-panel" style={vars({ '--i': i })} aria-labelledby="section-h">
      <h2 id="section-h" ref={heading} tabIndex={-1} className="section-title">
        {section?.label}
      </h2>
      {/* The key resets an open edit form when moving to another section. */}
      <div key={id} className="section-body">
        {CONTENT[id]()}
      </div>
    </section>
  );
}

function SectionList({ active, wide }: { active: SectionId | null; wide: boolean }) {
  return (
    <nav className="card glass e-card settings" style={vars({ '--i': 0 })} aria-label="Profile sections">
      <ul>
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <Link to={`/profile?section=${section.id}`} replace={wide} preventScrollReset={wide} className="settings-row" aria-current={active === section.id ? 'true' : undefined}>
              <Icon name={section.icon} />
              <span className="row-main">
                <b>{section.label}</b>
                {!wide && <span className="muted small">{section.note}</span>}
              </span>
              <Icon name="caret-right" className="settings-caret" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function ProfilePage() {
  const wide = useMediaQuery('(min-width: 720px)');
  const [params] = useSearchParams();
  const raw = params.get('section');
  const chosen = SECTIONS.find((s) => s.id === raw)?.id ?? null;
  const active = chosen ?? (wide ? 'details' : null);
  // Moving between sections moves focus; opening the page doesn't.
  const firstActive = useRef(active);
  const moved = useRef(false);
  if (active !== firstActive.current) moved.current = true;

  if (wide) {
    return (
      <Page name="/profile">
        <div className="grid12">
          <div className={cx('side', 'span-4')}>
            <SectionList active={active} wide />
            <RightNow i={2} />
          </div>
          {active && <SectionPanel id={active} moved={moved.current} i={1} />}
        </div>
      </Page>
    );
  }
  return (
    <Page name="/profile">
      {active ? (
        <div className="profile-screen">
          <Link to="/profile" className="btn back-link">
            <Icon name="caret-left" />
            Profile
          </Link>
          <SectionPanel id={active} moved={moved.current} i={0} />
        </div>
      ) : (
        <>
          <SectionList active={null} wide={false} />
          <RightNow i={1} />
        </>
      )}
    </Page>
  );
}
