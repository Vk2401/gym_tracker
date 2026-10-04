import { SplashScreen } from '@capacitor/splash-screen';
import { isNative } from './platform';

export async function hideSplash(): Promise<void> {
  if (!isNative()) return;
  await SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => undefined);
}
