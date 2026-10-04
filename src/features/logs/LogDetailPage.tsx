import {
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonReorder,
  IonReorderGroup,
  useIonRouter,
} from '@ionic/react';
import { calendarOutline, ellipsisHorizontal, settingsOutline, shareOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClampedText } from '@/components/NoteField';
import { DateTimeRow } from '@/components/DateTimeRow';
import { EmptyState } from '@/components/EmptyState';
import { ExercisePicker } from '@/components/ExercisePicker';
import { NumberField, TimeField } from '@/components/fields';
import { OptionSheet } from '@/components/OptionSheet';
import { PageHeader } from '@/components/PageHeader';
import { SetTable, type SetChange, type TableSet } from '@/components/SetTable';
import { Sheet } from '@/components/Sheet';
import { supersetLabels } from '@/features/workouts/blocks';
import { SummarySheet } from '@/features/session/SummarySheet';
import { useFinishSession } from '@/features/session/useFinishSession';
import { track } from '@/app/analytics';
import { getDb } from '@/db/client';
import { mutate } from '@/db/mutate';
import type { LoggedExercise, WorkoutLog } from '@/db/models';
import * as logs from '@/db/repos/logs';
import { DEFAULT_GROUP_ID } from '@/seed/seed';
import { formatDistance, formatTime, formatWeight } from '@/domain/format';
import { MEASUREMENT_TYPES, measurementRange } from '@/domain/measurements';
import { formatCountdown, REST_OPTIONS_S, startsRest } from '@/domain/session';
import { logShareText, type ShareBlock } from '@/domain/share';
import { dateKeyAt, formatDateKeyLong } from '@/domain/time';
import { validateSessionTimes } from '@/domain/validation';
import { useDialogs } from '@/hooks/useDialogs';
import { useFeedback } from '@/hooks/useFeedback';
import { useLive } from '@/hooks/useLive';
import { usePrefs } from '@/hooks/usePrefs';
import { tapHaptic } from '@/native/haptics';
import { shareText } from '@/native/share';
import { useSessionStore } from '@/store/sessionStore';
import './LogDetailPage.css';
import '../workouts/TemplateDetailPage.css';

function logBlocks(l: WorkoutLog): ShareBlock[] {
  const labels = supersetLabels(l.exercises);
  return l.exercises.map((e) =>
    e.kind === 'wod'
      ? {
          kind: 'wod',
          title: e.wodTitle ?? e.name,
          description: e.wodDescription ?? '',
          resultS: e.wodResultS,
        }
      : {
          kind: 'exercise',
          name: e.name,
          equipment: e.equipment,
          primary: e.primary,
          secondary: e.secondary,
          supersetLabel: e.supersetGroup ? (labels.get(e.supersetGroup) ?? null) : null,
          note: e.sessionNote,
          sets: e.sets,
        },
  );
}

