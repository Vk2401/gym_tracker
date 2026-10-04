import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from './platform';

// ST-3: callers pass the user's haptics preference; we never vibrate when it is off.
export async function tapHaptic(enabled: boolean): Promise<void> {
  if (!enabled || !isNative()) return;
  await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

export async function successHaptic(enabled: boolean): Promise<void> {
  if (!enabled || !isNative()) return;
  await Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
}

export async function warningHaptic(enabled: boolean): Promise<void> {
  if (!enabled || !isNative()) return;
  await Haptics.notification({ type: NotificationType.Warning }).catch(() => undefined);
}
