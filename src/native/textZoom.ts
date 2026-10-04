import { TextZoom } from '@capacitor/text-zoom';
import { isNative } from './platform';

/**
 * Reads the OS preferred text size (iOS Dynamic Type / Android font scale) as a factor
 * (1 = default). Web returns 1. Never calls TextZoom.set() — that zooms the whole
 * WebView (device-independence §2).
 */
export async function getPreferredTextScale(): Promise<number> {
  if (!isNative()) return 1;
  try {
    const { value } = await TextZoom.getPreferred();
    return Number.isFinite(value) && value > 0 ? value : 1;
  } catch {
    return 1;
  }
}
