import { clampTextScale } from '@/domain/units';
import { getPreferredTextScale } from '@/native/textZoom';
import { onResume } from '@/native/lifecycle';
import { useAppStore } from '@/store/appStore';

async function apply(): Promise<void> {
  const scale = clampTextScale(await getPreferredTextScale());
  document.documentElement.style.setProperty('--gt-text-scale', String(scale));
  useAppStore.getState().setTextScale(scale);
}

/** Device-independence §2: OS text size read, clamped, applied; re-read on resume. */
export function initTextScale(): void {
  void apply();
  onResume(() => void apply());
}
