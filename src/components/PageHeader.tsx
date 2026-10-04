import { IonBackButton, IonButtons, IonHeader, IonTitle, IonToolbar } from '@ionic/react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  start?: ReactNode;
  end?: ReactNode;
  /** NAV-3: back chevron followed by the parent screen name. */
  back?: { href: string; text: string };
  /** Optional second toolbar row, e.g. a search bar (WO-1, EX-1). */
  children?: ReactNode;
}

/** Brand-blue header bar (NFR-6, mobile-frontend §2). */
export function PageHeader({ title, start, end, back, children }: Props) {
  return (
    <IonHeader className="ion-no-border">
      <IonToolbar>
        {(back || start) && (
          <IonButtons slot="start">
            {back && <IonBackButton defaultHref={back.href} text={back.text} />}
            {start}
          </IonButtons>
        )}
        {/* Detail screens show their name as the large title in the content (WT-1, ED-1). */}
        {!back && <IonTitle className="truncate">{title}</IonTitle>}
        {end && <IonButtons slot="end">{end}</IonButtons>}
      </IonToolbar>
      {children && <IonToolbar>{children}</IonToolbar>}
    </IonHeader>
  );
}
