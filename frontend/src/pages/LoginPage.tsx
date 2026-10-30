import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { PasswordField, TextField } from '@/components/ui/Controls';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useFormErrors } from '@/hooks/useFormErrors';
import { USE_MOCKS } from '@/lib/supabaseClient';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [needEmailForReset, setNeedEmailForReset] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());
  const { formRef, shown, blur, validate } = useFormErrors(
    {
      email: emailValid ? undefined : email.trim() ? 'Enter an email like juan@example.com.' : 'Enter your email.',
      password: password ? undefined : 'Enter your password.',
    },
    ['email', 'password'] as const,
  );
  const emailError = needEmailForReset && !emailValid ? 'Enter your email first, then tap “Forgot password?” again.' : shown.email;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onForgot() {
    if (!emailValid) {
      setNeedEmailForReset(true);
      formRef.current?.querySelector<HTMLElement>('[name="email"]')?.focus();
      return;
    }
    setResetting(true);
    setFormError(null);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
      setNeedEmailForReset(false);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Welcome back</h1>
      <p className="mt-1 text-muted">Sign in to see your Cebu Daily Brief.</p>

      {formError && (
        <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-status-high-soft p-3 text-sm text-status-high">
          <Icon name="alert" size={18} className="mt-0.5" />
          <span className="font-semibold">{formError}</span>
        </div>
      )}
      {resetSent && (
        <div role="status" className="mt-5 flex items-start gap-2 rounded-xl bg-status-ok-soft p-3 text-sm text-status-ok">
          <Icon name="mail" size={18} className="mt-0.5" />
          <span className="font-semibold">Check your email for a link to reset your password.</span>
        </div>
      )}

      <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={blur('email')}
          error={emailError}
          placeholder="juan@example.com"
        />
        <div>
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={blur('password')}
            error={shown.password}
          />
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={onForgot}
              disabled={resetting}
              className="min-h-11 rounded-lg px-1 text-sm font-semibold text-mactan-sea transition-colors duration-150 hover:text-mactan-sea-dark hover:underline disabled:opacity-60"
            >
              {resetting ? 'Sending…' : 'Forgot password?'}
            </button>
          </div>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-muted">
        New to Sugbo Now?{' '}
        <Link to="/signup" className="font-semibold text-mactan-sea transition-colors duration-150 hover:text-mactan-sea-dark hover:underline">
          Create an account
        </Link>
      </p>
      {USE_MOCKS && (
        <p className="mt-6 rounded-xl bg-marigold-soft p-3 text-center text-sm text-ink">
          <strong>Demo mode:</strong> any email and a password of 6+ characters signs you in.
        </p>
      )}
    </AuthLayout>
  );
}
