// The signed-out home page at /login and /signup (handoff <pages>, pages 1 and 2): hero copy on the left and one glass
// card on the right holding both the sign-in and the sign-up form. Switching forms crossfades them and the new title
// rises; signing in goes straight to Today, which plays its own entrance.

import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Field, PasswordField } from '@/components/auth/Field';
import { CountUp } from '@/components/CountUp';
import { LiveIcon } from '@/components/LiveIcon';
import { Logo } from '@/components/Logo';
import { RiseWords } from '@/components/RiseWords';
import { RollNumber } from '@/components/RollNumber';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { useAuth } from '@/context/AuthContext';
import { useDisplay } from '@/lib/display';
import { EntranceContext, type Entrance } from '@/lib/entrance';
import { prefetchToday } from '@/lib/nav';
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
  onSwitch: () => void;
}

const playAttr = (play: FormPlay | null) => (play ? (play.token % 2 ? 'b' : 'a') : undefined);

function SignInForm({ active, play, headingRef, onSwitch, onSignIn, onReset }: FormProps & {
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
    if (busy) return;
    const next: typeof errors = {};
    if (!EMAIL.test(email.trim())) next.email = 'Enter the email you signed up with, like thea@example.com.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    setMessage(null);
    if (next.email) return emailInput.current?.focus();
    if (next.password) return passwordInput.current?.focus();
    setBusy(true);
    const error = await onSignIn(email.trim(), password);
    // On success the button stays busy until Today opens.
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
        <Button variant="secondary" onClick={onSwitch}>
          Sign up
        </Button>
      </p>
    </form>
  );
}

function SignUpForm({ active, play, headingRef, onSwitch, onSignUp }: FormProps & {
  onSignUp: (name: string, email: string, password: string) => Promise<{ error?: string; checkEmail?: boolean }>;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirm?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    confirm: useRef<HTMLInputElement>(null),
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Enter your first name.';
    if (!EMAIL.test(email.trim())) next.email = 'Enter an email you can open, like thea@example.com.';
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (confirm !== password) next.confirm = "The two passwords don't match.";
    setErrors(next);
    setMessage(null);
    const first = (['name', 'email', 'password', 'confirm'] as const).find((k) => next[k]);
    if (first) return inputs[first].current?.focus();
    setBusy(true);
    const result = await onSignUp(name.trim(), email.trim(), password);
    if (result.error) {
      setBusy(false);
      setMessage(result.error);
    } else if (result.checkEmail) {
      setBusy(false);
      setCheckEmail(email.trim());
    }
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
      aria-labelledby="h-signup"
    >
      {checkEmail ? (
        <>
          <h2 id="h-signup" ref={headingRef} tabIndex={-1}>
            Check your email
          </h2>
          <p className="sub">We sent a confirmation link to {checkEmail}. Open it, then sign in.</p>
          <Button variant="secondary" onClick={onSwitch}>
            Back to sign in
          </Button>
        </>
      ) : (
        <>
          <h2 id="h-signup" ref={headingRef} tabIndex={-1}>
            <RiseWords key={play?.token ?? 'still'} text="Create your account" play={active && Boolean(play)} delay={play?.delay ?? 0} />
          </h2>
          <p className="sub" data-row style={vars({ '--k': row++ })}>
            Bag-o ka diri? Next you pick your city, your mayor and a first trip.
          </p>
          <Field id="su-name" row={row++} label="First name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} ref={inputs.name} />
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
            <Button type="submit" variant="primary" busy={busy} className="w-full">
              Create account
            </Button>
          </div>
          {message && (
            <p className="form-msg is-error" role="alert">
              {message}
            </p>
          )}
          <p className="form-switch" data-row style={vars({ '--k': row++ })}>
            Already riding with us?
            <Button variant="secondary" onClick={onSwitch}>
              Sign in
            </Button>
          </p>
        </>
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
  const loginHeading = useRef<HTMLHeadingElement>(null);
  const signupHeading = useRef<HTMLHeadingElement>(null);
  const shownForm = useRef<FormName>(form);
  /** Where a successful sign-in or sign-up goes (Today, or onboarding after a new sign-up). */
  const destination = useRef('/');
  // The home entrance plays when the page loads and after sign-out (each time this page mounts).
  const [play] = useState(() => !still);
  const [start] = useState(() => performance.now());
  const [formPlay, setFormPlay] = useState<FormPlay | null>(() => (still ? null : { form, token: 0, delay: 300 }));

  useEffect(() => {
    // Coming here from inside the app (after sign-out): move focus to the form's title.
    if (location.key !== 'default') (form === 'login' ? loginHeading : signupHeading).current?.focus({ preventScroll: true });
    // Runs once, on mount.
  }, []);

  // Back and Forward between /login and /signup, or opening either URL: show the right form.
  useEffect(() => {
    if (shownForm.current === form) return;
    shownForm.current = form;
    if (!still) setFormPlay({ form, token: Date.now(), delay: 40 });
  }, [form, still]);

  /** Sign in ↔ sign up: the forms crossfade (120 ms), the new title rises, and focus moves to it. */
  function switchTo(next: FormName) {
    if (next === form) return;
    shownForm.current = next;
    navigate(PATH[next], { flushSync: true });
    if (!still) setFormPlay({ form: next, token: Date.now(), delay: 40 });
    (next === 'login' ? loginHeading : signupHeading).current?.focus({ preventScroll: true });
  }

  async function handleSignIn(email: string, password: string): Promise<string | null> {
    destination.current = '/';
    try {
      await signIn(email, password);
    } catch (err) {
      return messageOf(err);
    }
    prefetchToday();
    return null;
  }

  async function handleSignUp(name: string, email: string, password: string) {
    destination.current = '/welcome';
    try {
      const { needsConfirmation } = await signUp(name, email, password);
      if (needsConfirmation) return { checkEmail: true };
    } catch (err) {
      return { error: messageOf(err) };
    }
    prefetchToday();
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

  // Signed in, by this page's forms or by a session restored on page load: into the app.
  if (status === 'signedIn') return <Navigate to={destination.current} replace />;

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
          <div className="auth-card glass">
            <SignInForm
              active={form === 'login'}
              play={formPlay?.form === 'login' ? formPlay : null}
              headingRef={loginHeading}
              onSwitch={() => switchTo('signup')}
              onSignIn={handleSignIn}
              onReset={handleReset}
            />
            <SignUpForm
              active={form === 'signup'}
              play={formPlay?.form === 'signup' ? formPlay : null}
              headingRef={signupHeading}
              onSwitch={() => switchTo('login')}
              onSignUp={handleSignUp}
            />
          </div>
        </main>
      </div>
    </EntranceContext.Provider>
  );
}
