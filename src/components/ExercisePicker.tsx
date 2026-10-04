import {
  IonButton,
  IonCheckbox,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSearchbar,
} from '@ionic/react';
import { useMemo, useState } from 'react';
import { mutate } from '@/db/mutate';
import { createExercise, listExercises } from '@/db/repos/library';
import { EMPTY } from '@/domain/messages';
import { validateName } from '@/domain/validation';
import { useFeedback } from '@/hooks/useFeedback';
import { useLive } from '@/hooks/useLive';
import { focusSummary } from './exerciseText';
import { Sheet } from './Sheet';

/**
 * Picks one exercise (Add / Replace Exercise) or several (Add SuperSet, PD-7 needs two or
 * more). Searching for a missing name offers Create "{query}" (BRD §14).
 */
export function ExercisePicker({
  isOpen,
  title,
  multi = false,
  minSelect = 1,
  onDismiss,
  onPick,
}: {
  isOpen: boolean;
  title: string;
  multi?: boolean;
  minSelect?: number;
  onDismiss: () => void;
  onPick: (ids: string[]) => void;
}) {
  const { data: all = [] } = useLive(listExercises, []);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const { error } = useFeedback();
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('en');
    return q ? all.filter((e) => e.name.toLocaleLowerCase('en').includes(q)) : all;
  }, [all, query]);

  const close = () => {
    setPicked([]);
    setQuery('');
    onDismiss();
  };
  const finish = (ids: string[]) => {
    onPick(ids);
    close();
  };
  const create = async () => {
    const check = validateName(query, { existing: all.map((e) => e.name), kind: 'exercise' });
    if (!check.ok) return error(check.message);
    const id = await mutate((db) => createExercise(db, query));
    if (multi) setPicked((p) => [...p, id]);
    else finish([id]);
    setQuery('');
  };

  return (
    <Sheet
      isOpen={isOpen}
      title={title}
      onDismiss={close}
      full
      onDone={multi ? () => finish(picked) : undefined}
      doneLabel={multi ? `Add (${picked.length})` : undefined}
      doneDisabled={picked.length < minSelect}
    >
      <IonSearchbar
        placeholder="Search Exercises"
        value={query}
        debounce={100}
        onIonInput={(e) => setQuery(e.detail.value ?? '')}
      />
      {visible.length === 0 && query.trim() && (
        <div className="gt-empty">
          <p className="gt-empty__message">{EMPTY.exercisesSearch(query.trim()).message}</p>
          <IonButton shape="round" onClick={() => void create()}>
            {EMPTY.exercisesSearch(query.trim()).action}
          </IonButton>
        </div>
      )}
      <IonList inset>
        {visible.map((e) => (
          <IonItem
            key={e.id}
            button={!multi}
            detail={false}
            onClick={multi ? undefined : () => finish([e.id])}
          >
            {multi && (
              <IonCheckbox
                slot="start"
                aria-label={e.name}
                checked={picked.includes(e.id)}
                onIonChange={(ev) =>
                  setPicked((p) => (ev.detail.checked ? [...p, e.id] : p.filter((x) => x !== e.id)))
                }
              />
            )}
            <IonLabel>
              <h3 className="truncate">{e.name}</h3>
              <IonNote className="truncate">{focusSummary(e)}</IonNote>
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
    </Sheet>
  );
}
