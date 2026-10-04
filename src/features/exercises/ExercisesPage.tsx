import { IonContent, IonItem, IonLabel, IonList, IonPage, IonSearchbar } from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { getDb } from '@/db/client';
import { compareNames } from '@/domain/sort';
import { useAppStore } from '@/store/appStore';

interface Row {
  id: string;
  name: string;
}

// EX-1 shell: shows the seeded library so storage can be verified on device (Gate 1).
// Full rows (focus, equipment, categories), virtualisation and create arrive in Phase 2.
export default function ExercisesPage() {
  const ready = useAppStore((s) => s.status === 'ready');
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!ready) return;
    void getDb()
      .query<Row>('SELECT id, name FROM exercise WHERE deleted_at IS NULL')
      .then((r) => setRows([...r].sort((a, b) => compareNames(a.name, b.name))));
  }, [ready]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('en');
    return q ? rows.filter((r) => r.name.toLocaleLowerCase('en').includes(q)) : rows;
  }, [rows, query]);

  return (
    <IonPage>
      <PageHeader title="Exercises">
        <IonSearchbar
          className="gt-search"
          placeholder="Search Exercises"
          value={query}
          onIonInput={(e) => setQuery(e.detail.value ?? '')}
        />
      </PageHeader>
      <IonContent>
        <IonList inset>
          {visible.map((r) => (
            <IonItem key={r.id} detail>
              <IonLabel className="truncate">{r.name}</IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
}
