import { IonButton, IonItem, IonLabel, IonList, IonListHeader, IonNote } from '@ionic/react';
import { useState } from 'react';
import { RecordRow } from '@/components/RecordsList';
import { Sheet } from '@/components/Sheet';
import { mutate } from '@/db/mutate';
import { listExercises } from '@/db/repos/library';
import { updateTemplateFromLog } from '@/db/repos/logs';
import { formatDuration } from '@/domain/duration';
import { formatWeight } from '@/domain/format';
import { useLive } from '@/hooks/useLive';
import { usePrefs } from '@/hooks/usePrefs';
import { track } from '@/app/analytics';
import type { FinishSummary } from './useFinishSession';

/** SS-4 / PD-4: finish summary with duration, sets, volume, new records and Update Template. */
export function SummarySheet({
  summary,
  onClose,
}: {
  summary: FinishSummary | null;
  onClose: () => void;
}) {
  const prefs = usePrefs();
  const { data: exercises = [] } = useLive(listExercises, []);
  const [updated, setUpdated] = useState(false);
  const name = (id: string) => exercises.find((e) => e.id === id)?.name ?? 'Exercise';
  const close = () => {
    setUpdated(false);
    onClose();
  };
  return (
    <Sheet isOpen={!!summary} title="Workout Complete" onDismiss={close} onDone={close}>
      {summary && (
        <>
          <h2 className="gt-large-title">{summary.name}</h2>
          <IonList inset>
            <IonItem>
              <IonLabel>Duration</IonLabel>
              <IonNote slot="end">{formatDuration(summary.startUtc, summary.endUtc)}</IonNote>
            </IonItem>
            <IonItem>
              <IonLabel>Sets</IonLabel>
              <IonNote slot="end" className="num">
                {summary.sets}
              </IonNote>
            </IonItem>
            <IonItem lines="none">
              <IonLabel>Volume</IonLabel>
              <IonNote slot="end" className="num">
                {formatWeight(summary.volumeKg, prefs.weightUnit)} {prefs.weightUnit}
              </IonNote>
            </IonItem>
          </IonList>
          {summary.records.length > 0 && (
            <IonList inset>
              <IonListHeader>New Personal Records</IonListHeader>
              {summary.records.map((r) => (
                <RecordRow
                  key={`${r.exerciseId}-${r.recordType}`}
                  r={r}
                  name={name(r.exerciseId)}
                  wu={prefs.weightUnit}
                  du={prefs.distanceUnit}
                />
              ))}
            </IonList>
          )}
          {summary.templateId && (
            <div className="ion-padding">
              <IonButton
                expand="block"
                fill="outline"
                disabled={updated}
                onClick={async () => {
                  await mutate((db) => updateTemplateFromLog(db, summary.logId));
                  track('session_finished', { template_updated: true });
                  setUpdated(true);
                }}
              >
                {updated ? 'Template Updated' : 'Update Template'}
              </IonButton>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
