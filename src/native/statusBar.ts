import { StatusBar, Style } from '@capacitor/status-bar';
import { isNative } from './platform';

/** Header is brand blue in both themes, so status-bar content is always light. */
export async function applyStatusBar(): Promise<void> {
  if (!isNative()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark }); // Dark style = light text
  } catch {
    /* not supported on this platform */
  }
}
