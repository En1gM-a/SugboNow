// Authentication provider and hook. Uses Supabase Auth, or a local fake when VITE_USE_MOCKS=true.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabase, readStoredSession, USE_MOCKS } from '@/lib/supabaseClient';

export interface AuthUser {
  id: string;
  email: string;
}

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

/** Everything the two-step sign-up form collects. */
export interface SignUpDetails {
  firstName: string;
  email: string;
  password: string;
  city: string;
  addressText: string;
  subscribedMayor: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves with needsConfirmation=true when Supabase wants the email confirmed first. */
  signUp: (details: SignUpDetails) => Promise<{ needsConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<void>;
  /** Sets a new password for the signed-in user; the reset email's link signs them in first. */
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MOCK_SESSION_KEY = 'sn-mock-session';
const MOCK_USER_ID = '0b0c7a1e-0000-4000-8000-000000000001';
const FRESH_USER_KEY = 'sn-mock-fresh-user';

function readMockUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(MOCK_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeMockUser(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(MOCK_SESSION_KEY);
  } catch {
    // Private mode: the session lasts until reload.
  }
}

/** Turns Supabase's messages into plain language. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'That email and password don’t match. Check them and try again.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox for the link.';
  if (m.includes('already registered')) return 'An account with this email already exists. Try signing in.';
  // Without custom SMTP, Supabase only emails the project's team, and only a few times an hour (docs/handoffs/signup.md).
  if (m.includes('rate limit') || m.includes('not authorized') || m.includes('not_authorized')) return 'We couldn’t send the confirmation email. Try again later.';
  if (m.includes('password')) return message;
  if (m.includes('fetch')) return 'Can’t reach the sign-in service. Check your connection.';
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  // A fresh stored session signs the user in at once; supabase-js then confirms it in the background.
  const [status, setStatus] = useState<AuthStatus>(() =>
    USE_MOCKS ? (readMockUser() ? 'signedIn' : 'signedOut') : readStoredSession() ? 'signedIn' : 'loading',
  );
  const [user, setUser] = useState<AuthUser | null>(() => (USE_MOCKS ? readMockUser() : (readStoredSession()?.user ?? null)));

  useEffect(() => {
    if (USE_MOCKS) return;
    const apply = (u: { id: string; email?: string } | null | undefined) => {
      setUser((prev) => (u ? (prev?.id === u.id && prev.email === (u.email ?? '') ? prev : { id: u.id, email: u.email ?? '' }) : null));
      setStatus(u ? 'signedIn' : 'signedOut');
    };
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void getSupabase().then(async (supabase) => {
      if (cancelled) return;
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      apply(data.session?.user);
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session?.user));
      unsubscribe = () => sub.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (USE_MOCKS) {
      await new Promise((r) => setTimeout(r, 500));
      if (password.length < 6) throw new Error('That email and password don’t match. Check them and try again.');
      const u = { id: MOCK_USER_ID, email };
      writeMockUser(u);
      setUser(u);
      setStatus('signedIn');
      return;
    }
    const { error } = await (await getSupabase()).auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendlyAuthError(error.message));
  }, []);

  const signUp = useCallback(async ({ firstName, email, password, city, addressText, subscribedMayor }: SignUpDetails) => {
    if (USE_MOCKS) {
      await new Promise((r) => setTimeout(r, 600));
      // Lets the "check your email" screen be seen without real email.
      if (email.toLowerCase().startsWith('confirm@')) return { needsConfirmation: true };
      try {
        localStorage.setItem(FRESH_USER_KEY, JSON.stringify({ firstName, city, addressText, subscribedMayor }));
      } catch {
        // ignore
      }
      qc.clear();
      const u = { id: MOCK_USER_ID, email };
      writeMockUser(u);
      setUser(u);
      setStatus('signedIn');
      return { needsConfirmation: false };
    }
    // A database trigger saves these on the profile (supabase/migrations/0006), because with "Confirm email" on there's
    // no session yet to call PATCH /api/profile. Read them back from the profile, never from user_metadata.
    const { data, error } = await (await getSupabase()).auth.signUp({
      email,
      password,
      options: {
        data: { display_name: firstName, first_name: firstName, city, address_text: addressText, subscribed_mayor: subscribedMayor },
        emailRedirectTo: `${window.location.origin}/welcome`,
      },
    });
    if (error) throw new Error(friendlyAuthError(error.message));
    return { needsConfirmation: !data.session };
  }, [qc]);

  const resetPassword = useCallback(async (email: string) => {
    if (USE_MOCKS) {
      await new Promise((r) => setTimeout(r, 500));
      return;
    }
    const { error } = await (await getSupabase()).auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) throw new Error(friendlyAuthError(error.message));
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (USE_MOCKS) {
      await new Promise((r) => setTimeout(r, 500));
      return;
    }
    const { error } = await (await getSupabase()).auth.updateUser({ password });
    if (error) throw new Error(friendlyAuthError(error.message));
  }, []);

  const signOut = useCallback(async () => {
    if (USE_MOCKS) writeMockUser(null);
    else await (await getSupabase()).auth.signOut();
    qc.clear();
    setUser(null);
    setStatus('signedOut');
  }, [qc]);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, resetPassword, updatePassword, signOut }),
    [status, user, signIn, signUp, resetPassword, updatePassword, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
