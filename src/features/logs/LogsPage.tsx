import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/react';
import { calendarOutline, settingsOutline } from 'ionicons/icons';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { EMPTY } from '@/domain/messages';

// LG-1 shell. Calendar and day list arrive in Phase 3.
export default function LogsPage() {
  return (
    <IonPage>
      <PageHeader
        title="Logs"
        start={<IonButton>Today</IonButton>}
        end={
          <IonButton aria-label="Calendar settings">
            <IonIcon slot="icon-only" icon={settingsOutline} />
          </IonButton>
        }
      />
      <IonContent>
        <EmptyState icon={calendarOutline} message={EMPTY.logsDay.message} />
      </IonContent>
    </IonPage>
  );
}
