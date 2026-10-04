import { describe, expect, it } from 'vitest';
import { dragCloses, dragOffset } from './sheetMath';

describe('bottom sheet drag', () => {
  it('springs back from a short, slow drag', () => {
    expect(dragCloses(48, 0.05, 240)).toBe(false);
    expect(dragCloses(0, 0, 240)).toBe(false);
    expect(dragCloses(-30, 2, 240)).toBe(false);
  });
  it('closes past 30 % of the panel height or on a downward flick', () => {
    expect(dragCloses(72, 0, 240)).toBe(true);
    expect(dragCloses(30, 0.8, 240)).toBe(true);
  });
  it('follows the finger down and resists upward drags', () => {
    expect(dragOffset(40)).toBe(40);
    expect(dragOffset(-100)).toBe(-20);
  });
});
