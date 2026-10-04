import {
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonToggle,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import appConfig from '../../../app.config.json';
import { setAppearance } from '@/app/appearance';
import { track } from '@/app/analytics';
import { OptionSheet } from '@/components/OptionSheet';
import { PageHeader } from '@/components/PageHeader';
import { getDb } from '@/db/client';
import { mutate } from '@/db/mutate';
import { MIGRATIONS } from '@/db/migrations';
import { loadPreferences } from '@/db/repos/preferences';
import * as data from '@/db/repos/data';
import { csvRows } from '@/db/repos/stats';
import { toCsv } from '@/domain/csv';
import { MSG } from '@/domain/messages';
import { formatCountdown, REST_OPTIONS_S } from '@/domain/session';
import { dateKeyAt, formatDateKeyLong, todayKey } from '@/domain/time';
import type { Appearance, DistanceUnit, WeekStart, WeightUnit } from '@/domain/types';
import { useDialogs } from '@/hooks/useDialogs';
import { useFeedback } from '@/hooks/useFeedback';
import { useLive } from '@/hooks/useLive';
import { setPref, usePrefs } from '@/hooks/usePrefs';
import { healthAvailable, healthPlatformName, requestHealth } from '@/native/health';
import { appVersion } from '@/native/lifecycle';
import { platform } from '@/native/platform';
import { requestReview } from '@/native/review';
import { pickTextFile, shareFile } from '@/native/share';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';

const SCHEMA = MIGRATIONS[MIGRATIONS.length - 1]!.version;

function Segment<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <IonSegment aria-label={label} value={value} onIonChange={(e) => onChange(e.detail.value as T)}>
      {options.map(([v, l]) => (
        <IonSegmentButton key={v} value={v}>
          <IonLabel>{l}</IonLabel>
        </IonSegmentButton>
      ))}
    </IonSegment>
  );
}

/** Reloads everything after data was replaced (restore / delete all). */
async function afterDataReplaced() {
  const prefs = await loadPreferences(getDb());
  useAppStore.getState().setPrefs(prefs);
  setAppearance(prefs.appearance);
  await useSessionStore.getState().refresh();
}

