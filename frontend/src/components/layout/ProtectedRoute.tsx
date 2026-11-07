import { lazy, Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { loadLandingPage } from '@/lib/nav';

// Its own chunk, so people who are signed in never download it.
const LandingPage = lazy(loadLandingPage);

/**
 * Signed-out users see the landing page at / and go to the home page's sign-in form from anywhere else. While Supabase
 * confirms a session, only the sky shows.
 */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return null;
  if (status === 'signedOut') {
    if (location.pathname === '/') {
      return (
        <Suspense fallback={null}>
          <LandingPage />
        </Suspense>
      );
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
