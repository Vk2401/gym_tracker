import {
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  useIonRouter,
} from '@ionic/react';
import { add, listOutline } from 'ionicons/icons';
import { memo, useMemo, useState } from 'react';
import { CategoryDot } from '@/components/CategoryDot';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { mutate } from '@/db/mutate';
import type { Exercise } from '@/db/models';
import { createExercise, listExercises } from '@/db/repos/library';
import { EMPTY } from '@/domain/messages';
import { focusLabel } from '@/domain/share';
import { validateName } from '@/domain/validation';
import { useDialogs } from '@/hooks/useDialogs';
import { useFeedback } from '@/hooks/useFeedback';
import { useLive } from '@/hooks/useLive';
import './ExercisesPage.css';

/** EX-3: name, Focus, Equipment and Categories. */
const ExerciseRow = memo(function ExerciseRow({ e }: { e: Exercise }) {
  const focus = [e.primary, e.secondary]
    .filter(Boolean)
    .map((m) => focusLabel(m!))
    .join(', ');
  return (
    <IonItem button routerLink={`/exercises/${e.id}`} detail>
      <IonLabel>
        <h2 className="truncate">{e.name}</h2>
        <p className="truncate">Focus: {focus}</p>
        <p className="truncate">Equipment: {e.equipmentName ?? 'None'}</p>
        {e.categories.length > 0 && (
          <p className="gt-cats truncate">
            {e.categories.map((c) => (
              <span key={c.id} className="gt-cat">
                <CategoryDot color={c.color} />
                {c.name}
              </span>
            ))}
          </p>
        )}
      </IonLabel>
    </IonItem>
  );
});

/** EX-1..5: exercise library. */
export default function ExercisesPage() {
  const { data: rows = [], loading } = useLive(listExercises, []);
  const [query, setQuery] = useState('');
  const router = useIonRouter();
  const { promptName } = useDialogs();
  const { error } = useFeedback();

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('en');
    return q ? rows.filter((r) => r.name.toLocaleLowerCase('en').includes(q)) : rows; // EX-4
  }, [rows, query]);

  const create = async (initial?: string) => {
    const existing = rows.map((r) => r.name);
    let name: string | null = initial?.trim() ?? null;
    if (name) {
      const check = validateName(name, { existing, kind: 'exercise' });
      if (!check.ok) return error(check.message);
    } else {
      name = await promptName({ header: 'New Exercise', existing, kind: 'exercise' });
    }
    if (!name) return;
    const id = await mutate((db) => createExercise(db, name!));
    setQuery('');
    router.push(`/exercises/${id}`, 'forward');
  };

  const q = query.trim();
  return (
    <IonPage>
      <PageHeader title="Exercises">
        <IonSearchbar
          className="gt-search"
          placeholder="Search Exercises"
          value={query}
          debounce={100}
          onIonInput={(e) => setQuery(e.detail.value ?? '')}
        />
      </PageHeader>
      <IonContent>
        {!loading && visible.length === 0 && q && (
          <EmptyState
            fill
            icon={listOutline}
            message={EMPTY.exercisesSearch(q).message}
            action={EMPTY.exercisesSearch(q).action}
            onAction={() => void create(q)}
          />
        )}
        {visible.length > 0 && (
          <IonList inset>
            {visible.map((e) => (
              <ExerciseRow key={e.id} e={e} />
            ))}
          </IonList>
        )}
        <div className="gt-fab-space" />
        <IonFab vertical="bottom" horizontal="end" slot="fixed" className="gt-fab hide-on-keyboard">
          <IonFabButton aria-label="New exercise" onClick={() => void create()}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
}
