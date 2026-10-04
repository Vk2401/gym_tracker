import { registerSW } from 'virtual:pwa-register';

/**
 * Hosted-app updates (CLAUDE.md architecture): the service worker keeps the app usable
 * offline (NFR-2), but a new deploy must reach users quickly. A new version found right after
 * launch is applied at once; one found later is applied when the app goes to the background,
 * so a reload never interrupts someone typing a set. Checks again on every resume and hourly.
 */
export function installPwaUpdates(): void {
  if (!('serviceWorker' in navigator)) return;
  const launchedAt = Date.now();
  let pending = false;
  const update = registerSW({
    onNeedRefresh() {
      if (Date.now() - launchedAt < 15_000) void update(true);
      else pending = true;
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      setInterval(() => void reg.update(), 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update();
        else if (pending) void update(true);
      });
    },
  });
}
