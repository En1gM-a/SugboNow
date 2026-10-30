import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { KindIcon, PlaceForm } from '@/components/locations/PlaceForm';
import { TripForm } from '@/components/schedule/TripForm';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { SelectField, TextField } from '@/components/ui/Controls';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Overlay';
import { EmptyState, ErrorState, LoadingLabel, Skeleton, SkeletonLines } from '@/components/ui/States';
import { useAuth } from '@/context/AuthContext';
import { useDeleteLocation, useDeleteTrip, useLocations, useSaveLocation, useSaveTrip, useSchedule } from '@/hooks/usePlaces';
import { useAreas, useLguSources, useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { fieldError } from '@/lib/apiClient';
import { toast } from '@/lib/toast';
import type { Location, Profile, ScheduleEntry } from '@/types/api';
import { formatClock, formatDays } from '@/utils/format';

export default function ProfilePage() {
  const { hash } = useLocation();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 300);
    return () => clearTimeout(t);
  }, [hash]);

  return (
    <div>
      <PageHeader title="Profile" subtitle={user?.email} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DetailsCard />
        <div className="space-y-4">
          <PlacesCard />
          <TripsCard />
          <Card>
            <CardHeader title="Account" icon="lock" />
            <p className="mb-3 text-sm text-muted">Signing out clears the info saved on this device.</p>
            <Button variant="danger" icon="logOut" onClick={() => void signOut()}>
              Sign out
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailsCard() {
  const profile = useProfile();
  return (
    <Card featured aria-labelledby="details-h" className="lg:self-start">
      <CardHeader id="details-h" title="Your details" icon="user" />
      {profile.isPending ? (
        <>
          <LoadingLabel />
          <SkeletonLines lines={8} />
        </>
      ) : profile.isError ? (
        <ErrorState onRetry={() => void profile.refetch()} />
      ) : (
        <DetailsForm profile={profile.data} />
      )}
    </Card>
  );
}

function DetailsForm({ profile }: { profile: Profile }) {
  const areas = useAreas();
  const sources = useLguSources();
  const locations = useLocations();
  const update = useUpdateProfile();
  const [form, setForm] = useState({
    displayName: profile.displayName ?? '',
    firstName: profile.firstName ?? '',
    city: profile.city ?? '',
    addressText: profile.addressText ?? '',
    subscribedMayor: profile.subscribedMayor ?? '',
    commuteOriginLocationId: profile.commuteOriginLocationId ?? '',
    commuteDestinationLocationId: profile.commuteDestinationLocationId ?? '',
  });
  const [saved, setSaved] = useState(0);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const err = (path: string) => fieldError(update.error, path);

  function submit(e: FormEvent) {
    e.preventDefault();
    const nul = (v: string) => (v.trim() ? v.trim() : null);
    update.mutate(
      {
        displayName: nul(form.displayName),
        firstName: nul(form.firstName),
        city: nul(form.city),
        addressText: nul(form.addressText),
        subscribedMayor: nul(form.subscribedMayor),
        commuteOriginLocationId: nul(form.commuteOriginLocationId),
        commuteDestinationLocationId: nul(form.commuteDestinationLocationId),
      },
      { onSuccess: () => setSaved((n) => n + 1) },
    );
  }

  const places = locations.data ?? [];
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First name" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} error={err('firstName')} hint="Used in your greeting." />
        <TextField label="Display name" autoComplete="nickname" value={form.displayName} onChange={set('displayName')} error={err('displayName')} />
      </div>
      <SelectField label="Home city" value={form.city} onChange={set('city')} error={err('city')} hint="Picks the weather in your brief.">
        <option value="">Choose…</option>
        {(areas.data ?? []).map((a) => (
          <option key={a.slug} value={a.slug}>
            {a.name}
          </option>
        ))}
      </SelectField>
      <TextField label="Address" autoComplete="street-address" value={form.addressText} onChange={set('addressText')} error={err('addressText')} placeholder="e.g. Guadalupe, Cebu City" />
      <SelectField
        label="Mayor to follow"
        value={form.subscribedMayor}
        onChange={set('subscribedMayor')}
        error={err('subscribedMayor')}
        hint="Cebu City, Mandaue and Lapu-Lapu decide their own class suspensions. Every other town follows the Province of Cebu."
      >
        <option value="">None</option>
        {(sources.data ?? []).map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.displayName}
            {s.officialName ? ` (${s.officialName})` : ''}
          </option>
        ))}
      </SelectField>
      <fieldset className="pt-2">
        <legend className="font-heading text-base font-semibold">Usual commute</legend>
        <p className="mb-3 text-sm text-muted">Shown on your traffic map, with the alerts along the way.</p>
        {places.length < 2 ? (
          <p className="text-sm text-muted">Save two or more places below to pick your commute.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="From" value={form.commuteOriginLocationId} onChange={set('commuteOriginLocationId')} error={err('commuteOriginLocationId')}>
              <option value="">Not set</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </SelectField>
            <SelectField label="To" value={form.commuteDestinationLocationId} onChange={set('commuteDestinationLocationId')} error={err('commuteDestinationLocationId')}>
              <option value="">Not set</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </SelectField>
          </div>
        )}
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" loading={update.isPending} success={saved}>
          Save details
        </Button>
      </div>
    </form>
  );
}

