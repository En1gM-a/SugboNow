import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Toaster } from '@/components/ui/Overlay';
import { useAuth } from '@/context/AuthContext';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import { MayorPage, NewsPage, ProfilePage, TrafficPage, WeatherPage } from '@/routes';

const SignupPage = lazy(() => import('@/pages/SignupPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'signedIn') return <Navigate to="/" replace />;
  return <>{children}</>;
}

const fallback = (
  <div className="mx-auto max-w-6xl px-4 pt-7">
    <PageSkeleton />
  </div>
);

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    path: '/signup',
    element: (
      <Suspense fallback={fallback}>
        <SignupPage />
      </Suspense>
    ),
  },
  {
    path: '/welcome',
    element: (
      <Suspense fallback={fallback}>
        <ProtectedRoute>
          <OnboardingPage />
        </ProtectedRoute>
      </Suspense>
    ),
  },
  {
    // The shell (header and nav) renders at once; the pages inside wait for the session check.
    element: <AppShell />,
    children: [
      {
        element: (
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'news', element: <NewsPage /> },
          { path: 'mayor', element: <MayorPage /> },
          { path: 'weather', element: <WeatherPage /> },
          { path: 'traffic', element: <TrafficPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
