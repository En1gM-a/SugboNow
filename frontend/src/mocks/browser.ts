// MSW browser setup. Loaded only when VITE_USE_MOCKS=true.

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export async function startMocks() {
  // Some embedded browsers (e.g. IDE preview panes) block service workers, and MSW's
  // registration then never settles. Hiding the API makes MSW intercept fetch inside the
  // page instead, which works everywhere. The app has no service worker of its own.
  delete (Navigator.prototype as { serviceWorker?: unknown }).serviceWorker;
  await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass', quiet: true });
}
