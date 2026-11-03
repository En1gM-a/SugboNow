// Glue between the pages and the jeepney ride, whose code loads after the first paint (handoff <performance>).
// It preloads the ride, keeps the home page from redirecting while a log-in ride runs, and clears the smoke
// once the next page has drawn its first frame.

import { gate } from './entrance';

type RideModule = typeof import('./ride');

let ride: Promise<RideModule> | null = null;

export function loadRide(): Promise<RideModule> {
  ride ??= import('./ride').catch((err: unknown) => {
    ride = null;
    throw err;
  });
  return ride;
}

/** Loads the ride's code when the browser is idle after the first paint. */
export function preloadRide() {
  const load = () => {
    loadRide().catch(() => {});
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(load, { timeout: 2500 });
  else setTimeout(load, 400);
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

let holding = false;

export const loginRide = {
  /** True from the moment a sign-in starts until its smoke has cleared. */
  get holding() {
    return holding;
  },
  begin() {
    holding = true;
  },
  cancel() {
    holding = false;
  },
  /**
   * The screen is covered and the user is signed in: hold the next page under the smoke, navigate, wait for the
   * page's first frame, then pop the smoke away while the page plays its entrance (starting 80 ms in).
   */
  async finish(navigate: () => void) {
    const drawn = gate.hold();
    navigate();
    await Promise.race([drawn, wait(1500)]);
    try {
      const { clearSmoke } = await loadRide();
      const clearing = clearSmoke();
      window.setTimeout(() => gate.release(), 80);
      await clearing;
    } finally {
      gate.release();
      holding = false;
    }
  },
};
