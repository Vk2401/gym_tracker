/**
 * Safety net for NFR-5 (VoiceOver): Ionic hides the router outlet from assistive technology
 * while an overlay is open. If overlays overlap during their animations it can leave the outlet
 * aria-hidden after the last one closes; restore it whenever no overlay is presented.
 */
export function installOverlayA11yGuard(): void {
  document.addEventListener('ionOverlayDidDismiss', () => {
    requestAnimationFrame(() => {
      const open = document.querySelector(
        'ion-alert, ion-action-sheet, ion-modal.show-modal, ion-picker, ion-popover, ion-loading',
      );
      if (open) return;
      document
        .querySelectorAll('ion-router-outlet[aria-hidden="true"]')
        .forEach((el) => el.removeAttribute('aria-hidden'));
    });
  });
}
