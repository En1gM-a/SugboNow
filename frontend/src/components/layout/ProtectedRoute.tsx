import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageSkeleton } from './PageSkeleton';

/**
 * Signed-out users go to /login, then come back where they were.
 * While the session is being checked it shows a page skeleton; it sits inside the app shell,
 * so the header stays put and nothing jumps when the page arrives.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageSkeleton />;
  if (status === 'signedOut') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
