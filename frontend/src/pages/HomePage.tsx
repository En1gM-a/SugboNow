// The signed-out home page at /login and /signup (handoff <pages>, pages 1 and 2): hero copy on the left and one glass
// card on the right holding both the sign-in and the sign-up form. Switching forms and logging in run the jeepney ride
// (handoff <motion>, "The jeepney ride").

import * as m from 'motion/react-m';
import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Field, PasswordField, SelectField } from '@/components/auth/Field';
import { CountUp } from '@/components/CountUp';
import { LiveIcon } from '@/components/LiveIcon';
import { Logo } from '@/components/Logo';
import { RiseWords } from '@/components/RiseWords';
import { RollNumber } from '@/components/RollNumber';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { useAuth, type SignUpDetails } from '@/context/AuthContext';
import { useDisplay } from '@/lib/display';
import { EntranceContext, type Entrance } from '@/lib/entrance';
import { loadWelcomePage, prefetchToday } from '@/lib/nav';
import { loadRide, loginRide } from '@/lib/rideBridge';
import { CLASS_SUSPENSION_NOTE, HOME_CITIES, MAYORS, suggestedMayor } from '@/lib/signupOptions';
import { USE_MOCKS } from '@/lib/supabaseClient';
import { cx, vars } from '@/utils/cx';

type FormName = 'login' | 'signup';

