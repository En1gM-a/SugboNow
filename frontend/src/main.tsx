import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { MotionRoot } from './components/MotionRoot';
import { AuthProvider } from './context/AuthContext';
import { queryClient } from './lib/queryClient';
import { USE_MOCKS } from './lib/supabaseClient';
import './index.css';

async function enableMocks() {
  if (!USE_MOCKS) return;
  // A dynamic import keeps MSW and the fixtures out of the production entry chunk.
  const { startMocks } = await import('./mocks/browser');
  await startMocks();
}

// Query defaults (staleTime per data type, refetching, retries) live in lib/queryClient.ts and lib/queries.ts.
void enableMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MotionRoot>
            <App />
          </MotionRoot>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
});
