import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { queryClient } from './lib/queryClient';
import { USE_MOCKS } from './lib/supabaseClient';
import './index.css';

async function enableMocks() {
  if (!USE_MOCKS) return;
  // Dynamic import keeps MSW and the fixtures out of the production entry chunk.
  const { startMocks } = await import('./mocks/browser');
  await startMocks();
}

void enableMocks().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
});
