import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { ReactNode } from 'react';

/** Sheet modal for pickers (mobile-frontend §4). */
export function Sheet({
  isOpen,
  title,
  onDismiss,
  doneLabel = 'Done',
  onDone,
  doneDisabled,
  full,
  children,
}: {
  isOpen: boolean;
  title: string;
  onDismiss: () => void;
  doneLabel?: string;
  onDone?: () => void;
  doneDisabled?: boolean;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDismiss}
      breakpoints={full ? undefined : [0, 0.6, 1]}
      initialBreakpoint={full ? undefined : 0.6}
    >
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle className="truncate">{title}</IonTitle>
          {onDone && (
            <IonButtons slot="end">
              <IonButton strong disabled={doneDisabled} onClick={onDone}>
                {doneLabel}
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent>{children}</IonContent>
    </IonModal>
  );
}
