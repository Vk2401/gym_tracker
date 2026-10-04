import { IonButton, IonContent, IonList, IonModal } from '@ionic/react';
import { useState } from 'react';
import { RecordRow } from '@/components/RecordsList';
import { mutate } from '@/db/mutate';
import { listExercises } from '@/db/repos/library';
import { updateTemplateFromLog } from '@/db/repos/logs';
import { formatDurationShort } from '@/domain/duration';
import { formatWeight } from '@/domain/format';
import { clockAt, dateKeyAt, formatDayHeading } from '@/domain/time';
import { useLive } from '@/hooks/useLive';
import { usePrefs } from '@/hooks/usePrefs';
import { track } from '@/app/analytics';
import type { FinishSummary } from './useFinishSession';
import './SummarySheet.css';

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
  // The session was just finished on this device, so its clock is the device's.
  const off = -new Date().getTimezoneOffset();
  return (
    <IonModal
      isOpen={!!summary}
      onDidDismiss={close}
      className="gt-summary-modal"
      aria-label="Workout complete"
    >
      {summary && (
        <IonContent className="gt-summary">
          <div className="gt-summary__wrap">
            <div className="gt-summary__top">
              <div className="gt-glow" aria-hidden="true" />
              <span className="gt-summary__check" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <h2 className="gt-summary__name">{summary.name}</h2>
              <p className="gt-summary__when num">
                {formatDayHeading(dateKeyAt(summary.startUtc, off))} ·{' '}
                {clockAt(summary.startUtc, off)}–{clockAt(summary.endUtc, off)}
              </p>
            </div>
            <div className="gt-summary__panel">
              <div className="gt-summary__stats">
                <div>
                  <span>Duration</span>
                  <strong className="num">
                    {formatDurationShort(summary.startUtc, summary.endUtc)}
                  </strong>
                </div>
                <div>
                  <span>Sets</span>
                  <strong className="num">{summary.sets}</strong>
                </div>
                <div>
                  <span>Volume</span>
                  <strong className="num">
                    {formatWeight(summary.volumeKg, prefs.weightUnit)} {prefs.weightUnit}
                  </strong>
                </div>
              </div>
              {summary.records.length > 0 && (
                <>
                  <h3 className="gt-summary__title">New personal records</h3>
                  <IonList lines="none" className="gt-summary__records">
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
                </>
              )}
              {summary.templateId && (
                <IonButton
                  expand="block"
                  fill="outline"
                  className="gt-summary__update"
                  disabled={updated}
                  onClick={async () => {
                    await mutate((db) => updateTemplateFromLog(db, summary.logId));
                    track('session_finished', { template_updated: true });
                    setUpdated(true);
                  }}
                >
                  {updated ? 'Template Updated' : 'Update Template'}
                </IonButton>
              )}
              <IonButton expand="block" className="gt-summary__done" onClick={close}>
                Done
              </IonButton>
            </div>
          </div>
        </IonContent>
      )}
    </IonModal>
  );
}
