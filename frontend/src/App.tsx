import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import type { RouteHandle } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { RootLayout } from '@/components/layout/RootLayout';
import { loadPlaceholderPage } from '@/lib/nav';
import HomePage from '@/pages/HomePage';
import type { PlaceholderName } from '@/pages/PlaceholderPage';
import TodayPage from '@/pages/TodayPage';

// The home page and Today are in the main bundle; every other route loads on demand (handoff <performance>).
const PlaceholderPage = lazy(loadPlaceholderPage);

const later = (page: PlaceholderName) => (
  <Suspense fallback={null}>
    <PlaceholderPage page={page} />
  </Suspense>
);

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
          { path: 'welcome', element: later('welcome') },
          {
            element: <AppShell />,
            children: [
              { index: true, element: <TodayPage />, handle: handle('greeting') },
              { path: 'news', element: later('news'), handle: handle('News') },
              { path: 'mayor', element: later('mayor'), handle: handle('Mayor') },
              { path: 'weather', element: later('weather'), handle: handle('Weather') },
              { path: 'traffic', element: later('traffic'), handle: handle('Traffic') },
              { path: 'profile', element: later('profile'), handle: handle('Profile') },
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
