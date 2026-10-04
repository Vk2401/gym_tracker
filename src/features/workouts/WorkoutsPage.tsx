import { IonButton, IonContent, IonPage, IonSearchbar } from '@ionic/react';
import { barbellOutline } from 'ionicons/icons';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { EMPTY } from '@/domain/messages';

// WO-1 shell. Groups, templates, search and + menu arrive in Phase 2.
export default function WorkoutsPage() {
  return (
    <IonPage>
      <PageHeader
        title="Workouts"
        start={<IonButton>Quick Go!</IonButton>}
        end={<IonButton>Edit</IonButton>}
      >
        <IonSearchbar className="gt-search" placeholder="Search Workouts" />
      </PageHeader>
      <IonContent>
        <EmptyState icon={barbellOutline} message={EMPTY.workouts.message} />
      </IonContent>
    </IonPage>
  );
}