/** WL-1..9, PD-10, PD-11, SS-1, SS-4: workout log detail. */
export default function LogDetailPage() {
  const { logId = '' } = useParams();
  const router = useIonRouter();
  const prefs = usePrefs();
  const { data: log, loading } = useLive((db) => logs.getLog(db, logId), [logId]);
  const activeId = useSessionStore((s) => s.logId);
  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState<null | { mode: 'add' } | { mode: 'replace'; id: string }>(
    null,
  );
  const [measureOpen, setMeasureOpen] = useState(false);
  const [restSheet, setRestSheet] = useState(false);
  const [history, setHistory] = useState<LoggedExercise | null>(null);
  const { promptName, actions, confirmDelete, alert } = useDialogs();
  const { error } = useFeedback();
  const { finish, summary, closeSummary } = useFinishSession();

  if (!log) {
    return (
      <IonPage>
        <PageHeader title="" back={{ href: '/logs', text: 'Logs' }} />
        <IonContent>
          {!loading && !summary && (
            <EmptyState icon={calendarOutline} message="This workout log no longer exists." />
          )}
        </IonContent>
        <SummarySheet summary={summary} onClose={closeSummary} />
      </IonPage>
    );
  }

  const active = activeId === log.id;
  const labels = supersetLabels(log.exercises);
  const units = { weight: prefs.weightUnit, distance: prefs.distanceUnit };

  // VR-3 / VR-4 / AC-18: invalid times are never saved.
  const setStart = (utc: string) => {
    const check = validateSessionTimes(utc, log.endUtc);
    if (!check.ok) return error(check.message);
    void mutate((db) =>
      logs.updateLog(db, log.id, { start: { utc, offsetMin: log.startOffsetMin } }),
    );
  };
  const setEnd = (utc: string) => {
    const check = validateSessionTimes(log.startUtc, utc);
    if (!check.ok) return error(check.message);
    void mutate((db) =>
      logs.updateLog(db, log.id, {
        end: { utc, offsetMin: log.endOffsetMin ?? log.startOffsetMin },
      }),
    );
  };

  const onSetChange = (setId: string, patch: SetChange) =>
    void mutate((db) => logs.updateLogSet(db, setId, patch));

  // WL-6 / SS-1 / PD-7
  const onToggle = (le: LoggedExercise) => (set: TableSet, completed: boolean) => {
    void tapHaptic(prefs.haptics);
    void mutate((db) => logs.setLogSetCompleted(db, set.id, completed));
    if (!completed) return;
    track('set_completed', { set_type: set.type });
    if (!active || set.type !== 'working') return;
    const group = le.supersetGroup
      ? log.exercises.filter((e) => e.supersetGroup === le.supersetGroup).map((e) => e.id)
      : [];
    if (startsRest(le.id, group))
      void useSessionStore.getState().startRest(log.restTimeS ?? prefs.restS);
  };

  // PD-10
  const exerciseMenu = async (le: LoggedExercise) => {
    const c = await actions(le.name, [
      ...(le.kind === 'exercise' && le.exerciseId
        ? [{ text: 'View History', value: 'history' as const }]
        : []),
      ...(le.kind === 'exercise' ? [{ text: 'Replace Exercise', value: 'replace' as const }] : []),
      { text: 'Reorder', value: 'reorder' as const },
      { text: 'Add Note for this session', value: 'note' as const },
      { text: 'Remove', value: 'remove' as const, role: 'destructive' as const },
    ]);
    if (c === 'history') setHistory(le);
    if (c === 'replace') setPicker({ mode: 'replace', id: le.id });
    if (c === 'reorder') setEditing(true);
    if (c === 'note') {
      void alert({
        header: 'Note for this session',
        inputs: [{ name: 'note', type: 'textarea', value: le.sessionNote, placeholder: 'Note' }],
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Save',
            handler: (v: { note: string }) =>
              void mutate((db) => logs.updateLoggedExercise(db, le.id, { sessionNote: v.note })),
          },
        ],
      });
    }
    if (c === 'remove' && (await confirmDelete(le.name)))
      await mutate((db) => logs.removeLoggedExercise(db, le.id));
  };

  // PD-11
  const logMenu = async () => {
    const c = await actions(undefined, [
      { text: 'Rename session', value: 'rename' },
      { text: 'Rest time for this session', value: 'rest' },
      { text: 'Save as Template', value: 'template' },
      { text: 'Delete Log', value: 'delete', role: 'destructive' },
    ]);
    if (c === 'rename') {
      const name = await promptName({ header: 'Rename Session', value: log.name });
      if (name) await mutate((db) => logs.updateLog(db, log.id, { name }));
    }
    if (c === 'rest') setRestSheet(true);
    if (c === 'template') {
      const name = await promptName({ header: 'Save as Template', value: log.name });
      if (name) {
        const id = await mutate((db) => logs.saveLogAsTemplate(db, log.id, name, DEFAULT_GROUP_ID));
        router.push(`/workouts/${id}`, 'forward');
      }
    }
    if (c === 'delete' && (await confirmDelete(log.name))) {
      await mutate((db) => logs.deleteLog(db, log.id));
      await useSessionStore.getState().refresh();
      leave();
    }
  };

  const leave = () => {
    if (router.canGoBack()) router.goBack();
    else router.push('/logs', 'root');
  };

  const onFinish = async () => {
    const r = await finish((await logs.getLog(getDb(), log.id))!);
    if (r === 'discarded') leave();
  };

  return (
    <IonPage>
      <PageHeader
        title={log.name}
        back={{ href: '/logs', text: 'Logs' }}
        end={
          <>
            <IonButton
              aria-label="Share"
              onClick={() =>
                void shareText(
                  log.name,
                  logShareText(
                    {
                      name: log.name,
                      dateLabel: formatDateKeyLong(log.startDateKey),
                      startUtc: log.startUtc,
                      endUtc: log.endUtc,
                      bodyWeightKg: log.bodyWeightKg,
                      blocks: logBlocks(log),
                    },
                    units,
                  ),
                )
              }
            >
              <IonIcon slot="icon-only" icon={shareOutline} />
            </IonButton>
            <IonButton aria-label="Log settings" onClick={() => void logMenu()}>
              <IonIcon slot="icon-only" icon={settingsOutline} />
            </IonButton>
            <IonButton onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</IonButton>
          </>
        }
      />
      <IonContent>
        <h1 className="gt-large-title">{log.name}</h1>

        {/* WL-2 */}
        <IonList inset>
          <DateTimeRow
            label="Start Time"
            utc={log.startUtc}
            offsetMin={log.startOffsetMin}
            onChange={setStart}
          />
          <DateTimeRow
            label="End Time"
            utc={log.endUtc}
            offsetMin={log.endOffsetMin ?? log.startOffsetMin}
            placeholder={active ? 'In progress' : '—'}
            onChange={setEnd}
          />
          <IonItem>
            <IonLabel>Weight</IonLabel>
            <div slot="end" className="gt-inline-field">
              <NumberField
                kind="bodyWeight"
                value={log.bodyWeightKg}
                weightUnit={prefs.weightUnit}
                ariaLabel="Body weight"
                placeholder="—"
                onCommit={(v) =>
                  void mutate((db) => logs.updateLog(db, log.id, { bodyWeightKg: v }))
                }
              />
              <span className="gt-unit">{prefs.weightUnit}</span>
            </div>
          </IonItem>
          <IonItem button detail lines="none" onClick={() => setMeasureOpen(true)}>
            <IonLabel>Measurements</IonLabel>
            <IonNote slot="end">{Object.keys(log.measurements).length || ''}</IonNote>
          </IonItem>
        </IonList>

        {active && log.restTimeS !== null && (
          <p className="gt-hint ion-padding-horizontal">
            Rest time for this session: {formatCountdown(log.restTimeS)}
          </p>
        )}

        {editing ? (
          <IonList inset>
            <IonListHeader>Exercises</IonListHeader>
            <IonReorderGroup
              disabled={false}
              onIonItemReorder={(e) => {
                const ids = e.detail.complete(log.exercises.map((x) => x.id)) as string[];
                void mutate((db) => logs.reorderLoggedExercises(db, ids));
              }}
            >
              {log.exercises.map((le) => (
                <IonItemSliding key={le.id}>
                  <IonItem>
                    <IonLabel className="truncate">
                      {le.kind === 'wod' ? (le.wodTitle ?? le.name) : le.name}
                    </IonLabel>
                    <IonReorder slot="end" />
                  </IonItem>
                  <IonItemOptions side="end">
                    <IonItemOption
                      color="danger"
                      onClick={() => void mutate((db) => logs.removeLoggedExercise(db, le.id))}
                    >
                      Remove
                    </IonItemOption>
                  </IonItemOptions>
                </IonItemSliding>
              ))}
            </IonReorderGroup>
          </IonList>
        ) : (
          log.exercises.map((le) => (
            <IonList
              inset
              key={le.id}
              className={`gt-block ${le.supersetGroup ? 'gt-block--superset' : ''}`}
            >
              {/* WL-3 */}
              <IonItem lines="none" className="gt-block__head">
                <IonLabel>
                  {le.supersetGroup && <p className="gt-badge">{labels.get(le.supersetGroup)}</p>}
                  <h2 className="gt-block__title truncate">
                    {le.kind === 'wod' ? 'WORKOUT OF THE DAY' : le.name.toUpperCase()}
                  </h2>
                  {le.kind === 'exercise' ? (
                    <p>{le.equipment ?? 'None'}</p>
                  ) : (
                    <p className="truncate">{le.wodTitle}</p>
                  )}
                </IonLabel>
                <IonButton
                  slot="end"
                  fill="clear"
                  aria-label={`${le.name} options`}
                  onClick={() => void exerciseMenu(le)}
                >
                  <IonIcon slot="icon-only" icon={ellipsisHorizontal} />
                </IonButton>
              </IonItem>
              <div className="ion-padding-horizontal gt-notes">
                {le.kind === 'exercise' && le.exerciseNote && (
                  <ClampedText text={le.exerciseNote} />
                )}
                {le.kind === 'wod' && le.wodDescription && <ClampedText text={le.wodDescription} />}
                {le.sessionNote && <p className="gt-session-note">{le.sessionNote}</p>}
              </div>
              {le.kind === 'wod' ? (
                // PD-8: single TIME result
                <IonItem lines="none">
                  <IonLabel>TIME</IonLabel>
                  <div slot="end" className="gt-inline-field gt-inline-field--wide">
                    <TimeField
                      value={le.wodResultS}
                      ariaLabel="Workout of the Day time"
                      onCommit={(v) =>
                        void mutate((db) => logs.updateLoggedExercise(db, le.id, { wodResultS: v }))
                      }
                    />
                  </div>
                </IonItem>
              ) : (
                <>
                  <SetTable
                    mode="log"
                    primary={le.primary}
                    secondary={le.secondary}
                    sets={le.sets}
                    weightUnit={prefs.weightUnit}
                    distanceUnit={prefs.distanceUnit}
                    exerciseName={le.name}
                    onChange={onSetChange}
                    onToggle={onToggle(le)}
                    onDelete={(id) => void mutate((db) => logs.deleteLogSet(db, id))}
                  />
                  {/* WL-7 */}
                  <div className="gt-block__actions">
                    <IonButton
                      fill="clear"
                      size="small"
                      onClick={() => void mutate((db) => logs.addLogSet(db, le.id, 'warmup'))}
                    >
                      + Add Warmup
                    </IonButton>
                    <IonButton
                      fill="clear"
                      size="small"
                      onClick={() => void mutate((db) => logs.addLogSet(db, le.id, 'working'))}
                    >
                      + Add Set
                    </IonButton>
                  </div>
                </>
              )}
            </IonList>
          ))
        )}

        {/* WL-8 */}
        {!editing && (
          <div className="ion-padding">
            <IonButton expand="block" fill="outline" onClick={() => setPicker({ mode: 'add' })}>
              + Add Exercise
            </IonButton>
          </div>
        )}
        <div className="gt-fab-space" />
      </IonContent>

      {active && (
        <IonFooter className="ion-no-border hide-on-keyboard">
          <div className="gt-footer">
            <IonButton expand="block" fill="solid" onClick={() => void onFinish()}>
              Finish Workout
            </IonButton>
          </div>
        </IonFooter>
      )}

      <ExercisePicker
        isOpen={picker !== null}
        title={picker?.mode === 'replace' ? 'Replace Exercise' : 'Add Exercise'}
        onDismiss={() => setPicker(null)}
        onPick={([id]) => {
          if (!id || !picker) return;
          void mutate((db) =>
            picker.mode === 'replace'
              ? logs.replaceLoggedExercise(db, picker.id, id)
              : logs.addLoggedExercise(db, log.id, id).then(() => undefined),
          );
        }}
      />
      <OptionSheet
        isOpen={restSheet}
        title="Rest time for this session"
        options={[
          { value: 'default', label: `Default (${formatCountdown(prefs.restS)})` },
          ...REST_OPTIONS_S.map((s) => ({
            value: String(s),
            label: s === 0 ? 'Off' : formatCountdown(s),
          })),
        ]}
        selected={log.restTimeS === null ? 'default' : String(log.restTimeS)}
        onDismiss={() => setRestSheet(false)}
        onSelect={(v) =>
          void mutate((db) =>
            logs.updateLog(db, log.id, { restTimeS: v === 'default' ? null : Number(v) }),
          )
        }
      />
      {/* PD-14 */}
      <Sheet
        isOpen={measureOpen}
        title="Measurements"
        onDismiss={() => setMeasureOpen(false)}
        onDone={() => setMeasureOpen(false)}
      >
        <IonList inset>
          {MEASUREMENT_TYPES.map((m) => (
            <IonItem key={m.type}>
              <IonLabel>{m.label}</IonLabel>
              <div slot="end" className="gt-inline-field">
                <NumberField
                  kind="plain"
                  range={measurementRange(m.type)}
                  value={log.measurements[m.type] ?? null}
                  ariaLabel={m.label}
                  placeholder="—"
                  onCommit={(v) =>
                    void mutate((db) => logs.setMeasurement(db, log.id, m.type, v, m.unit))
                  }
                />
                <span className="gt-unit">{m.unit}</span>
              </div>
            </IonItem>
          ))}
        </IonList>
      </Sheet>
      <HistorySheet le={history} onClose={() => setHistory(null)} />
      <SummarySheet summary={summary} onClose={closeSummary} />
    </IonPage>
  );
}

