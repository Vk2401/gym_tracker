import { IonButtons, IonHeader, IonTitle, IonToolbar } from '@ionic/react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  start?: ReactNode;
  end?: ReactNode;
  /** Optional second toolbar row, e.g. a search bar (WO-1, EX-1). */
  children?: ReactNode;
}

/** Brand-blue header bar (NFR-6, mobile-frontend §2). */
export function PageHeader({ title, start, end, children }: Props) {
  return (
    <IonHeader className="ion-no-border">
      <IonToolbar>
        {start && <IonButtons slot="start">{start}</IonButtons>}
        <IonTitle className="truncate">{title}</IonTitle>
        {end && <IonButtons slot="end">{end}</IonButtons>}
      </IonToolbar>
      {children && <IonToolbar>{children}</IonToolbar>}
    </IonHeader>
  );
}
