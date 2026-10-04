import { useIonAlert } from '@ionic/react';
import { useEffect } from 'react';
import { PERMISSIONS } from '@/domain/messages';
import {
  exactAlarmPermission,
  notificationPermission,
  openExactAlarmSettings,
  requestNotificationPermission,
} from '@/native/permissions';
import { isNative } from '@/native/platform';
import { getPref, setPref } from '@/native/prefs';
import { useAppStore } from '@/store/appStore';

const ASKED_KEY = 'gt-permissions-asked';

/**
 * PD-20 (owner decision): on the first launch of the native app, explain and request the
 * permissions the native features need — notifications for rest-timer alerts, then Android's
 * exact-alarm switch — once, after the analytics question. Keep-awake and haptics need no
 * prompt. Anything declined can be turned on later in Settings → Permissions.
 */
export function PermissionsPrompt() {
  const optIn = useAppStore((s) => s.prefs?.analyticsOptIn);
  const [alert] = useIonAlert();
  useEffect(() => {
    if (!isNative() || optIn === null || optIn === undefined || navigator.webdriver) return;
    let cancelled = false;
    const ask = (header: string, message: string, ok: string) =>
      new Promise<boolean>((resolve) => {
        void alert({
          header,
          message,
          backdropDismiss: false,
          buttons: [
            { text: PERMISSIONS.notNow, role: 'cancel', handler: () => resolve(false) },
            { text: ok, handler: () => resolve(true) },
          ],
        });
      });
    void (async () => {
      if (await getPref(ASKED_KEY)) return;
      await setPref(ASKED_KEY, new Date().toISOString());
      if (cancelled) return;
      if ((await notificationPermission()) === 'prompt') {
        if (
          await ask(
            PERMISSIONS.askNotificationsTitle,
            PERMISSIONS.askNotifications,
            PERMISSIONS.allow,
          )
        )
          await requestNotificationPermission();
      }
      if (
        (await notificationPermission()) === 'granted' &&
        (await exactAlarmPermission()) === 'prompt'
      ) {
        if (await ask(PERMISSIONS.askAlarmsTitle, PERMISSIONS.askAlarms, PERMISSIONS.openSettings))
          await openExactAlarmSettings();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [optIn, alert]);
  return null;
}
