import { createAnimation, type Animation } from '@ionic/react';
import {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { dragCloses, dragOffset } from './sheetMath';

/** Design motion: sheets rise in .45s on cubic-bezier(.32,.72,0,1); the scrim fades. */
const EASE_SHEET = 'cubic-bezier(.32,.72,0,1)';
const DRAG_START_PX = 6;

/** Inline style writes on DOM nodes the gesture drives (kept outside the hook). */
function style(
  el: HTMLElement | null | undefined,
  css: Partial<Record<'transition' | 'transform' | 'opacity', string>>,
) {
  if (el) Object.assign(el.style, css);
}

const parts = (base: HTMLElement) => {
  const root = base.shadowRoot ?? base;
  return {
    backdrop: root.querySelector('ion-backdrop') as HTMLElement,
    wrapper: root.querySelector('.modal-wrapper') as HTMLElement,
  };
};

/** Enter: scrim fades in, panel slides up from below (design `sheetUp`). */
export function sheetEnter(base: HTMLElement): Animation {
  const { backdrop, wrapper } = parts(base);
  return createAnimation()
    .addElement(base)
    .duration(450)
    .easing(EASE_SHEET)
    .addAnimation([
      createAnimation()
        .addElement(backdrop)
        .fromTo('opacity', '0.01', 'var(--backdrop-opacity)')
        .beforeStyles({ 'pointer-events': 'none' })
        .afterClearStyles(['pointer-events']),
      createAnimation()
        .addElement(wrapper)
        .fromTo('transform', 'translateY(100%)', 'translateY(0)')
        .fromTo('opacity', '1', '1'),
    ]);
}

/** Leave: continues from wherever a drag left the panel and scrim. */
export function sheetLeave(base: HTMLElement): Animation {
  const { backdrop, wrapper } = parts(base);
  const from = backdrop.style.opacity || '1';
  return createAnimation()
    .addElement(base)
    .duration(320)
    .easing(EASE_SHEET)
    .addAnimation([
      createAnimation().addElement(backdrop).fromTo('opacity', from, '0'),
      createAnimation()
        .addElement(wrapper)
        .fromTo('transform', 'translateY(0)', 'translateY(100%)'),
    ]);
}

/**
 * Drag-to-dismiss for a bottom panel inside an IonModal: the panel follows the finger,
 * the scrim fades with it, and on release it either closes (far enough or flicked) or
 * springs back. Taps on buttons still work; a real drag swallows the click that follows.
 */
export function useSheetDrag(
  modal: RefObject<HTMLIonModalElement | null>,
  panel: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const s = useRef({ id: -1, y0: 0, dy: 0, dragging: false, t: 0, y: 0, v: 0, swallow: false });

  const backdrop = () =>
    modal.current?.shadowRoot?.querySelector('ion-backdrop') as HTMLElement | null;

  const paint = (dy: number, animate: boolean) => {
    const el = panel.current;
    if (!el) return;
    const h = el.offsetHeight || 1;
    style(el, {
      transition: animate ? `transform 0.35s ${EASE_SHEET}` : 'none',
      transform: dy ? `translateY(${dragOffset(dy)}px)` : '',
    });
    style(backdrop(), {
      transition: animate ? `opacity 0.35s ${EASE_SHEET}` : 'none',
      opacity: String(Math.max(0, Math.min(1, 1 - Math.max(0, dy) / h))),
    });
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const list = (e.target as HTMLElement).closest('.gt-menu__list');
    s.current.swallow = false;
    if (list && list.scrollTop > 0) return; // let a scrolled list scroll back first
    s.current = { ...s.current, id: e.pointerId, y0: e.clientY, dy: 0, dragging: false };
    s.current.t = e.timeStamp;
    s.current.y = e.clientY;
    s.current.v = 0;
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const st = s.current;
    if (e.pointerId !== st.id) return;
    const dy = e.clientY - st.y0;
    if (!st.dragging) {
      if (Math.abs(dy) < DRAG_START_PX) return;
      st.dragging = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const dt = e.timeStamp - st.t;
    if (dt > 0) st.v = 0.8 * ((e.clientY - st.y) / dt) + 0.2 * st.v;
    st.t = e.timeStamp;
    st.y = e.clientY;
    st.dy = dy;
    paint(dy, false);
  };

  const end = (e: ReactPointerEvent<HTMLElement>) => {
    const st = s.current;
    if (e.pointerId !== st.id) return;
    st.id = -1;
    if (!st.dragging) return;
    st.dragging = false;
    st.swallow = true;
    const h = panel.current?.offsetHeight ?? 0;
    // A finger that stopped before lifting has no flick left in it.
    const v = e.timeStamp - st.t > 80 ? 0 : st.v;
    if (dragCloses(st.dy, v, h)) onClose();
    else paint(0, true);
  };

  const onClickCapture = (e: ReactMouseEvent) => {
    if (!s.current.swallow) return;
    s.current.swallow = false;
    e.stopPropagation();
    e.preventDefault();
  };

  /** Clears drag styles so the next presentation starts clean. */
  const reset = () => {
    s.current.swallow = false;
    style(panel.current, { transition: '', transform: '' });
    style(backdrop(), { transition: '', opacity: '' });
  };

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      onClickCapture,
    },
    reset,
  };
}
