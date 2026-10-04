import {
  IonFab,
  IonFabButton,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  useIonRouter,
} from '@ionic/react';
import { Content } from '@/components/Content';
import { BookOpenIcon, PlusIcon } from 'lucide-react';
import { Icon } from '@/components/Icon';
import { memo, useMemo, useState } from 'react';
import { ScreenTitle } from '@/components/ScreenTitle';
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
  const tint = e.categories[0]?.color ?? 'var(--gt-blue)';
  return (
    <IonItem button detail={false} routerLink={`/exercises/${e.id}`} className="gt-xrow">
      <span
        slot="start"
        className="gt-initial"
        style={{ '--gt-tint': tint } as React.CSSProperties}
        aria-hidden="true"
      >
        {e.name.charAt(0).toUpperCase()}
      </span>
      <IonLabel>
        <h2 className="truncate">{e.name}</h2>
        <p className="truncate">
          {focus} · {e.equipmentName ?? 'None'}
        </p>
      </IonLabel>
      {e.categories.length > 0 && (
        <span slot="end" className="gt-catchips">
          {e.categories.map((c) => (
            <span
              key={c.id}
              className="gt-catchip"
              style={{ '--gt-tint': c.color } as React.CSSProperties}
            >
              {c.name}
            </span>
          ))}
        </span>
      )}
    </IonItem>
  );
});

/** EX-2: sections by first character; names starting with a number sort under "#". */
function sectionKey(name: string): string {
  const c = name.charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

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

  const sections = useMemo(() => {
    const m = new Map<string, Exercise[]>();
    for (const e of visible) {
      const k = sectionKey(e.name);
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return [...m.entries()];
  }, [visible]);

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
      <PageHeader title="Exercises" />
      <Content>
        <ScreenTitle title="Exercises" />
        {/* EX-4: the search stays pinned under the header while the list scrolls */}
        <div className="gt-sticky gt-sticky-search">
          <IonSearchbar
            className="gt-search"
            placeholder="Search Exercises"
            value={query}
            debounce={100}
            onIonInput={(e) => setQuery(e.detail.value ?? '')}
          />
        </div>
        {!loading && visible.length === 0 && q && (
          <EmptyState
            fill
            icon={BookOpenIcon}
            message={EMPTY.exercisesSearch(q).message}
            action={EMPTY.exercisesSearch(q).action}
            onAction={() => void create(q)}
          />
        )}
        {sections.map(([key, list]) => (
          <section key={key} className="gt-xsection">
            <h2 className="gt-xsection__letter">{key}</h2>
            <IonList inset lines="full">
              {list.map((e) => (
                <ExerciseRow key={e.id} e={e} />
              ))}
            </IonList>
          </section>
        ))}
        <div className="gt-fab-space" />
        <IonFab vertical="bottom" horizontal="end" slot="fixed" className="gt-fab hide-on-keyboard">
          <IonFabButton aria-label="New exercise" onClick={() => void create()}>
            <Icon icon={PlusIcon} />
          </IonFabButton>
        </IonFab>
      </Content>
    </IonPage>
  );
}
