import {
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonToggle,
} from '@ionic/react';
import { Content } from '@/components/Content';
import {
  CalendarDaysIcon,
  CircleDotIcon,
  CloudIcon,
  DownloadIcon,
  DumbbellIcon,
  FileTextIcon,
  HeartPulseIcon,
  InfoIcon,
  MailIcon,
  RotateCcwIcon,
  RulerIcon,
  ScaleIcon,
  ShieldCheckIcon,
  StarIcon,
  SunIcon,
  TagsIcon,
  TimerIcon,
  Trash2Icon,
  TypeIcon,
  UploadIcon,
  VibrateIcon,
  Volume2Icon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { RowIcon } from '@/components/RowIcon';
import { ScreenTitle } from '@/components/ScreenTitle';
import appConfig from '../../../app.config.json';
import { setAppearance } from '@/app/appearance';
import { track } from '@/app/analytics';
import { OptionSheet } from '@/components/OptionSheet';
import { ImportSheet } from './ImportSheet';
import { PageHeader } from '@/components/PageHeader';
import { getDb } from '@/db/client';
import { mutate } from '@/db/mutate';
import { MIGRATIONS } from '@/db/migrations';
import { loadPreferences } from '@/db/repos/preferences';
import * as data from '@/db/repos/data';
import { csvRows } from '@/db/repos/stats';
import { toCsv } from '@/domain/csv';
import { jsonToTable, parseCsv, type Table } from '@/domain/importData';
import { IMPORT_MSG, MSG } from '@/domain/messages';
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
  const [importTable, setImportTable] = useState<Table | null>(null);
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
    if (text) await restoreFromText(text);
  };
  const restoreFromText = async (text: string) => {
    let b: data.Backup;
    try {
      b = data.parseBackup(text, SCHEMA);
    } catch (e) {
      return error(
        e instanceof SyntaxError
          ? IMPORT_MSG.unreadable
          : e instanceof Error
            ? e.message
            : String(e),
      );
    }
    // PD-19: a damaged or foreign file must never wipe data — check every row first
    const problem = await data.checkBackup(getDb(), b);
    if (problem) return error(IMPORT_MSG.badBackup(problem.table, problem.row, problem.column));
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

  // PD-19: CSV (ours or another app's) or JSON. A full backup offers the restore flow instead.
  const importFile = async () => {
    const text = await pickTextFile('.csv,text/csv,text/plain,application/json,.json');
    if (!text) return;
    let table: Table | null;
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      let json: unknown;
      try {
        json = JSON.parse(trimmed);
      } catch {
        return error(IMPORT_MSG.unreadable);
      }
      if ((json as { app?: unknown })?.app === 'gym-tracker') {
        const c = await choose(
          IMPORT_MSG.title,
          [
            { text: 'Cancel', value: 'cancel', role: 'cancel' },
            { text: 'Restore', value: 'restore' },
          ],
          IMPORT_MSG.isBackup,
        );
        if (c === 'restore') await restoreFromText(trimmed);
        return;
      }
      table = jsonToTable(json);
      if (!table) return error(IMPORT_MSG.unreadable);
    } else table = parseCsv(text);
    if (!table.headers.length || !table.rows.length) return error(IMPORT_MSG.empty);
    setImportTable(table);
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
      <Content>
        <ScreenTitle title="Settings" />
        <div className="gt-profile">
          <div className="gt-glow" aria-hidden="true" />
          <span className="gt-profile__logo">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" draggable={false} />
          </span>
          <div className="gt-profile__text">
            <strong>Gym Tracker</strong>
            <span className="num">Version {version || '—'} · data stays on this device</span>
          </div>
        </div>
        <h2 className="gt-section-title">Appearance</h2>
        <div className="gt-seg-glass">
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
        </div>

        <h2 className="gt-section-title">Session</h2>

        <IonList inset>
          <IonItem button detail onClick={() => setRestSheet(true)}>
            <RowIcon icon={TimerIcon} tint="blue" />
            <IonLabel>Default rest</IonLabel>
            <IonNote slot="end" className="num">
              {prefs.restS === 0 ? 'Off' : formatCountdown(prefs.restS)}
            </IonNote>
          </IonItem>
          <IonItem>
            <RowIcon icon={Volume2Icon} tint="amber" />
            <IonToggle checked={prefs.sound} onIonChange={(e) => change('sound', e.detail.checked)}>
              Rest-timer sound
            </IonToggle>
          </IonItem>
          <IonItem>
            <RowIcon icon={VibrateIcon} tint="purple" />
            <IonToggle
              checked={prefs.haptics}
              onIonChange={(e) => change('haptics', e.detail.checked)}
            >
              Haptics
            </IonToggle>
          </IonItem>
          <IonItem lines="none">
            <RowIcon icon={SunIcon} tint="amber" />
            <IonToggle
              checked={prefs.keepAwake}
              onIonChange={(e) => change('keepAwake', e.detail.checked)}
            >
              Keep screen awake
            </IonToggle>
          </IonItem>
        </IonList>

        <h2 className="gt-section-title">Units</h2>
        <IonList inset>
          <IonItem>
            <RowIcon icon={ScaleIcon} tint="blue" />
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
            <RowIcon icon={RulerIcon} tint="teal" />
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

        <h2 className="gt-section-title">Data</h2>

        <IonList inset>
          <IonItem button detail onClick={() => void exportCsv()}>
            <RowIcon icon={DownloadIcon} tint="teal" />
            <IonLabel>Export to CSV</IonLabel>
          </IonItem>
          <IonItem button detail onClick={() => void backupNow()}>
            <RowIcon icon={CloudIcon} tint="blue" />
            <IonLabel>
              <h3>{platform() === 'ios' ? 'Back up to iCloud' : 'Back up now'}</h3>
              <p>
                {backup?.lastBackupUtc
                  ? `Last backup ${formatDateKeyLong(dateKeyAt(backup.lastBackupUtc, -new Date().getTimezoneOffset()))}`
                  : 'Save a backup file to iCloud Drive or Files'}
              </p>
            </IonLabel>
          </IonItem>
          <IonItem button detail onClick={() => void importFile()}>
            <RowIcon icon={UploadIcon} tint="amber" />
            <IonLabel>
              <h3>{IMPORT_MSG.rowLabel}</h3>
              <p>{IMPORT_MSG.rowHint}</p>
            </IonLabel>
          </IonItem>
          <IonItem button detail onClick={() => void restore()}>
            <RowIcon icon={RotateCcwIcon} tint="purple" />
            <IonLabel>Restore from backup</IonLabel>
          </IonItem>
          <IonItem button detail={false} lines="none" onClick={() => void deleteAll()}>
            <RowIcon icon={Trash2Icon} tint="red" />
            <IonLabel className="gt-danger-text">Delete all data</IonLabel>
          </IonItem>
        </IonList>

        <h2 className="gt-section-title">Calendar</h2>

        <IonList inset>
          <IonItem>
            <RowIcon icon={CalendarDaysIcon} tint="purple" />
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
            <RowIcon icon={CircleDotIcon} tint="pink" />
            <IonToggle
              checked={prefs.showDots}
              onIonChange={(e) => change('showDots', e.detail.checked)}
            >
              Show category dots
            </IonToggle>
          </IonItem>
        </IonList>

        <h2 className="gt-section-title">Library</h2>

        <IonList inset>
          <IonItem button detail routerLink="/settings/categories">
            <RowIcon icon={TagsIcon} tint="pink" />
            <IonLabel>Categories</IonLabel>
          </IonItem>
          <IonItem button detail routerLink="/settings/equipment" lines="none">
            <RowIcon icon={DumbbellIcon} tint="teal" />
            <IonLabel>Equipment</IonLabel>
          </IonItem>
        </IonList>

        <h2 className="gt-section-title">{healthPlatformName()}</h2>

        <IonList inset>
          <IonItem lines="none" disabled={!canHealth}>
            <RowIcon icon={HeartPulseIcon} tint="red" />
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

        <h2 className="gt-section-title">Privacy</h2>

        <IonList inset>
          <IonItem lines="none">
            <RowIcon icon={ShieldCheckIcon} tint="green" />
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

        <h2 className="gt-section-title">About</h2>

        <IonList inset>
          <IonItem>
            <RowIcon icon={InfoIcon} tint="blue" />
            <IonLabel>Version</IonLabel>
            <IonNote slot="end" className="num">
              {version}
            </IonNote>
          </IonItem>
          <IonItem button detail routerLink="/settings/legal/privacy">
            <RowIcon icon={FileTextIcon} tint="gray" />
            <IonLabel>Privacy Policy</IonLabel>
          </IonItem>
          <IonItem button detail routerLink="/settings/legal/terms">
            <RowIcon icon={FileTextIcon} tint="gray" />
            <IonLabel>Terms of Use</IonLabel>
          </IonItem>
          {appConfig.supportEmail && (
            <IonItem
              button
              detail
              href={`mailto:${appConfig.supportEmail}?subject=Gym%20Tracker%20${encodeURIComponent(version)}`}
            >
              <RowIcon icon={MailIcon} tint="blue" />
              <IonLabel>Contact Support</IonLabel>
            </IonItem>
          )}
          <IonItem button detail onClick={() => void rate()}>
            <RowIcon icon={StarIcon} tint="amber" />
            <IonLabel>Rate the App</IonLabel>
          </IonItem>
          <IonItem lines="none">
            <RowIcon icon={TypeIcon} tint="gray" />
            <IonLabel>Text size</IonLabel>
            <IonNote slot="end" className="num">
              {Math.round(textScale * 100)}%
            </IonNote>
          </IonItem>
        </IonList>
        <div className="gt-fab-space" />
      </Content>

      <ImportSheet table={importTable} onClose={() => setImportTable(null)} />
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
