// Skippable 3-step onboarding after sign-up: (1) name and city, (2) mayor, (3) places and a first trip.
// One step at a time with a progress indicator (progressive disclosure).

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/layout/AppShell';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { KindIcon, PlaceForm } from '@/components/locations/PlaceForm';
import { TripForm } from '@/components/schedule/TripForm';
import { Button } from '@/components/ui/Button';
import { SinulogRibbon } from '@/components/ui/Card';
import { SelectField, TextField } from '@/components/ui/Controls';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/States';
import { useFormErrors } from '@/hooks/useFormErrors';
import { useLocations, useSaveLocation, useSaveTrip, useSchedule } from '@/hooks/usePlaces';
import { useAreas, useLguSources, useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { toast } from '@/lib/toast';
import type { LocationKind } from '@/types/api';
import { cx } from '@/utils/cx';

const STEPS = ['About you', 'Your mayor', 'Places & trip'];
const HUC: Record<string, string> = { cebu_city: 'cebu_city', mandaue_city: 'mandaue_city', lapu_lapu_city: 'lapu_lapu_city' };

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const finish = () => navigate('/', { replace: true });
  const firstStep = useRef(true);

  // Each step replaces the one before it, so move focus to the new step's heading.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    document.querySelector<HTMLElement>('[data-step-heading]')?.focus();
  }, [step]);

  return (
    <div className="min-h-dvh">
      <header className="bg-mactan-navy">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="onDark" size="sm" onClick={finish}>
              Skip for now
            </Button>
          </div>
        </div>
        <SinulogRibbon />
      </header>
      <main id="main" className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? 'step' : undefined}>
              <div className={cx('h-1.5 rounded-full transition-colors duration-200', i <= step ? 'bg-mactan-sea' : 'bg-stone-200')} />
              <p className={cx('mt-1.5 text-xs font-semibold sm:text-sm', i === step ? 'text-ink' : 'text-muted')}>
                <span className="sr-only">Step {i + 1} of 3: </span>
                {s}
                {i < step && <Icon name="check" size={14} className="ml-1 inline text-status-ok" />}
              </p>
            </li>
          ))}
        </ol>
        <div key={step} className="animate-page-in rounded-2xl border border-line bg-surface p-5 shadow-card motion-reduce:animate-fade-in sm:p-7">
          {step === 0 && <StepAboutYou onNext={() => setStep(1)} />}
          {step === 1 && <StepMayor onBack={() => setStep(0)} onNext={() => setStep(2)} />}
          {step === 2 && <StepPlaces onBack={() => setStep(1)} onDone={finish} />}
        </div>
      </main>
    </div>
  );
}

function StepHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h1 tabIndex={-1} data-step-heading className="text-2xl font-bold tracking-tight outline-none">
        {title}
      </h1>
      {children && <p className="mt-1 text-muted">{children}</p>}
    </div>
  );
}

