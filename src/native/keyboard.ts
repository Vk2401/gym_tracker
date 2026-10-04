import { Keyboard } from '@capacitor/keyboard';
import { isNative } from './platform';

/**
 * Toggles `keyboard-open` on <html> so fixed bars (FAB, rest timer, Start Workout) can hide,
 * and keeps the focused input visible (device-independence §5).
 */
export function initKeyboard(): void {
  const root = document.documentElement;
  const reveal = () => {
    const el = document.activeElement;
    if (el instanceof HTMLElement) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  if (isNative()) {
    void Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => undefined);
    void Keyboard.addListener('keyboardWillShow', () => root.classList.add('keyboard-open'));
    void Keyboard.addListener('keyboardDidShow', reveal);
    void Keyboard.addListener('keyboardWillHide', () => root.classList.remove('keyboard-open'));
    return;
  }
  const vv = window.visualViewport;
  if (!vv) return;
  vv.addEventListener('resize', () => {
    const open = window.innerHeight - vv.height > 150;
    root.classList.toggle('keyboard-open', open);
    if (open) reveal();
  });
}
