import { IonContent } from '@ionic/react';
import { useRef, type ReactNode } from 'react';

/**
 * Screen content that scrolls behind the glass header. Once scrolled, the page's header gets
 * `gt-header--scrolled` (frosted background + compact title) — toggled on the element
 * directly so scrolling never re-renders the screen. A `.gt-sticky` child (e.g. the
 * Exercises search) pins under the header and gets `is-stuck` while pinned.
 */
export function Content({ children, className }: { children?: ReactNode; className?: string }) {
  const ref = useRef<HTMLIonContentElement>(null);
  const scrolled = useRef(false);
  const header = () =>
    ref.current?.closest('.ion-page')?.querySelector<HTMLElement>(':scope > ion-header');

  return (
    <IonContent
      ref={ref}
      fullscreen
      scrollEvents
      className={className}
      onIonScroll={(e) => {
        const sticky = ref.current?.querySelector<HTMLElement>('.gt-sticky');
        if (sticky) {
          const top = header()?.getBoundingClientRect().bottom ?? 0;
          sticky.classList.toggle('is-stuck', sticky.getBoundingClientRect().top <= top + 0.5);
        }
        const s = e.detail.scrollTop > 28;
        if (s === scrolled.current) return;
        scrolled.current = s;
        header()?.classList.toggle('gt-header--scrolled', s);
      }}
    >
      {children}
    </IonContent>
  );
}
