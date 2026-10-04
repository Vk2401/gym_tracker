import { IonBackButton, IonButtons, IonHeader, IonToolbar } from '@ionic/react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  start?: ReactNode;
  end?: ReactNode;
  /** NAV-3: back chevron followed by the parent screen name. */
  back?: { href: string; text: string };
  /** Optional row under the title, e.g. a search bar (WO-1, EX-1). */
  children?: ReactNode;
}

/**
 * Glass header on the soft-blue ground (mobile-frontend §2): pill controls on top, then the
 * screen's large title on root screens. Detail screens show their name in the content
 * (WT-1, ED-1), so the toolbar there only holds the back and action pills.
 */
export function PageHeader({ title, start, end, back, children }: Props) {
  const hasBar = Boolean(back || start || end);
  return (
    <IonHeader className="ion-no-border gt-header">
      {hasBar && (
        <IonToolbar className="gt-header__bar">
          {(back || start) && (
            <IonButtons slot="start">
              {back && <IonBackButton defaultHref={back.href} text={back.text} />}
              {start}
            </IonButtons>
          )}
          {end && <IonButtons slot="end">{end}</IonButtons>}
        </IonToolbar>
      )}
      {!back && (
        <IonToolbar className="gt-header__title">
          <h1 className="gt-title truncate">{title}</h1>
        </IonToolbar>
      )}
      {children && <IonToolbar className="gt-header__extra">{children}</IonToolbar>}
    </IonHeader>
  );
}
