import { StatusBar, Style } from '@capacitor/status-bar';
import { isNative } from './platform';

/**
 * Status-bar content follows the app theme (never the OS): the header sits on the light
 * ground in light mode (dark text) and on the navy ground in dark mode (light text).
 */
export async function applyStatusBar(): Promise<void> {
  if (!isNative()) return;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }); // Dark = light text
  } catch {
    /* not supported on this platform */
  }
}
