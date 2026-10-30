// Light/dark theme. index.html applies the saved (or system) theme before the first paint;
// this module switches it and remembers the choice. Until the user picks one, the theme follows the OS setting.

export type Theme = 'light' | 'dark';

const KEY = 'sn-theme';
const listeners = new Set<() => void>();

function saved(): Theme | null {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  for (const l of listeners) l();
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!saved()) apply(e.matches ? 'dark' : 'light');
});

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Private mode: the choice lasts until reload.
  }
  apply(theme);
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
