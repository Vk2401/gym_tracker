import { IonBackButton, IonButtons, IonHeader, IonTitle, IonToolbar } from '@ionic/react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  start?: ReactNode;
  end?: ReactNode;
  /** NAV-3: back chevron followed by the parent screen name (empty text = icon only). */
  back?: { href: string; text: string };
}

/**
 * Transparent header over the soft-blue ground (design: "Gym Tracker Modern UI"): pill
 * controls only. The large title lives in the content (`ScreenTitle` / `.gt-large-title`);
 * a compact title fades in here once the content scrolls (see `Content`).
 */
export function PageHeader({ title, start, end, back }: Props) {
  const bare = !back && !start && !end;
  return (
    <IonHeader
      className={`ion-no-border gt-header${bare ? ' gt-header--bare' : ''}${back?.text ? ' gt-header--back' : ''}`}
    >
      <IonToolbar>
        {(back || start) && (
          <IonButtons slot="start">
            {back && (
              <IonBackButton
                defaultHref={back.href}
                text={back.text}
                className={back.text ? undefined : 'gt-back--icon'}
              />
            )}
            {start}
          </IonButtons>
        )}
        <IonTitle className="gt-header__mini">{title}</IonTitle>
        {end && <IonButtons slot="end">{end}</IonButtons>}
      </IonToolbar>
    </IonHeader>
  );
}
