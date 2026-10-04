import { KeepAwake } from '@capacitor-community/keep-awake';
import { isNative, isPluginAvailable } from './platform';

let wakeLock: { release: () => Promise<void> } | null = null;

/** ST-3: keep the screen on only while a session is active. */
export async function setKeepAwake(on: boolean): Promise<void> {
  try {
    if (isNative() && isPluginAvailable('KeepAwake')) {
      await (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep());
      return;
    }
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    if (on && !wakeLock && nav.wakeLock) wakeLock = await nav.wakeLock.request('screen');
    if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    /* not supported */
  }
}
