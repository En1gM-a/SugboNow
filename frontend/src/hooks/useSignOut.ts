import { useCallback } from 'react';
import { resetBell } from '@/components/layout/Bell';
import { useAuth } from '@/context/AuthContext';
import { pages } from '@/lib/entrance';

/** Signs out and forgets the session's first opens and the bell, so the next sign-in starts fresh. */
export function useSignOut() {
  const { signOut } = useAuth();
  return useCallback(() => {
    pages.forget();
    resetBell();
    void signOut();
  }, [signOut]);
}
