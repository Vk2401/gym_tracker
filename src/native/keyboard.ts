import { Keyboard } from '@capacitor/keyboard';
import { isNative } from './platform';

const isField = (el: Element | null): el is HTMLElement =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLElement && el.isContentEditable);

/**
 * Toggles `keyboard-open` on <html> so fixed chrome (tab bar, FAB, rest timer, Start Workout)
 * steps aside, and keeps the focused field in the middle of the visible area — on open and
 * whenever focus moves to the next field (device-independence §5). The WebView itself is
 * resized by the OS (iOS `resize: native`, Android `adjustResize`), so layouts reflow.
 */
export function initKeyboard(): void {
  const root = document.documentElement;
  const reveal = () => {
    const el = document.activeElement;
    if (!isField(el)) return;
    // Wait one frame so the resized viewport is laid out before measuring.
    requestAnimationFrame(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  };
  document.addEventListener('focusin', (e) => {
    if (root.classList.contains('keyboard-open') && isField(e.target as Element)) reveal();
  });
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
