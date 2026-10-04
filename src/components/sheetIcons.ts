/**
 * Lucide icon outlines (MIT) as inline SVG data URLs, for Ionic overlays that take an icon
 * string (action sheets, toasts). Bundled — no network (NFR-2).
 */
const PATHS = {
  folderPlus:
    'M12 10v6|M9 13h6|M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
  filePlus:
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z|M14 2v4a2 2 0 0 0 2 2h4|M9 15h6|M12 18v-6',
  dumbbell:
    'M17.6 12.8a2 2 0 1 0 2.8-2.8l-1.8-1.8a2 2 0 0 0 2.8-2.8l-2.8-2.8a2 2 0 0 0-2.8 2.8l-1.8-1.8a2 2 0 1 0-2.8 2.8z|m2.5 21.5 1.4-1.4|m20.1 3.9 1.4-1.4|M5.3 21.5a2 2 0 1 0 2.8-2.8l1.8 1.8a2 2 0 1 0 2.8-2.8l-6.4-6.4a2 2 0 1 0-2.8 2.8l1.8 1.8a2 2 0 0 0-2.8 2.8z|m9.6 14.4 4.8-4.8',
  layers:
    'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z|m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65|m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65',
  timer: 'M10 2h4|m12 14 3-3|M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  pencil:
    'M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z',
  palette:
    'M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z|M13.5 6.5h.01|M17.5 10.5h.01|M6.5 12.5h.01|M8.5 7.5h.01',
  trash: 'M3 6h18|M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6|M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2',
  history: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8|M3 3v5h5|M12 7v5l4 2',
  replace: 'm17 2 4 4-4 4|M3 11v-1a4 4 0 0 1 4-4h14|m7 22-4-4 4-4|M21 13v1a4 4 0 0 1-4 4H3',
  reorder: 'm21 16-4 4-4-4|M17 20V4|m3 8 4-4 4 4|M7 4v16',
  note: 'M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z|M15 3v4a2 2 0 0 0 2 2h4',
  open: 'M5 12h14|m12 5 7 7-7 7',
  save: 'M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z|M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7|M7 3v4a1 1 0 0 0 1 1h7',
  calendar:
    'M8 2v4|M16 2v4|M3 10h18|M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  ungroup: 'M5 7h7|M5 12h14|M5 17h10',
  alert: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 8v4|M12 16h.01',
  check: 'M20 6 9 17l-5-5',
} as const;

export type SheetIcon = keyof typeof PATHS;

/** Data URL for an outline icon, drawn in the current text colour. */
export function sheetIcon(name: SheetIcon): string {
  const paths = PATHS[name]
    .split('|')
    .map(
      (d) =>
        `<path class="ionicon-fill-none" d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${paths}</svg>`;
  // ion-icon parses `;utf8,` data URLs as raw markup, so the SVG is not URI-encoded.
  return `data:image/svg+xml;utf8,${svg}`;
}
