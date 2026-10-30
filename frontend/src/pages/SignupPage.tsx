import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PasswordField, TextField } from '@/components/ui/Controls';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useFormErrors } from '@/hooks/useFormErrors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELDS = ['name', 'email', 'password', 'confirm'] as const;

export default function SignupPage() {
  const { signUp, status } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  // Set once this page starts signing up, so the new session doesn't bounce us to "/" before onboarding.
  const [submitted, setSubmitted] = useState(false);

  const { formRef, shown, blur, validate } = useFormErrors(
    {
      name: form.name.trim() ? undefined : 'Tell us what to call you.',
      email: EMAIL_RE.test(form.email.trim()) ? undefined : form.email.trim() ? 'Enter an email like juan@example.com.' : 'Enter your email.',
      password: form.password.length >= 8 ? undefined : 'Use at least 8 characters.',
      confirm: form.confirm && form.confirm === form.password ? undefined : form.confirm ? 'The passwords don’t match.' : 'Type your password again.',
    },
    FIELDS,
  );

  if (status === 'signedIn' && !submitted) return <Navigate to="/" replace />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setLoading(true);
    setSubmitted(true);
    try {
      const { needsConfirmation } = await signUp(form.name.trim(), form.email.trim(), form.password);
      if (needsConfirmation) setCheckEmail(true);
      else navigate('/welcome', { replace: true, state: { name: form.name.trim() } });
    } catch (err) {
      setSubmitted(false);
      setFormError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <AuthLayout>
        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="mt-2 text-muted">
          We sent a confirmation link to <strong className="text-ink">{form.email}</strong>. Open it, then sign in to set up your brief.
        </p>
        <ButtonLink to="/login" className="mt-6 w-full">
          Go to sign in
        </ButtonLink>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Create your account</h1>
      <p className="mt-1 text-muted">It takes a minute. You can set up your places after.</p>

      {formError && (
        <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-status-high-soft p-3 text-sm text-status-high">
          <Icon name="alert" size={18} className="mt-0.5" />
          <span className="font-semibold">{formError}</span>
        </div>
      )}

      <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <TextField label="Name" name="name" autoComplete="name" value={form.name} onChange={set('name')} onBlur={blur('name')} error={shown.name} placeholder="Juan dela Cruz" />
        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={form.email}
          onChange={set('email')}
          onBlur={blur('email')}
          error={shown.email}
          placeholder="juan@example.com"
        />
        <PasswordField label="Password" name="password" autoComplete="new-password" value={form.password} onChange={set('password')} onBlur={blur('password')} error={shown.password} hint="At least 8 characters." />
        <PasswordField label="Confirm password" name="confirm" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} onBlur={blur('confirm')} error={shown.confirm} />
        <Button type="submit" loading={loading} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-mactan-sea transition-colors duration-150 hover:text-mactan-sea-dark hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
