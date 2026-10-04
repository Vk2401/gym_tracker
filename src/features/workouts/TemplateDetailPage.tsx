import {
  IonButton,
  IonCheckbox,
  IonFab,
  IonFabButton,
  IonFooter,
  IonInput,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonReorder,
  IonReorderGroup,
} from '@ionic/react';
import { Content } from '@/components/Content';
import { DumbbellIcon, EllipsisIcon, PlayIcon, PlusIcon, ShareIcon, TimerIcon } from 'lucide-react';
import { templateTotals } from '@/domain/totals';
import { Icon } from '@/components/Icon';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CategoryDot } from '@/components/CategoryDot';
import { EmptyState } from '@/components/EmptyState';
import { ExercisePicker } from '@/components/ExercisePicker';
import { NoteField } from '@/components/NoteField';
import { OptionSheet } from '@/components/OptionSheet';
import { PageHeader } from '@/components/PageHeader';
import { SetTable } from '@/components/SetTable';
import { useStartWorkout } from '@/app/useStartWorkout';
import { mutate } from '@/db/mutate';
import type { TemplateExerciseItem, TemplateItem } from '@/db/models';
import { setChipText } from '@/domain/setText';
import type { DistanceUnit, WeightUnit } from '@/domain/types';
import { Sheet } from '@/components/Sheet';
import * as wo from '@/db/repos/workouts';
import { EMPTY, MENU_SUB } from '@/domain/messages';
import { templateShareText } from '@/domain/share';
import { supersetLabels, templateBlocks } from './blocks';
import { MSG_EXTRA } from '@/domain/messages';
import { useDialogs } from '@/hooks/useDialogs';
import { useLive } from '@/hooks/useLive';
import { usePrefs } from '@/hooks/usePrefs';
import { shareText } from '@/native/share';
import './TemplateDetailPage.css';

