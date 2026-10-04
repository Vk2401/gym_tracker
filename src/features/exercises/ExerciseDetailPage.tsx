import {
  IonButton,
  IonContent,
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
  useIonRouter,
} from '@ionic/react';
import { add, listOutline, shareOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CategoryDot } from '@/components/CategoryDot';
import { EmptyState } from '@/components/EmptyState';
import { NoteField } from '@/components/NoteField';
import { OptionSheet } from '@/components/OptionSheet';
import { PageHeader } from '@/components/PageHeader';
import { getDb } from '@/db/client';
import { mutate } from '@/db/mutate';
import * as lib from '@/db/repos/library';
import { exerciseShareText, focusLabel } from '@/domain/share';
import type { FocusMetric } from '@/domain/types';
import { useDialogs } from '@/hooks/useDialogs';
import { useLive } from '@/hooks/useLive';
import { shareText } from '@/native/share';

const METRICS: FocusMetric[] = ['reps', 'weight', 'time', 'distance'];

type SheetKind = null | 'category' | 'primary' | 'secondary' | 'equipment';

/** ED-1..6: exercise detail, saved automatically. */
export default function ExerciseDetailPage() {
  const { exerciseId = '' } = useParams();
  const router = useIonRouter();
  const { data: e, loading } = useLive((db) => lib.getExercise(db, exerciseId), [exerciseId]);
  const { data: cats = [] } = useLive(lib.listCategories, []);
  const { data: equipment = [] } = useLive(lib.listEquipment, []);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const { promptName, confirmDelete } = useDialogs();

  if (!e || e.deleted) {
    return (
      <IonPage>
        <PageHeader title="" back={{ href: '/exercises', text: 'Exercises' }} />
        <IonContent>
          {!loading && <EmptyState icon={listOutline} message="This exercise was deleted." />}
        </IonContent>
      </IonPage>
    );
  }

  const update = (patch: lib.ExercisePatch) =>
    void mutate((db) => lib.updateExercise(db, e.id, patch));
  const rename = async () => {
    const existing = await lib.exerciseNames(getDb(), e.id);
    const name = await promptName({
      header: 'Rename Exercise',
      value: e.name,
      existing,
      kind: 'exercise',
    });
    if (name) update({ name });
  };
  const remove = async () => {
    if (!(await confirmDelete(e.name))) return;
    await mutate((db) => lib.deleteExercise(db, e.id));
    if (router.canGoBack()) router.goBack();
    else router.push('/exercises', 'root');
  };
  const share = () =>
    shareText(
      e.name,
      exerciseShareText({
        name: e.name,
        primary: e.primary,
        secondary: e.secondary,
        equipment: e.equipmentName,
        categories: e.categories.map((c) => c.name),
        note: e.note,
      }),
    );

  const unassigned = cats.filter((c) => !e.categories.some((x) => x.id === c.id));

  return (
    <IonPage>
      <PageHeader
        title={e.name}
        back={{ href: '/exercises', text: 'Exercises' }}
        end={
          <IonButton aria-label="Share" onClick={() => void share()}>
            <IonIcon slot="icon-only" icon={shareOutline} />
          </IonButton>
        }
      />
      <IonContent>
        <h1 className="gt-large-title">{e.name}</h1>

        <IonList inset>
          <IonListHeader>Categories</IonListHeader>
          {e.categories.map((c) => (
            <IonItemSliding key={c.id}>
              <IonItem>
                <span slot="start">
                  <CategoryDot color={c.color} size={12} />
                </span>
                <IonLabel className="truncate">{c.name}</IonLabel>
              </IonItem>
              <IonItemOptions side="end">
                <IonItemOption
                  color="danger"
                  onClick={() => void mutate((db) => lib.removeExerciseCategory(db, e.id, c.id))}
                >
                  Remove
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          ))}
          <IonItem
            button
            detail={false}
            lines="none"
            onClick={() => setSheet('category')}
            disabled={unassigned.length === 0}
          >
            <IonIcon slot="start" icon={add} color="primary" aria-hidden="true" />
            <IonLabel color="primary">Add Category</IonLabel>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>Focus</IonListHeader>
          <IonItem button detail onClick={() => setSheet('primary')}>
            <IonLabel>Primary Focus</IonLabel>
            <IonNote slot="end">{focusLabel(e.primary)}</IonNote>
          </IonItem>
          <IonItem button detail lines="none" onClick={() => setSheet('secondary')}>
            <IonLabel>Secondary Focus</IonLabel>
            <IonNote slot="end">{e.secondary ? focusLabel(e.secondary) : 'None'}</IonNote>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>Settings</IonListHeader>
          <IonItem button detail onClick={() => void rename()}>
            <IonLabel>Name</IonLabel>
            <IonNote slot="end" className="truncate">
              {e.name}
            </IonNote>
          </IonItem>
          <IonItem button detail lines="none" onClick={() => setSheet('equipment')}>
            <IonLabel>Equipment</IonLabel>
            <IonNote slot="end">{e.equipmentName ?? 'None'}</IonNote>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>Note</IonListHeader>
          <IonItem lines="none">
            <NoteField
              ariaLabel="Exercise instructions"
              placeholder="Add instructions"
              value={e.note}
              onSave={(note) => update({ note })}
            />
          </IonItem>
        </IonList>

        <IonList inset>
          <IonItem button detail={false} lines="none" onClick={() => void remove()}>
            <IonLabel color="danger">Delete Exercise</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>

      <OptionSheet
        isOpen={sheet === 'category'}
        title="Add Category"
        options={unassigned.map((c) => ({ value: c.id, label: c.name, color: c.color }))}
        onDismiss={() => setSheet(null)}
        onSelect={(id) => void mutate((db) => lib.addExerciseCategory(db, e.id, id))}
      />
      <OptionSheet
        isOpen={sheet === 'primary'}
        title="Primary Focus"
        options={METRICS.map((m) => ({ value: m, label: focusLabel(m) }))}
        selected={e.primary}
        onDismiss={() => setSheet(null)}
        onSelect={(m) => update({ primary: m, ...(e.secondary === m ? { secondary: null } : {}) })}
      />
      <OptionSheet
        isOpen={sheet === 'secondary'}
        title="Secondary Focus"
        options={[
          { value: 'none', label: 'None' },
          ...METRICS.filter((m) => m !== e.primary).map((m) => ({
            value: m,
            label: focusLabel(m),
          })),
        ]}
        selected={e.secondary ?? 'none'}
        onDismiss={() => setSheet(null)}
        onSelect={(m) => update({ secondary: m === 'none' ? null : (m as FocusMetric) })}
      />
      <OptionSheet
        isOpen={sheet === 'equipment'}
        title="Equipment"
        options={equipment.map((q) => ({ value: q.id, label: q.name }))}
        selected={e.equipmentId}
        onDismiss={() => setSheet(null)}
        onSelect={(id) => update({ equipmentId: id })}
      />
    </IonPage>
  );
}
