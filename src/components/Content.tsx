import { IonContent } from '@ionic/react';
import { useRef, type ReactNode } from 'react';

/**
 * Screen content that scrolls behind the glass header. Once scrolled, the page's header gets
 * `gt-header--scrolled` (frosted background + compact title) — toggled on the element
 * directly so scrolling never re-renders the screen.
 */
export function Content({ children, className }: { children?: ReactNode; className?: string }) {
  const ref = useRef<HTMLIonContentElement>(null);
  const scrolled = useRef(false);
  return (
    <IonContent
      ref={ref}
      fullscreen
      scrollEvents
      className={className}
      onIonScroll={(e) => {
        const s = e.detail.scrollTop > 28;
        if (s === scrolled.current) return;
        scrolled.current = s;
        ref.current
          ?.closest('.ion-page')
          ?.querySelector(':scope > ion-header')
          ?.classList.toggle('gt-header--scrolled', s);
      }}
    >
      {children}
    </IonContent>
  );
}
