import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative, isPluginAvailable } from './platform';

const REST_ID = 1001;

/**
 * SS-2 / AC-16: schedules the rest-timer alert for when the app is in the background.
 * Permission is requested the first time a timer starts (BRD §16).
 */
export async function scheduleRestAlert(atUtc: string, sound: boolean): Promise<void> {
  if (!isNative() || !isPluginAvailable('LocalNotifications')) return;
  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
      perm = await LocalNotifications.requestPermissions();
    }
    if (perm.display !== 'granted') return;
    await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] });
    const at = new Date(atUtc);
    if (at.getTime() <= Date.now()) return;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REST_ID,
          title: 'Rest is over',
          body: 'Time for your next set.',
          schedule: { at, allowWhileIdle: true },
          silent: !sound,
        },
      ],
    });
  } catch {
    /* notifications unavailable */
  }
}

export async function cancelRestAlert(): Promise<void> {
  if (!isNative() || !isPluginAvailable('LocalNotifications')) return;
  await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] }).catch(() => undefined);
}
