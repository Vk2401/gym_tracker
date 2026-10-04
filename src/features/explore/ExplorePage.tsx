import { IonContent, IonPage } from '@ionic/react';
import { statsChartOutline } from 'ionicons/icons';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { EMPTY } from '@/domain/messages';

// XP-1 shell. Dashboard arrives in Phase 4.
export default function ExplorePage() {
  return (
    <IonPage>
      <PageHeader title="Explore" />
      <IonContent>
        <EmptyState icon={statsChartOutline} message={EMPTY.explore.message} />
      </IonContent>
    </IonPage>
  );
}
