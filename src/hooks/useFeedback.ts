import { useIonToast } from '@ionic/react';
import { useCallback } from 'react';
import { warningHaptic } from '@/native/haptics';
import { useAppStore } from '@/store/appStore';

/** Shows a validation / error message (BRD §14 wording) with a warning haptic. */
export function useFeedback() {
  const [present] = useIonToast();
  const error = useCallback(
    (message: string) => {
      void warningHaptic(useAppStore.getState().prefs?.haptics ?? true);
      void present({ message, duration: 2500, position: 'top', color: 'danger' });
    },
    [present],
  );
  const info = useCallback(
    (message: string) => void present({ message, duration: 2000, position: 'top' }),
    [present],
  );
  return { error, info };
}
