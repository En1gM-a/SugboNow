// Display preferences on <html>: light or dark mode, Lite mode and still mode. The inline script in index.html
// sets them before the first paint; this store keeps React in sync with them and saves the user's choices.

import { useSyncExternalStore } from 'react';

export type Mode = 'light' | 'dark';

export interface Display {
  mode: Mode;
  /** Cheaper visuals for weak phones (handoff <performance>, Lite mode). */
  lite: boolean;
  /** No movement: the device asks for reduced motion, or Profile's "Reduce animations" is on. */
  still: boolean;
  /** Profile's "Reduce animations" switch on its own, without the device setting. */
  reduceAnimations: boolean;
}

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const listeners = new Set<() => void>();

function read(): Display {
  return {
    mode: root.dataset.mode === 'dark' ? 'dark' : 'light',
    lite: root.dataset.lite === 'on',
    still: root.dataset.still !== undefined || reduceMotion.matches,
    reduceAnimations: root.dataset.still !== undefined,
  };
}

let snapshot = read();

function update() {
  snapshot = read();
  listeners.forEach((listener) => listener());
}

reduceMotion.addEventListener('change', update);

function save(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode: the choice lasts until the page reloads.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDisplay(): Display {
  return snapshot;
}

export function useDisplay(): Display {
  return useSyncExternalStore(subscribe, getDisplay);
}

export function setMode(mode: Mode) {
  root.dataset.mode = mode;
  save('sn-mode', mode);
  update();
}

export function setLite(on: boolean) {
  root.dataset.lite = on ? 'on' : 'off';
  save('sn-lite', on ? 'on' : 'off');
  update();
}

export function setStill(on: boolean) {
  if (on) root.dataset.still = '';
  else delete root.dataset.still;
  save('sn-still', on ? 'on' : null);
  update();
}

/** The new mode spreads out in a circle from the button. Still mode and browsers without View Transitions just switch. */
export function toggleMode(from: HTMLElement) {
  const next: Mode = snapshot.mode === 'dark' ? 'light' : 'dark';
  if (!document.startViewTransition || snapshot.still) {
    setMode(next);
    return;
  }
  const r = from.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.dataset.vt = 'theme';
  const transition = document.startViewTransition(() => setMode(next));
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 720, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {});
  transition.finished.finally(() => {
    delete root.dataset.vt;
  });
}
