// Where the "Forgot password?" email lands (docs/handoffs/signup.md, "Also found"). Supabase signs the user in from the
// link, so this page only has to ask for the new password. A link that's expired or already used leaves them signed out.

import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordField } from '@/components/auth/Field';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { EntranceContext, usePageEntrance } from '@/lib/entrance';
import { toast } from '@/lib/toast';
import { vars } from '@/utils/cx';

function NewPasswordForm() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordInput = useRef<HTMLInputElement>(null);
  const confirmInput = useRef<HTMLInputElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const found: typeof errors = {};
    if (password.length < 8) found.password = 'Use at least 8 characters.';
    if (confirm !== password) found.confirm = "The two passwords don't match.";
    setErrors(found);
    setMessage(null);
    if (found.password) return passwordInput.current?.focus();
    if (found.confirm) return confirmInput.current?.focus();
    setBusy(true);
    try {
      await updatePassword(password);
    } catch (err) {
      setBusy(false);
      setMessage(err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.');
      return;
    }
    toast.success('Your password is changed.');
    navigate('/', { replace: true });
  }

  return (
    <form className="stack-form" noValidate onSubmit={submit}>
      <PasswordField id="np-pass" label="New password (at least 8 characters)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} ref={passwordInput} />
      <PasswordField id="np-confirm" label="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} ref={confirmInput} />
      <Button type="submit" busy={busy} className="w-full">
        Save new password
      </Button>
      {message && (
        <p className="form-msg is-error" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}

export default function ResetPasswordPage() {
  const { status } = useAuth();
  const entrance = usePageEntrance('/reset-password');

  return (
    <EntranceContext.Provider value={entrance}>
      <main id="main" tabIndex={-1} className="page-host">
        <div className="page welcome-page" data-entrance={entrance.start !== null && entrance.mode !== 'none' ? entrance.mode : undefined}>
          <section className="card glass e-card welcome-card" style={vars({ '--i': 0 })} aria-labelledby="np-h">
            <div className="welcome-top">
              <Logo />
            </div>
            {status === 'signedOut' ? (
              <>
                <div className="step-head">
                  <h1 id="np-h">This link has expired</h1>
                  <p className="muted">Reset links work once, for a short time. Ask for a new one from the sign-in form.</p>
                </div>
                <Link to="/login" className="btn btn-secondary">
                  Back to sign in
                </Link>
              </>
            ) : (
              <>
                <div className="step-head">
                  <h1 id="np-h">Set a new password</h1>
                  <p className="muted">Then you&apos;re straight back in.</p>
                </div>
                {status === 'signedIn' ? <NewPasswordForm /> : <p className="muted small">Checking your link…</p>}
              </>
            )}
          </section>
        </div>
      </main>
    </EntranceContext.Provider>
  );
}
