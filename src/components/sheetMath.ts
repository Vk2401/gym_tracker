/** Release past this share of the panel height closes a dragged sheet… */
const CLOSE_DISTANCE = 0.3;
/** …and so does a downward flick faster than this (px/ms). */
const CLOSE_VELOCITY = 0.5;

/** Whether a released drag closes the sheet. */
export function dragCloses(dy: number, velocity: number, height: number): boolean {
  if (dy <= 0 || height <= 0) return false;
  return dy / height >= CLOSE_DISTANCE || velocity >= CLOSE_VELOCITY;
}

/** Upward drags are resisted so the sheet never detaches from the bottom. */
export function dragOffset(dy: number): number {
  return dy >= 0 ? dy : -Math.sqrt(-dy) * 2;
}
