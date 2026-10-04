import { IonItem, IonLabel, IonList, IonNote } from '@ionic/react';
import { AlarmClockIcon, BellIcon, SunMediumIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { RowIcon } from '@/components/RowIcon';
import { PERMISSIONS } from '@/domain/messages';
import { useDialogs } from '@/hooks/useDialogs';
import { onResume } from '@/native/lifecycle';
import {
  exactAlarmPermission,
  keepAwakePermission,
  notificationPermission,
  openExactAlarmSettings,
  requestNotificationPermission,
  type PermissionState,
} from '@/native/permissions';

interface States {
  notifications: PermissionState;
  alarms: PermissionState;
  keepAwake: PermissionState;
}

const loadStates = async (): Promise<States> => ({
  notifications: await notificationPermission(),
  alarms: await exactAlarmPermission(),
  keepAwake: await keepAwakePermission(),
});

/** PD-20: status of each native permission, with a tap to grant what is still off. */
export function PermissionsSection() {
  const [s, setS] = useState<States | null>(null);
  const { alert } = useDialogs();
  const refresh = useCallback(async () => setS(await loadStates()), []);
  useEffect(() => {
    let alive = true;
    const load = () => void loadStates().then((v) => alive && setS(v));
    load();
    // coming back from the phone's settings screen
    const off = onResume(load);
    return () => {
      alive = false;
      off();
    };
  }, []);
  if (!s) return null;

  const onNotifications = async () => {
    if (s.notifications === 'prompt') await requestNotificationPermission();
    else if (s.notifications === 'blocked')
      await alert({
        header: PERMISSIONS.notifications,
        message: PERMISSIONS.blockedHelp,
        buttons: ['OK'],
      });
    await refresh();
  };
  const onAlarms = async () => {
    if (s.alarms === 'prompt') await openExactAlarmSettings();
    await refresh();
  };

  return (
    <>
      <h2 className="gt-section-title">{PERMISSIONS.section}</h2>
      <IonList inset>
        {s.notifications !== 'unavailable' && (
          <Row
            icon={BellIcon}
            label={PERMISSIONS.notifications}
            why={PERMISSIONS.notificationsWhy}
            state={s.notifications}
            onClick={() => void onNotifications()}
          />
        )}
        {s.alarms !== 'unavailable' && (
          <Row
            icon={AlarmClockIcon}
            label={PERMISSIONS.alarms}
            why={PERMISSIONS.alarmsWhy}
            state={s.alarms}
            onClick={() => void onAlarms()}
          />
        )}
        <Row
          icon={SunMediumIcon}
          label={PERMISSIONS.keepAwake}
          why={PERMISSIONS.keepAwakeWhy}
          state={s.keepAwake}
          last
        />
      </IonList>
    </>
  );
}

function Row({
  icon,
  label,
  why,
  state,
  onClick,
  last,
}: {
  icon: Parameters<typeof RowIcon>[0]['icon'];
  label: string;
  why: string;
  state: PermissionState;
  onClick?: () => void;
  last?: boolean;
}) {
  const actionable = !!onClick && state !== 'granted' && state !== 'unavailable';
  return (
    <IonItem
      button={actionable}
      detail={actionable}
      lines={last ? 'none' : undefined}
      onClick={actionable ? onClick : undefined}
    >
      <RowIcon
        icon={icon}
        tint={state === 'granted' ? 'green' : state === 'blocked' ? 'red' : 'amber'}
      />
      <IonLabel className="ion-text-wrap">
        <h3>{label}</h3>
        <p>{why}</p>
      </IonLabel>
      <IonNote slot="end" className={`gt-perm gt-perm--${state}`}>
        {PERMISSIONS[state]}
      </IonNote>
    </IonItem>
  );
}
