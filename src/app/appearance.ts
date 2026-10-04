import type { Appearance } from '@/domain/types';
import { applyStatusBar } from '@/native/statusBar';

const KEY = 'gt-appearance';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');
let current: Appearance = 'system';

function resolve(a: Appearance): 'light' | 'dark' {
  if (a === 'system') return media().matches ? 'dark' : 'light';
  return a;
}

function paint(): void {
  const theme = resolve(current);
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.toggle('ion-palette-dark', theme === 'dark');
  void applyStatusBar();
}

/**
 * ST-7: the app owns the theme. The OS colour scheme is only consulted when the user picked
 * System; Android force-dark is disabled natively (device-independence §3).
 */
export function setAppearance(a: Appearance): void {
  current = a;
  try {
    localStorage.setItem(KEY, a); // read by the pre-paint script in index.html
  } catch {
    /* storage unavailable */
  }
  paint();
}

export function initAppearance(a: Appearance): void {
  media().addEventListener('change', () => current === 'system' && paint());
  setAppearance(a);
}