/** WT-1..7, PD-1, PD-6..8: workout template detail. */
export default function TemplateDetailPage() {
  const { templateId = '' } = useParams();
  const prefs = usePrefs();
  const { data: groups = [] } = useLive(wo.listGroups, []);
  const { data: t, loading } = useLive((db) => wo.getTemplate(db, templateId), [templateId]);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [picker, setPicker] = useState<null | 'exercise' | 'superset'>(null);
  const [groupSheet, setGroupSheet] = useState(false);
  const [setsFor, setSetsFor] = useState<string | null>(null);
  const start = useStartWorkout();
  const { promptName, actions, alert, confirmDelete } = useDialogs();

  if (!t) {
    return (
      <IonPage>
        <PageHeader title="" back={{ href: '/workouts', text: 'Workouts' }} />
        <Content>
          {!loading && <EmptyState icon={DumbbellIcon} fill message={MSG_EXTRA.templateMissing} />}
        </Content>
      </IonPage>
    );
  }

  const labels = supersetLabels(t.items);
  const setsItem = t.items.find(
    (i): i is TemplateExerciseItem => i.kind === 'exercise' && i.id === setsFor,
  );
  const totals = templateTotals(t.items.flatMap((i) => (i.kind === 'exercise' ? [i] : [])));
  const units = { weight: prefs.weightUnit, distance: prefs.distanceUnit };

  const addWod = () =>
    alert({
      header: 'Workout of the Day',
      inputs: [
        { name: 'title', placeholder: 'Title', attributes: { maxlength: 60 } },
        { name: 'description', type: 'textarea', placeholder: 'Description' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (v: { title: string; description: string }) => {
            if (!v.title.trim()) return false;
            void mutate((db) => wo.addTemplateWod(db, t.id, v.title, v.description));
            return true;
          },
        },
      ],
    });

  // WT-4
  const onFab = async () => {
    const c = await actions('Add to workout', [
      { text: 'Add Exercise', value: 'exercise', icon: 'dumbbell', subtitle: MENU_SUB.addExercise },
      { text: 'Add SuperSet', value: 'superset', icon: 'layers', subtitle: MENU_SUB.addSuperset },
      { text: 'Add Workout of the Day', value: 'wod', icon: 'timer', subtitle: MENU_SUB.addWod },
    ]);
    if (c === 'wod') void addWod();
    if (c === 'superset' || c === 'exercise') setPicker(c);
  };

  const itemMenu = async (i: TemplateItem) => {
    const name = i.kind === 'wod' ? i.title : i.exercise.name;
    const c = await actions(name, [
      ...(i.supersetGroup
        ? [{ text: 'Remove from Superset', value: 'ungroup' as const, icon: 'ungroup' as const }]
        : []),
      {
        text: 'Remove',
        value: 'remove' as const,
        role: 'destructive' as const,
        icon: 'trash' as const,
      },
    ]);
    if (c === 'ungroup') await mutate((db) => wo.ungroupTemplateItem(db, i.id));
    if (c === 'remove' && (await confirmDelete(name)))
      await mutate((db) => wo.removeTemplateItem(db, i.id));
  };

  const rename = async () => {
    const name = await promptName({ header: 'Rename Template', value: t.name });
    if (name) await mutate((db) => wo.updateTemplate(db, t.id, { name }));
  };

  const group = async () => {
    await mutate((db) => wo.groupTemplateItems(db, t.id, selected));
    setSelected([]);
  };

  return (
    <IonPage>
      <PageHeader
        title={t.name}
        back={{ href: '/workouts', text: 'Workouts' }}
        end={
          <>
            <IonButton
              aria-label="Share"
              onClick={() =>
                void shareText(
                  t.name,
                  templateShareText(
                    { name: t.name, note: t.note, blocks: templateBlocks(t) },
                    units,
                  ),
                )
              }
            >
              <Icon slot="icon-only" icon={ShareIcon} />
            </IonButton>
            <IonButton
              onClick={() => {
                setEditing(!editing);
                setSelected([]);
              }}
            >
              {editing ? 'Done' : 'Edit'}
            </IonButton>
          </>
        }
      />
      <Content>
        <h1 className="gt-large-title">{t.name}</h1>
        {!editing && (
          <section className="gt-hero">
            <div className="gt-glow gt-glow--light" aria-hidden="true" />
            <div className="gt-hero__stats">
              <div>
                <strong className="num">{totals.exercises}</strong>
                <span>Exercises</span>
              </div>
              <div>
                <strong className="num">{totals.sets}</strong>
                <span>Sets</span>
              </div>
              <div>
                <strong className="num">{totals.reps}</strong>
                <span>Reps</span>
              </div>
            </div>
            {/* PD-1 */}
            <IonButton
              expand="block"
              className="gt-hero__cta"
              disabled={t.items.length === 0}
              onClick={() => void start({ kind: 'template', templateId: t.id })}
            >
              <Icon slot="start" icon={PlayIcon} className="gt-play" />
              Start Workout
            </IonButton>
          </section>
        )}

        {editing ? (
          <>
            <IonList inset>
              <IonItem button detail onClick={() => void rename()}>
                <IonLabel>Name</IonLabel>
                <IonNote slot="end" className="truncate">
                  {t.name}
                </IonNote>
              </IonItem>
            </IonList>
            <h2 className="gt-section-title">Exercises</h2>
            <IonList inset>
              <IonReorderGroup
                disabled={false}
                onIonItemReorder={(e) => {
                  const ids = e.detail.complete(t.items.map((i) => i.id)) as string[];
                  void mutate((db) => wo.reorderTemplateItems(db, ids));
                }}
              >
                {t.items.map((i) => (
                  <IonItemSliding key={i.id}>
                    <IonItem>
                      {i.kind === 'exercise' && (
                        <IonCheckbox
                          slot="start"
                          aria-label={`Select ${i.exercise.name}`}
                          checked={selected.includes(i.id)}
                          onIonChange={(e) =>
                            setSelected((s) =>
                              e.detail.checked ? [...s, i.id] : s.filter((x) => x !== i.id),
                            )
                          }
                        />
                      )}
                      <IonLabel>
                        <h3 className="truncate">{i.kind === 'wod' ? i.title : i.exercise.name}</h3>
                        {i.supersetGroup && <p>{labels.get(i.supersetGroup)}</p>}
                        {i.kind === 'wod' && <p>Workout of the Day</p>}
                      </IonLabel>
                      <IonReorder slot="end" />
                    </IonItem>
                    <IonItemOptions side="end">
                      <IonItemOption
                        color="danger"
                        onClick={() => void mutate((db) => wo.removeTemplateItem(db, i.id))}
                      >
                        Remove
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                ))}
              </IonReorderGroup>
            </IonList>
          </>
        ) : (
          <>
            <h2 className="gt-section-title">Note</h2>
            <IonList inset>
              <IonItem lines="none">
                <NoteField
                  ariaLabel="Template note"
                  placeholder="Add a note"
                  value={t.note}
                  onSave={(note) => void mutate((db) => wo.updateTemplate(db, t.id, { note }))}
                />
              </IonItem>
            </IonList>
            <h2 className="gt-section-title">Settings</h2>
            <IonList inset>
              <IonItem button detail onClick={() => setGroupSheet(true)}>
                <IonLabel>Group</IonLabel>
                <span slot="end" className="gt-inline">
                  <CategoryDot color={t.group.color} size={12} />
                  <IonNote className="truncate">{t.group.name}</IonNote>
                </span>
              </IonItem>
            </IonList>

            {t.items.length === 0 && (
              <EmptyState
                icon={DumbbellIcon}
                message={EMPTY.templateDetail.message}
                action={EMPTY.templateDetail.action}
                onAction={() => setPicker('exercise')}
              />
            )}

            {t.items.length > 0 && <h2 className="gt-section-title">Exercises</h2>}
            {t.items.map((i) => (
              <IonList
                inset
                key={i.id}
                className={`gt-block ${i.supersetGroup ? 'gt-block--superset' : ''}`}
              >
                <IonItem lines="none" className="gt-block__head">
                  <span
                    slot="start"
                    className="gt-xtile"
                    aria-hidden="true"
                    style={
                      i.kind === 'exercise' && i.exercise.categories[0]
                        ? ({ '--gt-tint': i.exercise.categories[0].color } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <Icon icon={i.kind === 'wod' ? TimerIcon : DumbbellIcon} />
                  </span>
                  <IonLabel>
                    {i.supersetGroup && <p className="gt-badge">{labels.get(i.supersetGroup)}</p>}
                    <h2 className="gt-block__title">
                      {i.kind === 'wod' ? 'Workout of the Day' : i.exercise.name}
                    </h2>
                    {i.kind === 'exercise' && (
                      <p>
                        {i.exercise.equipmentName ?? 'None'} ·{' '}
                        {MSG_EXTRA.setCount(i.sets.filter((x) => x.type === 'working').length)}
                      </p>
                    )}
                  </IonLabel>
                  <IonButton
                    slot="end"
                    fill="clear"
                    className="gt-more"
                    aria-label="Options"
                    onClick={() => void itemMenu(i)}
                  >
                    <Icon slot="icon-only" icon={EllipsisIcon} />
                  </IonButton>
                </IonItem>
                {i.kind === 'wod' ? (
                  <>
                    <IonItem>
                      <IonInput
                        aria-label="Workout of the Day title"
                        value={i.title}
                        maxlength={60}
                        onIonBlur={(e) => {
                          const v = String((e.target as HTMLIonInputElement).value ?? '').trim();
                          if (v && v !== i.title)
                            void mutate((db) => wo.updateTemplateWod(db, i.id, { title: v }));
                        }}
                      />
                    </IonItem>
                    <IonItem lines="none">
                      <NoteField
                        ariaLabel="Workout of the Day description"
                        placeholder="Description"
                        value={i.description}
                        onSave={(description) =>
                          void mutate((db) => wo.updateTemplateWod(db, i.id, { description }))
                        }
                      />
                    </IonItem>
                  </>
                ) : (
                  // Design: prescribed sets as chips; tapping them opens the editable table.
                  <button
                    type="button"
                    className="gt-setchips"
                    aria-label={`Edit ${i.exercise.name} sets`}
                    onClick={() => setSetsFor(i.id)}
                  >
                    {i.sets.length === 0 && <span className="gt-setchip">+ Add Set</span>}
                    {i.sets.map((x) => (
                      <span
                        key={x.id}
                        className={`gt-setchip num${x.type === 'warmup' ? ' gt-setchip--warmup' : ''}`}
                      >
                        {setChipText(x, i.exercise.primary, i.exercise.secondary, units)}
                      </span>
                    ))}
                  </button>
                )}
              </IonList>
            ))}
          </>
        )}
        <div className="gt-fab-space" />
        {!editing && (
          <IonFab
            vertical="bottom"
            horizontal="end"
            slot="fixed"
            className="gt-fab hide-on-keyboard"
          >
            <IonFabButton aria-label="Add" onClick={() => void onFab()}>
              <Icon icon={PlusIcon} />
            </IonFabButton>
          </IonFab>
        )}
      </Content>

      {editing && (
        <IonFooter className="ion-no-border hide-on-keyboard">
          <div className="gt-footer">
            <IonButton
              expand="block"
              fill="solid"
              disabled={selected.length < 2}
              onClick={() => void group()}
            >
              Group{selected.length >= 2 ? ` ${selected.length} as Superset` : ''}
            </IonButton>
          </div>
        </IonFooter>
      )}

      <ExercisePicker
        isOpen={picker !== null}
        title={picker === 'superset' ? 'Add SuperSet' : 'Add Exercise'}
        multi={picker === 'superset'}
        minSelect={picker === 'superset' ? 2 : 1}
        onDismiss={() => setPicker(null)}
        onPick={(ids) =>
          void mutate((db) =>
            picker === 'superset'
              ? wo.addTemplateSuperset(db, t.id, ids)
              : wo.addTemplateExercise(db, t.id, ids[0]!).then(() => undefined),
          )
        }
      />
      <SetsSheet item={setsItem} units={units} onClose={() => setSetsFor(null)} />
      <OptionSheet
        isOpen={groupSheet}
        title="Group"
        options={groups.map((g) => ({ value: g.id, label: g.name, color: g.color }))}
        selected={t.group.id}
        onDismiss={() => setGroupSheet(false)}
        onSelect={(groupId) => void mutate((db) => wo.updateTemplate(db, t.id, { groupId }))}
      />
    </IonPage>
  );
}

/** WT-5: the editable prescribed sets of one exercise (opened from its set chips). */
function SetsSheet({
  item,
  units,
  onClose,
}: {
  item: TemplateExerciseItem | undefined;
  units: { weight: WeightUnit; distance: DistanceUnit };
  onClose: () => void;
}) {
  return (
    <Sheet
      isOpen={!!item}
      title={item?.exercise.name ?? 'Sets'}
      onDismiss={onClose}
      onDone={onClose}
    >
      {item && (
        <IonList inset className="gt-block">
          <SetTable
            mode="template"
            primary={item.exercise.primary}
            secondary={item.exercise.secondary}
            sets={item.sets}
            weightUnit={units.weight}
            distanceUnit={units.distance}
            exerciseName={item.exercise.name}
            onChange={(id, patch) => void mutate((db) => wo.updateTemplateSet(db, id, patch))}
            onDelete={(id) => void mutate((db) => wo.deleteTemplateSet(db, id))}
          />
          <div className="gt-block__actions">
            <IonButton
              fill="clear"
              size="small"
              onClick={() => void mutate((db) => wo.addTemplateSet(db, item.id, 'warmup'))}
            >
              + Add Warmup
            </IonButton>
            <IonButton
              fill="clear"
              size="small"
              onClick={() => void mutate((db) => wo.addTemplateSet(db, item.id, 'working'))}
            >
              + Add Set
            </IonButton>
          </div>
        </IonList>
      )}
    </Sheet>
  );
}