/** ST-1..8. */
export default function SettingsPage() {
  const prefs = usePrefs();
  const textScale = useAppStore((s) => s.textScale);
  const [version, setVersion] = useState('');
  const [restSheet, setRestSheet] = useState(false);
  const [canHealth, setCanHealth] = useState(false);
  const { data: backup } = useLive(data.backupState, []);
  const { alert, choose } = useDialogs();
  const { error, info } = useFeedback();

  useEffect(() => {
    void appVersion().then((v) => setVersion(`${v.version} (${v.build})`));
    void healthAvailable().then(setCanHealth);
  }, []);

  const change = <K extends Parameters<typeof setPref>[0]>(
    key: K,
    value: Parameters<typeof setPref<K>>[1],
  ) => {
    void setPref(key, value);
    track('setting_changed', { setting: key });
  };

  const exportCsv = async () => {
    const csv = toCsv(await csvRows(getDb()));
    await shareFile(`gym-tracker-${todayKey()}.csv`, csv, 'text/csv');
    track('data_exported', { type: 'csv' });
  };

  // ST-6 backup: a full JSON file shared to Files / iCloud Drive (iOS) or Drive (Android).
  const backupNow = async () => {
    const b = await data.exportBackup(getDb());
    await shareFile(`gym-tracker-backup-${todayKey()}.json`, JSON.stringify(b), 'application/json');
    await mutate((db) => data.markBackedUp(db));
    track('data_exported', { type: 'backup' });
  };

  // VR-17: confirmation states the backup date, then replaces all data.
  const restore = async () => {
    const text = await pickTextFile('application/json,.json');
    if (!text) return;
    let b: data.Backup;
    try {
      b = data.parseBackup(text, SCHEMA);
    } catch (e) {
      return error(e instanceof Error ? e.message : String(e));
    }
    const created = new Date(b.createdAt);
    const when = formatDateKeyLong(dateKeyAt(b.createdAt, -created.getTimezoneOffset()));
    const c = await choose(
      'Restore from Backup',
      [
        { text: 'Cancel', value: 'cancel', role: 'cancel' },
        { text: 'Restore', value: 'restore', role: 'destructive' },
      ],
      `Replace all current data with the backup from ${when}?`,
    );
    if (c !== 'restore') return;
    await mutate((db) => data.restoreBackup(db, b));
    await afterDataReplaced();
    info('Backup restored.');
  };

  // ST-6: delete all data after typing DELETE.
  const deleteAll = () =>
    alert({
      header: 'Delete All Data',
      message: MSG.deleteAllData,
      inputs: [
        { name: 'confirm', placeholder: 'DELETE', attributes: { autocapitalize: 'characters' } },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: (v: { confirm: string }) => {
            if (v.confirm.trim() !== 'DELETE') {
              error(MSG.deleteAllData);
              return false;
            }
            void mutate((db) => data.deleteAllData(db)).then(afterDataReplaced);
            return true;
          },
        },
      ],
    });

  const toggleHealth = async (on: boolean) => {
    if (on && !(await requestHealth())) {
      error(
        platform() === 'android'
          ? 'Health Connect access is off. Turn it on in Health Connect settings.'
          : MSG.healthDenied,
      );
      return change('healthEnabled', false);
    }
    change('healthEnabled', on);
  };

  const rate = async () => {
    if (!(await requestReview())) info('Rating is available in the store version of the app.');
  };

  return (
    <IonPage>
      <PageHeader title="Settings" />
      <IonContent>
        <IonList inset>
          <IonListHeader>Units</IonListHeader>
          <IonItem>
            <IonLabel>Weight</IonLabel>
            <div slot="end" className="gt-seg">
              <Segment<WeightUnit>
                label="Weight unit"
                value={prefs.weightUnit}
                options={[
                  ['kg', 'kg'],
                  ['lb', 'lb'],
                ]}
                onChange={(v) => change('weightUnit', v)}
              />
            </div>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>Distance</IonLabel>
            <div slot="end" className="gt-seg">
              <Segment<DistanceUnit>
                label="Distance unit"
                value={prefs.distanceUnit}
                options={[
                  ['km', 'km'],
                  ['mi', 'mi'],
                ]}
                onChange={(v) => change('distanceUnit', v)}
              />
            </div>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>Calendar</IonListHeader>
          <IonItem>
            <IonLabel>First day of week</IonLabel>
            <div slot="end" className="gt-seg">
              <Segment<WeekStart>
                label="First day of week"
                value={prefs.weekStart}
                options={[
                  ['sun', 'Sun'],
                  ['mon', 'Mon'],
                ]}
                onChange={(v) => change('weekStart', v)}
              />
            </div>
          </IonItem>
          <IonItem lines="none">
            <IonToggle
              checked={prefs.showDots}
              onIonChange={(e) => change('showDots', e.detail.checked)}
            >
              Show category dots
            </IonToggle>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>Session</IonListHeader>
          <IonItem button detail onClick={() => setRestSheet(true)}>
            <IonLabel>Default rest time</IonLabel>
            <IonNote slot="end" className="num">
              {prefs.restS === 0 ? 'Off' : formatCountdown(prefs.restS)}
            </IonNote>
          </IonItem>
          <IonItem>
            <IonToggle checked={prefs.sound} onIonChange={(e) => change('sound', e.detail.checked)}>
              Rest timer sound
            </IonToggle>
          </IonItem>
          <IonItem>
            <IonToggle
              checked={prefs.haptics}
              onIonChange={(e) => change('haptics', e.detail.checked)}
            >
              Haptics
            </IonToggle>
          </IonItem>
          <IonItem lines="none">
            <IonToggle
              checked={prefs.keepAwake}
              onIonChange={(e) => change('keepAwake', e.detail.checked)}
            >
              Keep screen awake during a session
            </IonToggle>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>Library</IonListHeader>
          <IonItem button detail routerLink="/settings/categories">
            <IonLabel>Categories</IonLabel>
          </IonItem>
          <IonItem button detail routerLink="/settings/equipment" lines="none">
            <IonLabel>Equipment</IonLabel>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>{healthPlatformName()}</IonListHeader>
          <IonItem lines="none" disabled={!canHealth}>
            <IonToggle
              checked={prefs.healthEnabled && canHealth}
              onIonChange={(e) => void toggleHealth(e.detail.checked)}
            >
              <IonLabel>
                <h3>Sync with {healthPlatformName()}</h3>
                <p>
                  {canHealth
                    ? 'Write completed workouts; read and write body weight.'
                    : 'Available in the iPhone and Android app.'}
                </p>
              </IonLabel>
            </IonToggle>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>Data</IonListHeader>
          <IonItem button detail={false} onClick={() => void exportCsv()}>
            <IonLabel color="primary">Export All Data (CSV)</IonLabel>
          </IonItem>
          <IonItem button detail={false} onClick={() => void backupNow()}>
            <IonLabel>
              <h3 className="gt-primary">Back Up Now</h3>
              <p>
                {backup?.lastBackupUtc
                  ? `Last backup ${formatDateKeyLong(dateKeyAt(backup.lastBackupUtc, -new Date().getTimezoneOffset()))}`
                  : 'Save a backup file to iCloud Drive or Files'}
              </p>
            </IonLabel>
          </IonItem>
          <IonItem button detail={false} onClick={() => void restore()}>
            <IonLabel color="primary">Restore from Backup</IonLabel>
          </IonItem>
          <IonItem button detail={false} lines="none" onClick={() => void deleteAll()}>
            <IonLabel color="danger">Delete All Data</IonLabel>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>Appearance</IonListHeader>
          <IonItem lines="none">
            <Segment<Appearance>
              label="Appearance"
              value={prefs.appearance}
              options={[
                ['system', 'System'],
                ['light', 'Light'],
                ['dark', 'Dark'],
              ]}
              onChange={(v) => {
                setAppearance(v);
                change('appearance', v);
              }}
            />
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>Privacy</IonListHeader>
          <IonItem lines="none">
            <IonToggle
              checked={prefs.analyticsOptIn === true}
              onIonChange={(e) => void setPref('analyticsOptIn', e.detail.checked)}
            >
              <IonLabel>
                <h3>Share anonymous usage data</h3>
                <p>Never includes body weight, measurements, notes or names.</p>
              </IonLabel>
            </IonToggle>
          </IonItem>
        </IonList>

        <IonList inset>
          <IonListHeader>About</IonListHeader>
          <IonItem>
            <IonLabel>Version</IonLabel>
            <IonNote slot="end" className="num">
              {version}
            </IonNote>
          </IonItem>
          <IonItem button detail routerLink="/settings/legal/privacy">
            <IonLabel>Privacy Policy</IonLabel>
          </IonItem>
          <IonItem button detail routerLink="/settings/legal/terms">
            <IonLabel>Terms of Use</IonLabel>
          </IonItem>
          {appConfig.supportEmail && (
            <IonItem
              button
              detail
              href={`mailto:${appConfig.supportEmail}?subject=Gym%20Tracker%20${encodeURIComponent(version)}`}
            >
              <IonLabel>Contact Support</IonLabel>
            </IonItem>
          )}
          <IonItem button detail onClick={() => void rate()}>
            <IonLabel>Rate the App</IonLabel>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>Text size</IonLabel>
            <IonNote slot="end" className="num">
              {Math.round(textScale * 100)}%
            </IonNote>
          </IonItem>
        </IonList>
        <div className="gt-fab-space" />
      </IonContent>

      <OptionSheet
        isOpen={restSheet}
        title="Default rest time"
        options={REST_OPTIONS_S.map((s) => ({
          value: String(s),
          label: s === 0 ? 'Off' : formatCountdown(s),
        }))}
        selected={String(prefs.restS)}
        onDismiss={() => setRestSheet(false)}
        onSelect={(v) => change('restS', Number(v))}
      />
    </IonPage>
  );
}
