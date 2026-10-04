import { showKeyboard } from '@/native/keyboard';

/**
 * Popups and the on-screen keyboard (device-independence §5, owner request):
 *
 * 1. Autofocus — when an alert or sheet with a text field opens (Add / Rename / search …),
 *    its first field is focused so the user can type straight away. A sheet opts out with
 *    `data-no-autofocus`; `[data-autofocus]` picks a specific field.
 * 2. Smooth keyboard — the OS resizes the WebView in one step when the keyboard opens or
 *    closes, so a centred alert or a bottom sheet would jump. Their last position is kept and,
 *    after the resize, they glide from there to the new spot (FLIP, on the `translate`
 *    property so Ionic's own transform animations are untouched).
 */

const EASE = 'cubic-bezier(.32,.72,0,1)';
const OVERLAYS = 'ion-alert, ion-modal.show-modal, ion-action-sheet';

/** The visible box of a presented overlay. */
function box(overlay: Element): HTMLElement | null {
  if (overlay.tagName === 'ION-ALERT') return overlay.querySelector('.alert-wrapper');
  if (overlay.tagName === 'ION-ACTION-SHEET') return overlay.querySelector('.action-sheet-wrapper');
  return overlay.shadowRoot?.querySelector<HTMLElement>('.modal-wrapper') ?? null;
}

const presented = () =>
  [...document.querySelectorAll(OVERLAYS)].filter((o) => !o.classList.contains('overlay-hidden'));

const isTextField = (el: Element): el is HTMLInputElement | HTMLTextAreaElement =>
  (el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement &&
      !['hidden', 'checkbox', 'radio', 'button', 'submit', 'file', 'range'].includes(el.type))) &&
  !el.disabled &&
  !el.readOnly &&
  !el.classList.contains('cloned-input') &&
  el.getClientRects().length > 0;

function firstField(overlay: Element): HTMLInputElement | HTMLTextAreaElement | null {
  const preferred = overlay.querySelector('[data-autofocus]');
  const scope = preferred ?? overlay;
  for (const el of scope.querySelectorAll('input, textarea')) if (isTextField(el)) return el;
  return null;
}

function autofocus(overlay: Element) {
  if (overlay.closest('[data-no-autofocus]') || overlay.querySelector('[data-no-autofocus]'))
    return;
  const active = document.activeElement;
  if (active && overlay.contains(active) && isTextField(active)) return;
  const field = firstField(overlay);
  if (!field) return;
  field.focus({ preventScroll: true });
  // put the caret after any prefilled text (Rename)
  if (field.value && 'setSelectionRange' in field) {
    try {
      field.setSelectionRange(field.value.length, field.value.length);
    } catch {
      /* type=number/url etc. without selection support */
    }
  }
  showKeyboard();
}

const last = new Map<HTMLElement, number>();
let settle: ReturnType<typeof setTimeout> | undefined;

function snapshot() {
  last.clear();
  for (const o of presented()) {
    const b = box(o);
    if (b) last.set(b, b.getBoundingClientRect().top);
  }
}

function glide() {
  for (const [b, before] of last) {
    if (!b.isConnected) continue;
    b.style.transition = 'none';
    b.style.translate = '';
    const delta = before - b.getBoundingClientRect().top;
    if (Math.abs(delta) < 1) continue;
    b.style.translate = `0 ${delta}px`;
    void b.offsetHeight; // commit the inverted position before animating back
    b.style.transition = `translate 0.3s ${EASE}`;
    b.style.translate = '';
  }
  // once settled, the resting positions are the baseline for the next resize (keyboard closing)
  clearTimeout(settle);
  settle = setTimeout(snapshot, 350);
}

export function installOverlayMotion(): void {
  for (const kind of ['Alert', 'Modal', 'ActionSheet']) {
    document.addEventListener(`ion${kind}DidPresent`, (e) => {
      const overlay = e.target as Element;
      snapshot();
      // let Ionic finish its own focus handling first
      requestAnimationFrame(() => autofocus(overlay));
    });
    document.addEventListener(`ion${kind}DidDismiss`, snapshot);
  }
  // focusing a field (tap or autofocus) is the moment just before the keyboard opens
  document.addEventListener('focusin', () => {
    if (last.size === 0) snapshot();
  });
  window.addEventListener('resize', glide);
  window.visualViewport?.addEventListener('resize', glide);
}
