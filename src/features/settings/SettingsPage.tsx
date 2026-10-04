import {
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import { setAppearance } from '@/app/appearance';
import { PageHeader } from '@/components/PageHeader';
import { getDb } from '@/db/client';
import { loadPreferences, savePreference } from '@/db/repos/preferences';
import type { Appearance } from '@/domain/types';
import { appVersion } from '@/native/lifecycle';
import { useAppStore } from '@/store/appStore';

const OPTIONS: { value: Appearance; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// Phase 1: Appearance (ST-7) and About (ST-8 version). Remaining settings arrive in Phase 4.
export default function SettingsPage() {
  const prefs = useAppStore((s) => s.prefs);
  const textScale = useAppStore((s) => s.textScale);
  const [version, setVersion] = useState('');

  useEffect(() => {
    void appVersion().then((v) => setVersion(`${v.version} (${v.build})`));
  }, []);

  const onAppearance = async (value: Appearance) => {
    setAppearance(value);
    const db = getDb();
    await savePreference(db, 'appearance', value);
    useAppStore.getState().setPrefs(await loadPreferences(db));
  };

  return (
    <IonPage>
      <PageHeader title="Settings" />
      <IonContent>
        <IonList inset>
          <IonListHeader>Appearance</IonListHeader>
          <IonItem lines="none">
            <IonSegment
              value={prefs?.appearance ?? 'system'}
              disabled={!prefs}
              onIonChange={(e) => void onAppearance(e.detail.value as Appearance)}
            >
              {OPTIONS.map((o) => (
                <IonSegmentButton key={o.value} value={o.value}>
                  <IonLabel>{o.label}</IonLabel>
                </IonSegmentButton>
              ))}
            </IonSegment>
          </IonItem>
        </IonList>
        <IonList inset>
          <IonListHeader>About</IonListHeader>
          <IonItem>
            <IonLabel>Version</IonLabel>
            <IonLabel slot="end" className="num" color="medium">
              {version}
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonLabel>Text size</IonLabel>
            <IonLabel slot="end" className="num" color="medium">
              {Math.round(textScale * 100)}%
            </IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
}