/** PD-10 View History. */
function HistorySheet({ le, onClose }: { le: LoggedExercise | null; onClose: () => void }) {
  const prefs = usePrefs();
  const { data = [] } = useLive(
    (db) => (le?.exerciseId ? logs.exerciseHistory(db, le.exerciseId) : Promise.resolve([])),
    [le?.exerciseId],
  );
  const line = (s: {
    reps: number | null;
    weightKg: number | null;
    timeS: number | null;
    distanceKm: number | null;
  }) =>
    [
      s.reps != null ? `${s.reps}` : null,
      s.weightKg != null
        ? `${formatWeight(s.weightKg, prefs.weightUnit)} ${prefs.weightUnit}`
        : null,
      s.timeS != null ? formatTime(s.timeS) : null,
      s.distanceKm != null
        ? `${formatDistance(s.distanceKm, prefs.distanceUnit)} ${prefs.distanceUnit}`
        : null,
    ]
      .filter(Boolean)
      .join(' × ');
  return (
    <Sheet isOpen={!!le} title={le ? `${le.name} History` : 'History'} onDismiss={onClose} full>
      {data.length === 0 && <p className="gt-empty__message ion-padding">No previous sessions.</p>}
      {data.map((h) => (
        <IonList inset key={h.logId}>
          <IonListHeader className="truncate">
            {formatDateKeyLong(dateKeyAt(h.startUtc, h.startOffsetMin))} · {h.name}
          </IonListHeader>
          {h.sets.map((s) => (
            <IonItem key={s.id} lines="none">
              <IonLabel className="num">
                {s.type === 'warmup' ? 'W' : s.setNumber}. {line(s)}
                {s.rpe != null ? ` · RPE ${s.rpe}` : ''}
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      ))}
    </Sheet>
  );
}
