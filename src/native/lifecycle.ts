import { App } from '@capacitor/app';
import { isNative } from './platform';

/** Calls fn when the app returns to the foreground (native) or the tab becomes visible (web). */
export function onResume(fn: () => void): () => void {
  if (isNative()) {
    const handle = App.addListener('resume', fn);
    return () => void handle.then((h) => h.remove());
  }
  const listener = () => document.visibilityState === 'visible' && fn();
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}

export function onPause(fn: () => void): () => void {
  if (isNative()) {
    const handle = App.addListener('pause', fn);
    return () => void handle.then((h) => h.remove());
  }
  const listener = () => document.visibilityState === 'hidden' && fn();
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}

export async function appVersion(): Promise<{ version: string; build: string }> {
  if (!isNative()) return { version: __APP_VERSION__, build: 'web' };
  const info = await App.getInfo();
  return { version: info.version, build: info.build };
}