function StepAboutYou({ onNext }: { onNext: () => void }) {
  const profile = useProfile();
  const areas = useAreas();
  const update = useUpdateProfile();
  const signupName = (useLocation().state as { name?: string } | null)?.name?.split(' ')[0];
  // null = untouched, so the saved profile value shows until the user types.
  const [firstName, setFirstName] = useState<string | null>(signupName ?? null);
  const [city, setCity] = useState<string | null>(null);
  const name = firstName ?? profile.data?.firstName ?? '';
  const area = city ?? profile.data?.city ?? '';
  const { formRef, shown, blur, validate } = useFormErrors(
    { firstName: name.trim() ? undefined : 'Tell us your first name.', city: area ? undefined : 'Pick your city or town.' },
    ['firstName', 'city'] as const,
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    update.mutate({ firstName: name.trim(), city: area }, { onSuccess: onNext });
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <StepHeading title="Maayong pag-abot!">Let’s make your brief yours. What should we call you, and where do you live?</StepHeading>
      <div className="space-y-4">
        <TextField label="First name" name="firstName" autoComplete="given-name" value={name} onChange={(e) => setFirstName(e.target.value)} onBlur={blur('firstName')} error={shown.firstName} />
        {areas.isPending ? (
          <Skeleton className="h-[72px] rounded-xl" />
        ) : (
          <SelectField label="Home city" name="city" value={area} onChange={(e) => setCity(e.target.value)} onBlur={blur('city')} hint="We’ll show this area’s weather first." error={shown.city}>
            <option value="">Choose…</option>
            {(areas.data ?? []).map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </SelectField>
        )}
      </div>
      <div className="mt-6 flex justify-end">
        <Button type="submit" loading={update.isPending}>
          Next
        </Button>
      </div>
    </form>
  );
}

function StepMayor({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const profile = useProfile();
  const sources = useLguSources();
  const update = useUpdateProfile();
  const suggested = profile.data?.city ? (HUC[profile.data.city] ?? 'cebu_province') : 'cebu_city';
  const [picked, setPicked] = useState<string | null>(null);
  const value = picked ?? profile.data?.subscribedMayor ?? suggested;

  return (
    <>
      <StepHeading title="Whose announcements do you follow?">We’ll show their latest Facebook posts and class suspensions.</StepHeading>
      <div className="mb-4 flex items-start gap-2 rounded-xl bg-mactan-sea-soft p-3 text-sm text-ink">
        <Icon name="info" size={18} className="mt-0.5 text-mactan-sea" />
        <p>
          <strong>Cebu City, Mandaue and Lapu-Lapu</strong> decide their own class suspensions. Every other town, like Talisay, Consolacion or Minglanilla, follows the <strong>Province of Cebu</strong>.
        </p>
      </div>
      <fieldset>
        <legend className="sr-only">Choose an LGU</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {sources.isPending && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          {(sources.data ?? []).map((s) => (
            <label
              key={s.slug}
              className={cx(
                'flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-mactan-sea',
                value === s.slug ? 'border-mactan-sea bg-mactan-sea-soft/60' : 'border-line hover:border-mactan-sea/50',
              )}
            >
              <input type="radio" name="mayor" value={s.slug} checked={value === s.slug} onChange={() => setPicked(s.slug)} className="sr-only" />
              <span className={cx('flex size-5 shrink-0 items-center justify-center rounded-full border-2', value === s.slug ? 'border-mactan-sea' : 'border-stone-400')}>
                {value === s.slug && <span className="size-2.5 rounded-full bg-mactan-sea" />}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{s.displayName}</span>
                <span className="block text-sm text-muted capitalize">
                  {s.officialName ?? s.officialTitle}
                  {s.slug === suggested && <span className="ml-1 font-semibold text-status-ok normal-case">· Suggested for you</span>}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-6 flex justify-between gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button loading={update.isPending} onClick={() => update.mutate({ subscribedMayor: value }, { onSuccess: onNext })}>
          Next
        </Button>
      </div>
    </>
  );
}

function StepPlaces({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const locations = useLocations();
  const schedule = useSchedule();
  const saveLoc = useSaveLocation();
  const saveTrip = useSaveTrip();
  const update = useUpdateProfile();
  const places = locations.data ?? [];
  const nextKind: LocationKind = !places.some((p) => p.kind === 'home') ? 'home' : !places.some((p) => p.kind === 'school') ? 'school' : 'work';
  const [adding, setAdding] = useState(places.length === 0);
  const hasTrip = (schedule.data?.length ?? 0) > 0;

  return (
    <>
      <StepHeading title="Where do you go each week?">Save your places, then add one trip so we can suggest a leave time.</StepHeading>

      {places.length > 0 && (
        <ul className="mb-4 divide-y divide-line border-y border-line">
          {places.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <KindIcon kind={p.kind} size="sm" />
              <span className="font-semibold">{p.label}</span>
              <span className="truncate text-sm text-muted">{p.addressText}</span>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold">{places.length ? 'Add another place' : 'Add your first place'}</h2>
          <PlaceForm
            key={places.length}
            defaultKind={nextKind}
            submitLabel="Save place"
            onCancel={places.length ? () => setAdding(false) : undefined}
            onSubmit={(input) =>
              saveLoc.mutateAsync({ input }).then((loc) => {
                setAdding(false);
                toast.success(`${loc.label} saved.`);
              })
            }
          />
        </div>
      ) : (
        <Button variant="secondary" icon="plus" onClick={() => setAdding(true)}>
          Add another place
        </Button>
      )}

      {places.length >= 2 && !adding && (
        <div className="mt-6 border-t border-line pt-5">
          <h2 className="mb-3 text-lg font-semibold">{hasTrip ? 'Your first trip is saved' : 'Your first weekly trip'}</h2>
          {hasTrip ? (
            <p className="flex items-center gap-2 text-status-ok">
              <Icon name="checkCircle" size={20} /> {schedule.data![0].title}: {schedule.data![0].origin.label} <Icon name="arrowRight" size={14} label="to" className="mx-0.5 inline align-[-2px]" /> {schedule.data![0].destination.label}
            </p>
          ) : (
            <TripForm
              places={places}
              submitLabel="Save trip"
              onSubmit={(input) =>
                saveTrip.mutateAsync({ input }).then(() =>
                  update.mutateAsync({ commuteOriginLocationId: input.originLocationId, commuteDestinationLocationId: input.destinationLocationId }),
                )
              }
            />
          )}
        </div>
      )}

      <div className="mt-6 flex justify-between gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onDone}>{hasTrip ? 'Go to my brief' : 'Finish'}</Button>
      </div>
    </>
  );
}
