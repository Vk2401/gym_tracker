import { describe, expect, it } from 'vitest';
import { normalizeTutorialUrl, tutorialSource } from './tutorial';

describe('ED-7 tutorial link', () => {
  it('accepts web links and adds https:// when the scheme is missing', () => {
    expect(normalizeTutorialUrl('https://www.youtube.com/watch?v=abc')).toBe(
      'https://www.youtube.com/watch?v=abc',
    );
    expect(normalizeTutorialUrl('  youtu.be/abc ')).toBe('https://youtu.be/abc');
    expect(normalizeTutorialUrl('http://example.com/bench')).toBe('http://example.com/bench');
  });
  it('clears with an empty value', () => {
    expect(normalizeTutorialUrl('   ')).toBe('');
  });
  it('rejects anything that is not a web link', () => {
    expect(normalizeTutorialUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeTutorialUrl('ftp://example.com/x')).toBeNull();
    expect(normalizeTutorialUrl('bench press')).toBeNull();
    expect(normalizeTutorialUrl('localhost')).toBeNull();
  });
  it('labels the source', () => {
    expect(tutorialSource('https://www.youtube.com/watch?v=abc')).toBe('YouTube');
    expect(tutorialSource('https://m.youtube.com/watch?v=abc')).toBe('YouTube');
    expect(tutorialSource('https://youtu.be/abc')).toBe('YouTube');
    expect(tutorialSource('https://www.muscleandstrength.com/x')).toBe('muscleandstrength.com');
    expect(tutorialSource('not a url')).toBe('');
  });
});
