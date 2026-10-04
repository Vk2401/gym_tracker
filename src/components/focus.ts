/** Moves focus to the next set input (Enter / Next on the keyboard, mobile-frontend §4). */
export function focusNext(el: HTMLElement) {
  const all = Array.from(
    document.querySelectorAll<HTMLInputElement>('ion-content input[data-nav]'),
  ).filter((i) => i.offsetParent !== null);
  const next = all[all.indexOf(el as HTMLInputElement) + 1];
  if (next) next.focus();
  else el.blur();
}
