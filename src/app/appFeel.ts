const editable = (t: EventTarget | null): boolean =>
  t instanceof HTMLInputElement ||
  t instanceof HTMLTextAreaElement ||
  (t instanceof HTMLElement && t.isContentEditable);

/**
 * Native-app feel (backs up the CSS in base.css): nothing outside a text field can be
 * selected, images and links can't be dragged, and long-press shows no browser menu.
 */
export function installAppFeel(): void {
  document.addEventListener('dragstart', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => {
    if (!editable(e.target)) e.preventDefault();
  });
  document.addEventListener('contextmenu', (e) => {
    if (!editable(e.target)) e.preventDefault();
  });
}
