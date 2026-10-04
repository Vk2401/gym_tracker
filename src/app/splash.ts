/** Web launch splash (markup + animation in index.html). */
const INTRO_MS = 1900; // logo reveal + sheen + name; keep in sync with the index.html timeline
const EXIT_MS = 400;

const el = (): HTMLElement | null => document.getElementById('splash');

/** Starts the intro (native shell: called once the native launch screen begins to fade). */
export function playSplash(): void {
  const s = el();
  if (!s || s.classList.contains('play')) return;
  s.classList.add('play');
  s.dataset.playedAt = String(performance.now());
}

/** Fades the splash out once the intro has finished, then removes it. */
export async function dismissSplash(): Promise<void> {
  const s = el();
  if (!s) return;
  const instant =
    import.meta.env.VITE_E2E === 'true' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const elapsed = performance.now() - Number(s.dataset.playedAt ?? 0);
  if (!instant && elapsed < INTRO_MS) {
    await new Promise((r) => setTimeout(r, INTRO_MS - elapsed));
  }
  s.classList.add('out');
  setTimeout(() => s.remove(), instant ? 0 : EXIT_MS);
}