function PlacesCard() {
  const locations = useLocations();
  const save = useSaveLocation();
  const remove = useDeleteLocation();
  const [editing, setEditing] = useState<Location | 'new' | null>(null);

  function onDelete(l: Location) {
    remove.mutate(l.id, {
      onSuccess: () =>
        toast.info(`${l.label} deleted.`, {
          label: 'Undo',
          onClick: () => save.mutate({ input: { label: l.label, kind: l.kind, addressText: l.addressText, lat: l.lat, lng: l.lng } }),
        }),
    });
  }

  return (
    <Card aria-labelledby="places-h" id="places" className="scroll-mt-24">
      <CardHeader
        id="places-h"
        title="Saved places"
        icon="pin"
        action={
          <Button variant="ghost" size="sm" icon="plus" onClick={() => setEditing('new')}>
            Add place
          </Button>
        }
      />
      {locations.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : locations.isError ? (
        <ErrorState compact onRetry={() => void locations.refetch()} />
      ) : locations.data.length === 0 ? (
        <EmptyState compact title="No places yet" action={<Button size="sm" icon="plus" onClick={() => setEditing('new')}>Add your home</Button>}>
          Save home, school and work so alerts near them reach you.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {locations.data.map((l) => (
            <li key={l.id} className="flex items-center gap-3 py-2.5">
              <KindIcon kind={l.kind} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{l.label}</p>
                <p className="truncate text-sm text-muted">{l.addressText}</p>
              </div>
              <button type="button" onClick={() => setEditing(l)} aria-label={`Edit ${l.label}`} className="flex size-11 items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-stone-100 hover:text-ink">
                <Icon name="pencil" size={18} />
              </button>
              <button type="button" onClick={() => onDelete(l)} aria-label={`Delete ${l.label}`} className="flex size-11 items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-status-high-soft hover:text-status-high">
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add a place' : 'Edit place'}>
        {editing !== null && (
          <PlaceForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            defaultKind={locations.data?.some((l) => l.kind === 'home') ? 'school' : 'home'}
            onCancel={() => setEditing(null)}
            onSubmit={(input) =>
              save.mutateAsync({ id: editing === 'new' ? undefined : editing.id, input }).then(() => {
                setEditing(null);
                toast.success('Place saved.');
              })
            }
          />
        )}
      </Sheet>
    </Card>
  );
}

function TripsCard() {
  const schedule = useSchedule();
  const locations = useLocations();
  const save = useSaveTrip();
  const remove = useDeleteTrip();
  const [editing, setEditing] = useState<ScheduleEntry | 'new' | null>(null);

  function onDelete(t: ScheduleEntry) {
    remove.mutate(t.id, {
      onSuccess: () =>
        toast.info(`${t.title} deleted.`, {
          label: 'Undo',
          onClick: () =>
            save.mutate({ input: { title: t.title, daysOfWeek: t.daysOfWeek, arriveBy: t.arriveBy, originLocationId: t.originLocationId, destinationLocationId: t.destinationLocationId } }),
        }),
    });
  }

  return (
    <Card aria-labelledby="trips-h" id="trips" className="scroll-mt-24">
      <CardHeader
        id="trips-h"
        title="Weekly trips"
        icon="calendar"
        action={
          <Button variant="ghost" size="sm" icon="plus" onClick={() => setEditing('new')}>
            Add trip
          </Button>
        }
      />
      {schedule.isPending ? (
        <Skeleton className="h-16 rounded-xl" />
      ) : schedule.isError ? (
        <ErrorState compact onRetry={() => void schedule.refetch()} />
      ) : schedule.data.length === 0 ? (
        <EmptyState compact title="No trips yet" action={<Button size="sm" icon="plus" onClick={() => setEditing('new')}>Add a trip</Button>}>
          Tell us when you need to arrive, and we’ll suggest when to leave.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {schedule.data.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-mactan-sea-soft text-mactan-sea-dark">
                <Icon name="clock" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t.title}</p>
                <p className="text-sm text-muted tabular-nums">
                  {formatDays(t.daysOfWeek)} · arrive {formatClock(t.arriveBy)} · {t.origin.label} <Icon name="arrowRight" size={14} label="to" className="mx-0.5 inline align-[-2px]" /> {t.destination.label}
                </p>
              </div>
              <button type="button" onClick={() => setEditing(t)} aria-label={`Edit ${t.title}`} className="flex size-11 items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-stone-100 hover:text-ink">
                <Icon name="pencil" size={18} />
              </button>
              <button type="button" onClick={() => onDelete(t)} aria-label={`Delete ${t.title}`} className="flex size-11 items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-status-high-soft hover:text-status-high">
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add a weekly trip' : 'Edit trip'}>
        {editing !== null && (
          <TripForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            places={locations.data ?? []}
            onCancel={() => setEditing(null)}
            onSubmit={(input) =>
              save.mutateAsync({ id: editing === 'new' ? undefined : editing.id, input }).then(() => {
                setEditing(null);
                toast.success('Trip saved.');
              })
            }
          />
        )}
      </Sheet>
    </Card>
  );
}
