import { InAppReview } from '@capacitor-community/in-app-review';
import { isNative, isPluginAvailable } from './platform';

/** ST-8 Rate the app: native store review prompt; returns false where unavailable. */
export async function requestReview(): Promise<boolean> {
  if (!isNative() || !isPluginAvailable('InAppReview')) return false;
  try {
    await InAppReview.requestReview();
    return true;
  } catch {
    return false;
  }
}
