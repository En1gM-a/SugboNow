// Onboarding (/welcome, handoff <pages> page 3 and signup.md): one glass card on the sky, one question at a time. The
// name, city, address and mayor were saved at sign-up, so this only asks for two places (each with a map pin) and a
// first weekly trip. "Skip for now" is always there, and anything already saved stays saved.

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import { PlaceForm } from '@/components/locations/PlaceForm';
import { Logo } from '@/components/Logo';
import { TripForm } from '@/components/schedule/TripForm';
import { CardError } from '@/components/today/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLocations, useSaveLocation, useSaveTrip, useSchedule } from '@/hooks/usePlaces';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { EntranceContext, usePageEntrance } from '@/lib/entrance';
import { prefetchToday } from '@/lib/nav';
import type { LocationInput, LocationKind, ScheduleInput } from '@/types/api';
import { vars } from '@/utils/cx';

type Step = 'home' | 'place' | 'extra' | 'trip' | 'done';

const PROGRESS: Record<Step, number> = { home: 1 / 3, place: 2 / 3, extra: 2 / 3, trip: 1, done: 1 };
const STEP_LABEL: Record<Step, string> = { home: 'Step 1 of 3', place: 'Step 2 of 3', extra: 'Step 2 of 3', trip: 'Step 3 of 3', done: 'All done' };
const OTHER_KINDS: readonly LocationKind[] = ['school', 'work', 'other'];

// Each step slides in the direction of travel: Next from the right, Back from the left (handoff <motion>).
const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 16 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -16, transition: { duration: 0.12 } }),
};

/** The step's question. It takes focus when the user moves to it, so screen readers hear the new step. */
function StepHeading({ title, takeFocus, children }: { title: string; takeFocus: boolean; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (takeFocus) ref.current?.focus({ preventScroll: true });
    // Runs once, when the step mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="step-head">
      <h1 ref={ref} tabIndex={-1}>
        {title}
      </h1>
      <p className="muted">{children}</p>
    </div>
  );
}

export default function WelcomePage() {
  const entrance = usePageEntrance('/welcome');
  const navigate = useNavigate();
  const profile = useProfile();
  const locations = useLocations();
  const schedule = useSchedule();
  const saveLocation = useSaveLocation();
  const saveTrip = useSaveTrip();
  const updateProfile = useUpdateProfile();
  const location = useLocation();
  const [step, setStep] = useState<Step | null>(null);
  const [direction, setDirection] = useState(1);
  // Focus goes to the question on every step and when arriving from sign-up, but not on a fresh page load.
  const moved = useRef(location.key !== 'default');

  const places = locations.data ?? [];
  const loading = locations.isPending || schedule.isPending || profile.isPending;
  const failed = locations.isError || schedule.isError;

  // Pick up where the user left off, once we know what's saved.
  if (step === null && !loading && !failed) {
    setStep((schedule.data?.length ?? 0) > 0 ? 'done' : places.length >= 2 ? 'trip' : places.length === 1 ? 'place' : 'home');
  }

  function go(next: Step, dir: 1 | -1) {
    moved.current = true;
    setDirection(dir);
    setStep(next);
  }

  function finish() {
    prefetchToday();
    navigate('/', { replace: true });
  }

  async function savePlace(input: LocationInput, id: string | undefined) {
    await saveLocation.mutateAsync({ id, input });
  }

  async function saveFirstTrip(input: ScheduleInput) {
    await saveTrip.mutateAsync({ input });
    await updateProfile.mutateAsync({ commuteOriginLocationId: input.originLocationId, commuteDestinationLocationId: input.destinationLocationId });
    finish();
  }

  let body: ReactNode = null;
  if (step === 'home') {
    const saved = places[0];
    body = (
      <>
        <StepHeading title="Where's home?" takeFocus={moved.current}>
          Pin it, so alerts near home reach you.
        </StepHeading>
        <PlaceForm
          idBase="w-home"
          initial={saved}
          kinds={['home']}
          defaultAddress={profile.data?.addressText ?? ''}
          submitLabel="Next"
          onSubmit={async (input) => {
            await savePlace(input, saved?.id);
            go(places.length >= 2 ? 'trip' : 'place', 1);
          }}
        />
      </>
    );
  } else if (step === 'place') {
    const saved = places[1];
    body = (
      <>
        <StepHeading title="Where do you go most?" takeFocus={moved.current}>
          School, work or anywhere you go every week. A trip needs two places.
        </StepHeading>
        <PlaceForm
          idBase="w-place"
          initial={saved}
          kinds={OTHER_KINDS}
          submitLabel="Next"
          cancelLabel="Back"
          onCancel={() => go('home', -1)}
          onSubmit={async (input) => {
            await savePlace(input, saved?.id);
            go('trip', 1);
          }}
        />
      </>
    );
  } else if (step === 'extra') {
    body = (
      <>
        <StepHeading title="Add another place" takeFocus={moved.current}>
          You can add more later in Profile.
        </StepHeading>
        <PlaceForm
          idBase="w-extra"
          kinds={OTHER_KINDS}
          defaultKind="work"
          submitLabel="Next"
          cancelLabel="Back"
          onCancel={() => go('trip', -1)}
          onSubmit={async (input) => {
            await savePlace(input, undefined);
            go('trip', 1);
          }}
        />
      </>
    );
  } else if (step === 'trip') {
    body = (
      <>
        <StepHeading title="Add your first trip" takeFocus={moved.current}>
          Tell us when you need to arrive, and we&apos;ll tell you when to leave.
        </StepHeading>
        <TripForm idBase="w-trip" places={places} submitLabel="Finish" cancelLabel="Back" onCancel={() => go('place', -1)} onSubmit={saveFirstTrip} />
        <button type="button" className="btn btn-quiet add-more" onClick={() => go('extra', 1)}>
          <Icon name="plus" />
          Add another place
        </button>
      </>
    );
  } else if (step === 'done') {
    body = (
      <>
        <StepHeading title="You're all set" takeFocus={moved.current}>
          Your places and your first trip are saved. Change them any time in Profile.
        </StepHeading>
        <Button onClick={finish}>Go to Today</Button>
      </>
    );
  }

  return (
    <EntranceContext.Provider value={entrance}>
      <main id="main" tabIndex={-1} className="page-host">
        <div className="page welcome-page" data-entrance={entrance.start !== null && entrance.mode !== 'none' ? entrance.mode : undefined}>
          <section className="card glass e-card welcome-card" style={vars({ '--i': 0 })} aria-label="Set up SugboNow">
            <div className="welcome-top">
              <Logo />
              <button type="button" className="btn btn-quiet" onClick={finish}>
                Skip for now
              </button>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-label="Setup progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((step ? PROGRESS[step] : 0) * 100)}
              aria-valuetext={step ? STEP_LABEL[step] : 'Loading'}
            >
              <i style={vars({ '--p': step ? PROGRESS[step] : 0 })} />
            </div>
            {failed ? (
              <CardError
                what="your saved places"
                onRetry={() => {
                  void locations.refetch();
                  void schedule.refetch();
                }}
              />
            ) : step === null ? (
              <div className="post-skel" aria-hidden="true">
                <Skeleton className="skel-line w-48" />
                <Skeleton className="skel-row" />
                <Skeleton className="skel-row" />
                <Skeleton className="pin-skel" />
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <m.div key={step} className="step" custom={direction} variants={slide} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', visualDuration: 0.22, bounce: 0 }}>
                  {body}
                </m.div>
              </AnimatePresence>
            )}
          </section>
        </div>
      </main>
    </EntranceContext.Provider>
  );
}
