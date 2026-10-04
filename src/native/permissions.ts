import { KeepAwake } from '@capacitor-community/keep-awake';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative, isPluginAvailable, platform } from './platform';

/**
 * PD-20: the device permissions the app's native features rely on, checked and requested in
 * one place. 'unavailable' = the feature does not exist here (plain browser, iOS for exact
 * alarms); 'blocked' = the user said no and only the phone's Settings can change it.
 */
export type PermissionState = 'granted' | 'prompt' | 'blocked' | 'unavailable';

const notificationsHere = () => isNative() && isPluginAvailable('LocalNotifications');

/** SS-2 rest-timer alerts while the app is in the background. */
export async function notificationPermission(): Promise<PermissionState> {
  if (!notificationsHere()) return 'unavailable';
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display === 'granted') return 'granted';
    return display === 'denied' ? 'blocked' : 'prompt';
  } catch {
    return 'unavailable';
  }
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!notificationsHere()) return 'unavailable';
  try {
    const { display } = await LocalNotifications.requestPermissions();
    if (display === 'granted') return 'granted';
    return display === 'denied' ? 'blocked' : 'prompt';
  } catch {
    return 'unavailable';
  }
}

/**
 * Android 12+ "Alarms & reminders": without it the rest-timer alert can arrive minutes late.
 * There is no dialog for it — the user flips a switch in the system screen we open.
 */
export async function exactAlarmPermission(): Promise<PermissionState> {
  if (!notificationsHere() || platform() !== 'android') return 'unavailable';
  try {
    const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting();
    return exact_alarm === 'granted' ? 'granted' : 'prompt';
  } catch {
    return 'unavailable'; // Android 11 and older: exact alarms need no permission
  }
}

export async function openExactAlarmSettings(): Promise<PermissionState> {
  if ((await exactAlarmPermission()) === 'unavailable') return 'unavailable';
  try {
    const { exact_alarm } = await LocalNotifications.changeExactNotificationSetting();
    return exact_alarm === 'granted' ? 'granted' : 'prompt';
  } catch {
    return 'unavailable';
  }
}

/** ST-3 keep screen awake: needs no prompt on either platform, only support. */
export async function keepAwakePermission(): Promise<PermissionState> {
  try {
    if (isNative() && isPluginAvailable('KeepAwake')) {
      const { isSupported } = await KeepAwake.isSupported();
      return isSupported ? 'granted' : 'unavailable';
    }
    return 'wakeLock' in navigator ? 'granted' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}
