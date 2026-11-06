import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import type { RouteHandle } from '@/components/layout/Header';
import { PageSkeleton } from '@/components/layout/Page';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { RootLayout } from '@/components/layout/RootLayout';
import { loadMayorPage, loadNewsPage, loadProfilePage, loadTrafficPage, loadWeatherPage, loadWelcomePage } from '@/lib/nav';
import HomePage from '@/pages/HomePage';
import TodayPage from '@/pages/TodayPage';

// The home page and Today are in the main bundle; every other route loads on demand (handoff <performance>).
const WelcomePage = lazy(loadWelcomePage);
const NewsPage = lazy(loadNewsPage);
const MayorPage = lazy(loadMayorPage);
const WeatherPage = lazy(loadWeatherPage);
const TrafficPage = lazy(loadTrafficPage);
const ProfilePage = lazy(loadProfilePage);

const lazily = (page: ReactNode) => <Suspense fallback={<PageSkeleton />}>{page}</Suspense>;

const handle = (title: string): RouteHandle => ({ title });

/** /login and /signup only pick the form; the home page above them renders both. */
const PickForm = () => null;

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // One page for both forms, so switching between /login and /signup keeps it (and both forms) mounted.
      {
        element: <HomePage />,
        children: [
          { path: 'login', Component: PickForm },
          { path: 'signup', Component: PickForm },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'welcome',
            element: (
              <Suspense fallback={null}>
                <WelcomePage />
              </Suspense>
            ),
          },
          {
            element: <AppShell />,
            children: [
              { index: true, element: <TodayPage />, handle: handle('greeting') },
              { path: 'news', element: lazily(<NewsPage />), handle: handle('News') },
              { path: 'mayor', element: lazily(<MayorPage />), handle: handle('Mayor') },
              { path: 'weather', element: lazily(<WeatherPage />), handle: handle('Weather') },
              { path: 'traffic', element: lazily(<TrafficPage />), handle: handle('Traffic') },
              { path: 'profile', element: lazily(<ProfilePage />), handle: handle('Profile') },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