const PATH: Record<FormName, string> = { login: '/login', signup: '/signup' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const messageOf = (err: unknown) => (err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.');

/** Which form plays its entrance (the h2 words, then the rows 40 ms later), and from when. */
interface FormPlay {
  form: FormName;
  token: number;
  delay: number;
}

interface FormProps {
  active: boolean;
  play: FormPlay | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** True while a ride runs: the card is inert. */
  locked: boolean;
  onSwitch: () => void;
}

const playAttr = (play: FormPlay | null) => (play ? (play.token % 2 ? 'b' : 'a') : undefined);

function SignInForm({ active, play, headingRef, locked, onSwitch, onSignIn, onReset }: FormProps & {
  onSignIn: (email: string, password: string) => Promise<string | null>;
  onReset: (email: string) => Promise<string | null>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || locked) return;
    const next: typeof errors = {};
    if (!EMAIL.test(email.trim())) next.email = 'Enter the email you signed up with, like thea@example.com.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    setMessage(null);
    if (next.email) return emailInput.current?.focus();
    if (next.password) return passwordInput.current?.focus();
    setBusy(true);
    const error = await onSignIn(email.trim(), password);
    // On success the button stays busy until the ride has taken the user into the app.
    if (error) {
      setBusy(false);
      setMessage({ error: true, text: error });
    }
  }

  async function forgot() {
    if (!EMAIL.test(email.trim())) {
      setErrors({ email: 'Enter your email first, then tap "Forgot password?" again.' });
      emailInput.current?.focus();
      return;
    }
    setErrors({});
    const error = await onReset(email.trim());
    setMessage(error ? { error: true, text: error } : { error: false, text: `We sent a reset link to ${email.trim()}. Check your inbox.` });
  }

  let row = 0;
  return (
    <form
      className={cx('auth-form', !active && 'off')}
      inert={!active}
      noValidate
      onSubmit={submit}
      data-play={active ? playAttr(play) : undefined}
      style={vars({ '--form-delay': `${play?.delay ?? 0}ms` })}
      aria-labelledby="h-login"
    >
      {/* The h2 stays put (it takes focus after a switch); only its words remount to rise again. */}
      <h2 id="h-login" ref={headingRef} tabIndex={-1}>
        <RiseWords key={play?.token ?? 'still'} text="Sign in" play={active && Boolean(play)} delay={play?.delay ?? 0} />
      </h2>
      <p className="sub" data-row style={vars({ '--k': row++ })}>
        Maayong pagbalik! Use your SugboNow account.
      </p>
      {USE_MOCKS && (
        <p className="demo-note" data-row style={vars({ '--k': row++ })}>
          <Tag tone="quiet">Demo</Tag>
          Any email and a password of 6 or more characters signs you in.
        </p>
      )}
      <Field
        id="li-email"
        row={row++}
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        ref={emailInput}
      />
      <PasswordField
        id="li-pass"
        row={row++}
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        ref={passwordInput}
        action={
          <button type="button" className="btn btn-quiet forgot" onClick={forgot}>
            Forgot password?
          </button>
        }
      />
      <div data-row style={vars({ '--k': row++ })}>
        <Button type="submit" variant="primary" busy={busy} className="w-full">
          Sign in
        </Button>
      </div>
      {message && (
        <p className={cx('form-msg', message.error && 'is-error')} role={message.error ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
      <p className="form-switch" data-row style={vars({ '--k': row++ })}>
        New to SugboNow?
        <Button variant="secondary" onClick={onSwitch} disabled={locked}>
          Sign up
        </Button>
      </p>
    </form>
  );
}

type SignUpErrors = Partial<Record<'firstName' | 'email' | 'password' | 'confirm' | 'city' | 'address' | 'mayor', string>>;

// The two steps share one grid cell, so the card never jumps, and move like onboarding steps (handoff <motion>).
const STEP_SPRING = { type: 'spring', visualDuration: 0.22, bounce: 0 } as const;

/**
 * Sign up, in two steps (handoff: signup.md). The form is signed out, so step 2's lists come from signupOptions.ts, and
 * a database trigger saves the details when the account is created. Going back keeps what was typed.
 */
function SignUpForm({ active, play, headingRef, locked, onSwitch, onSignUp }: FormProps & {
  onSignUp: (details: SignUpDetails) => Promise<{ error?: string; checkEmail?: boolean }>;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [mayor, setMayor] = useState('');
  // Choosing a city suggests a mayor, until the user picks one themselves.
  const [mayorPicked, setMayorPicked] = useState(false);
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const stepped = useRef(false);
  const inputs = {
    firstName: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    confirm: useRef<HTMLInputElement>(null),
    city: useRef<HTMLSelectElement>(null),
    address: useRef<HTMLInputElement>(null),
    mayor: useRef<HTMLSelectElement>(null),
  };

  // Each step replaces the one before it, so focus moves to the new step's title.
  useEffect(() => {
    if (stepped.current) headingRef.current?.focus({ preventScroll: true });
  }, [step, headingRef]);

  // "Check your email" replaces the form, so focus moves to its title. Leaving it starts the form fresh next time.
  useEffect(() => {
    if (!checkEmail) return;
    if (active) {
      headingRef.current?.focus({ preventScroll: true });
    } else {
      setCheckEmail(null);
      setStep(1);
    }
  }, [active, checkEmail, headingRef]);

  function moveTo(next: 1 | 2) {
    stepped.current = true;
    setErrors({});
    setMessage(null);
    setStep(next);
  }

  function next(e: FormEvent) {
    e.preventDefault();
    if (locked) return;
    const found: SignUpErrors = {};
    if (!firstName.trim()) found.firstName = 'Enter your first name.';
    if (!EMAIL.test(email.trim())) found.email = 'Enter an email you can open, like thea@example.com.';
    if (password.length < 8) found.password = 'Use at least 8 characters.';
    if (confirm !== password) found.confirm = "The two passwords don't match.";
    setErrors(found);
    const first = (['firstName', 'email', 'password', 'confirm'] as const).find((k) => found[k]);
    if (first) return inputs[first].current?.focus();
    moveTo(2);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || locked) return;
    const found: SignUpErrors = {};
    if (!city) found.city = 'Pick your city or town.';
    if (!address.trim()) found.address = 'Add your barangay or street.';
    if (!mayor) found.mayor = 'Pick the mayor to follow.';
    setErrors(found);
    setMessage(null);
    const first = (['city', 'address', 'mayor'] as const).find((k) => found[k]);
    if (first) return inputs[first].current?.focus();
    setBusy(true);
    const result = await onSignUp({ firstName: firstName.trim(), email: email.trim(), password, city, addressText: address.trim(), subscribedMayor: mayor });
    if (result.error) {
      setBusy(false);
      setMessage(result.error);
    } else if (result.checkEmail) {
      setBusy(false);
      setCheckEmail(email.trim());
    }
  }

  let row = 0;
  let rowTwo = 0;
  return (
    <form
      className={cx('auth-form', !active && 'off')}
      inert={!active}
      noValidate
      onSubmit={step === 1 ? next : submit}
      data-play={active ? playAttr(play) : undefined}
      style={vars({ '--form-delay': `${play?.delay ?? 0}ms` })}
      aria-labelledby={checkEmail || step === 1 ? 'h-signup' : 'h-signup-2'}
    >
      {checkEmail ? (
        <>
          <h2 id="h-signup" ref={headingRef} tabIndex={-1}>
            Check your email
          </h2>
          <p className="sub">We sent a confirmation link to {checkEmail}. Open it to add your places and a first trip.</p>
          <p className="form-switch">
            Already have an account?
            <Button variant="secondary" onClick={onSwitch} disabled={locked}>
              Sign in instead
            </Button>
          </p>
        </>
      ) : (
        <div className="su-steps">
          <m.div className={cx('su-step', step !== 1 && 'off')} inert={step !== 1} initial={false} animate={{ opacity: step === 1 ? 1 : 0, x: step === 1 ? 0 : -16 }} transition={STEP_SPRING}>
            <h2 id="h-signup" ref={step === 1 ? headingRef : undefined} tabIndex={-1}>
              <RiseWords key={play?.token ?? 'still'} text="Create your account" play={active && Boolean(play)} delay={play?.delay ?? 0} />
            </h2>
            <p className="sub" data-row style={vars({ '--k': row++ })}>
              Bag-o ka diri? Next you tell us where you live and which mayor to follow.
            </p>
            <Field id="su-name" row={row++} label="First name" autoComplete="given-name" maxLength={40} value={firstName} onChange={(e) => setFirstName(e.target.value)} error={errors.firstName} ref={inputs.firstName} />
            <Field
              id="su-email"
              row={row++}
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              ref={inputs.email}
            />
            <PasswordField
              id="su-pass"
              row={row++}
              label="Password (at least 8 characters)"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              ref={inputs.password}
            />
            <PasswordField
              id="su-confirm"
              row={row++}
              label="Confirm password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors.confirm}
              ref={inputs.confirm}
            />
            <div data-row style={vars({ '--k': row++ })}>
              <Button type="submit" variant="primary" className="w-full">
                Next
              </Button>
            </div>
            <p className="form-switch" data-row style={vars({ '--k': row++ })}>
              Already riding with us?
              <Button variant="secondary" onClick={onSwitch} disabled={locked}>
                Sign in
              </Button>
            </p>
          </m.div>
          <m.div className={cx('su-step', step !== 2 && 'off')} inert={step !== 2} initial={false} animate={{ opacity: step === 2 ? 1 : 0, x: step === 2 ? 0 : 16 }} transition={STEP_SPRING}>
            <h2 id="h-signup-2" ref={step === 2 ? headingRef : undefined} tabIndex={-1}>
              Where you live
            </h2>
            <p className="sub" data-row style={vars({ '--k': rowTwo++ })}>
              Asa ka nagpuyo? This sets your weather and whose class suspensions you see.
            </p>
            <SelectField
              id="su-city"
              row={rowTwo++}
              label="Home city"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                if (!mayorPicked && e.target.value) setMayor(suggestedMayor(e.target.value));
              }}
              error={errors.city}
              ref={inputs.city}
            >
              <option value="">Choose your city or town</option>
              {HOME_CITIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </SelectField>
            <Field
              id="su-address"
              row={rowTwo++}
              label="Address"
              autoComplete="street-address"
              maxLength={200}
              hint="A barangay or street is enough."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              error={errors.address}
              ref={inputs.address}
            />
            <SelectField
              id="su-mayor"
              row={rowTwo++}
              label="Mayor to follow"
              value={mayor}
              hint={CLASS_SUSPENSION_NOTE}
              onChange={(e) => {
                setMayor(e.target.value);
                setMayorPicked(true);
              }}
              error={errors.mayor}
              ref={inputs.mayor}
            >
              <option value="">Choose a mayor</option>
              {MAYORS.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            <div className="form-actions" data-row style={vars({ '--k': rowTwo++ })}>
              <Button variant="secondary" onClick={() => moveTo(1)} disabled={busy}>
                Back
              </Button>
              <Button type="submit" variant="primary" busy={busy} className="grow">
                Create account
              </Button>
            </div>
            {message && (
              <p className="form-msg is-error" role="alert">
                {message}
              </p>
            )}
          </m.div>
        </div>
      )}
    </form>
  );
}

export default function HomePage() {
  const { status, signIn, signUp, resetPassword } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { still } = useDisplay();
  const form: FormName = location.pathname === '/signup' ? 'signup' : 'login';
  const card = useRef<HTMLDivElement>(null);
  const loginHeading = useRef<HTMLHeadingElement>(null);
  const signupHeading = useRef<HTMLHeadingElement>(null);
  const shownForm = useRef<FormName>(form);
  // The home entrance plays when the page loads and after sign-out (each time this page mounts).
  const [play] = useState(() => !still);
  const [start] = useState(() => performance.now());
  const [formPlay, setFormPlay] = useState<FormPlay | null>(() => (still ? null : { form, token: 0, delay: 300 }));
  const [riding, setRiding] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    // Coming here from inside the app (after sign-out): move focus to the form's title.
    if (location.key !== 'default') (form === 'login' ? loginHeading : signupHeading).current?.focus({ preventScroll: true });
    // Runs once, on mount.
  }, []);

  // Back and Forward between /login and /signup, or opening either URL: the right form, with no ride.
  useEffect(() => {
    if (shownForm.current === form) return;
    shownForm.current = form;
    if (!still) setFormPlay({ form, token: Date.now(), delay: 40 });
  }, [form, still]);

  // Covered and signed in: into the app. Waiting for both means the protected route never sees a signed-out state.
  useEffect(() => {
    if (!destination || status !== 'signedIn') return;
    if (still) {
      loginRide.cancel();
      navigate(destination, { replace: true });
      return;
    }
    void loginRide.finish(() => navigate(destination, { replace: true }));
  }, [destination, status, still, navigate]);

  /** Sign in ↔ sign up: the jeepney's smoke covers the card, the forms swap under it, and the new form enters. */
  async function switchTo(next: FormName) {
    if (riding || next === form) return;
    const swap = () => {
      shownForm.current = next;
      navigate(PATH[next], { flushSync: true });
      if (!still) setFormPlay({ form: next, token: Date.now(), delay: 40 });
      (next === 'login' ? loginHeading : signupHeading).current?.focus({ preventScroll: true });
    };
    if (still || !card.current) return swap();
    setRiding(true);
    try {
      const ride = await loadRide();
      // The new form is usable 0.6 s after the press: covered, swapped, then the smoke clears while it enters.
      await ride.coverCard(card.current);
      flushSync(() => setRiding(false));
      swap();
      void ride.clearSmoke();
    } catch {
      setRiding(false);
      swap();
    }
  }

  /** After sign-in or sign-up succeeds: the same ride, but the smoke covers the whole screen. */
  async function rideInto(path: string) {
    prefetchToday();
    if (!still && card.current) {
      try {
        const ride = await loadRide();
        await ride.coverScreen(card.current);
      } catch {
        // No ride (its code failed to load): go straight in.
      }
    }
    setDestination(path);
  }

  async function handleSignIn(email: string, password: string): Promise<string | null> {
    loginRide.begin();
    try {
      await signIn(email, password);
    } catch (err) {
      loginRide.cancel();
      return messageOf(err);
    }
    await rideInto('/');
    return null;
  }

  async function handleSignUp(details: SignUpDetails) {
    loginRide.begin();
    try {
      const { needsConfirmation } = await signUp(details);
      if (needsConfirmation) {
        loginRide.cancel();
        return { checkEmail: true };
      }
    } catch (err) {
      loginRide.cancel();
      return { error: messageOf(err) };
    }
    void loadWelcomePage();
    await rideInto('/welcome');
    return {};
  }

  async function handleReset(email: string): Promise<string | null> {
    try {
      await resetPassword(email);
      return null;
    } catch (err) {
      return messageOf(err);
    }
  }

  // A session restored on page load goes straight to Today, with no ride.
  if (status === 'signedIn' && !loginRide.holding && !destination) return <Navigate to="/" replace />;

  const entrance: Entrance = { mode: play ? 'first' : 'none', start };

  return (
    <EntranceContext.Provider value={entrance}>
      <div className="home" data-play={play ? '' : undefined}>
        <div className="home-shade" aria-hidden="true" />
        <header className="home-top">
          <Logo onSky />
          <ThemeSwitch onSky />
        </header>
        <main id="main" className="home-grid" tabIndex={-1}>
          <section className="hero" aria-labelledby="hero-h">
            <RiseWords as="h1" id="hero-h" className="display" variant="big" text="Know when to leave, rain or shine." play={play} />
            <p className="lede" data-enter style={vars({ '--k': 0 })}>
              SugboNow checks Cebu traffic, weather, floods and your mayor&apos;s posts, then tells you when to leave for every trip.
            </p>
            <div className="peek night" data-enter style={vars({ '--k': 1 })}>
              <Tag>Example</Tag>
              <div className="peek-i">
                <span className="pi" style={vars({ '--k': 0 })}>
                  <LiveIcon kind="clock" />
                </span>
                <span>
                  <small>Leave by</small>
                  <b className="tabular-nums">
                    <RollNumber value="6:43" delay={550} /> AM
                  </b>
                </span>
              </div>
              <div className="peek-i">
                <span className="pi" style={vars({ '--k': 1 })}>
                  <LiveIcon kind="rain3" />
                </span>
                <span>
                  <small>Talamban</small>
                  <b className="tabular-nums">
                    <RollNumber value="25" delay={550} />° Rain
                  </b>
                </span>
              </div>
              <div className="peek-i">
                <span className="pi" style={vars({ '--k': 2 })}>
                  <LiveIcon kind="traffic" />
                </span>
                <span>
                  <small>Weather delay</small>
                  <b className="tabular-nums">+12 min</b>
                </span>
              </div>
            </div>
            <p className="facts" data-enter style={vars({ '--k': 2 })}>
              Traffic checked every{' '}
              <b>
                <CountUp value={15} delay={550} /> min
              </b>{' '}
              · Your brief is ready by{' '}
              <b className="tabular-nums">
                <RollNumber value="5:30" delay={550} /> AM
              </b>
            </p>
          </section>
          <div className="auth-card glass" ref={card} inert={riding}>
            <SignInForm
              active={form === 'login'}
              play={formPlay?.form === 'login' ? formPlay : null}
              headingRef={loginHeading}
              locked={riding}
              onSwitch={() => void switchTo('signup')}
              onSignIn={handleSignIn}
              onReset={handleReset}
            />
            <SignUpForm
              active={form === 'signup'}
              play={formPlay?.form === 'signup' ? formPlay : null}
              headingRef={signupHeading}
              locked={riding}
              onSwitch={() => void switchTo('login')}
              onSignUp={handleSignUp}
            />
          </div>
        </main>
      </div>
    </EntranceContext.Provider>
  );
}
