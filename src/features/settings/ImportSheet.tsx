import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { useMemo, useState } from 'react';
import { Sheet } from '@/components/Sheet';
import { mutate } from '@/db/mutate';
import { importLogs } from '@/db/repos/importer';
import {
  autoMatch,
  buildImport,
  guessDateOrder,
  IMPORT_FIELDS,
  mappingProblems,
  type ImportField,
  type ImportSettings,
  type Table,
} from '@/domain/importData';
import { IMPORT_FIELD_TEXT, IMPORT_MSG, MSG_EXTRA } from '@/domain/messages';
import { formatDateKeyLong, todayKey } from '@/domain/time';
import { useFeedback } from '@/hooks/useFeedback';

const MAX_ERRORS_SHOWN = 20;
const MAX_LOGS_SHOWN = 5;

/** Device UTC offset (minutes) on a local date, for storing imported times (VR-15). */
const offsetOn = (dateKey: string) => -new Date(`${dateKey}T12:00:00`).getTimezoneOffset();

/**
 * PD-19: import flow for a parsed file. Our own export goes straight to Review; any other
 * file first shows Match Columns, where each app field is paired with a file column and the
 * expected format is shown. Review lists what will be imported and every rejected cell.
 */
export function ImportSheet({ table, onClose }: { table: Table | null; onClose: () => void }) {
  return (
    // a new file remounts the flow with fresh state
    table && (
      <ImportFlow
        key={`${table.headers.join('|')}#${table.rows.length}`}
        table={table}
        onClose={onClose}
      />
    )
  );
}

function ImportFlow({ table, onClose }: { table: Table; onClose: () => void }) {
  const { info, error } = useFeedback();
  const initial = useMemo(() => {
    const m = autoMatch(table.headers);
    const dateCol = m.settings.mapping.date;
    if (dateCol !== undefined)
      m.settings.dateOrder = guessDateOrder(table.rows.map((r) => r[dateCol] ?? ''));
    return m;
  }, [table]);
  const [settings, setSettings] = useState<ImportSettings>(initial.settings);
  const [step, setStep] = useState<'match' | 'review'>(initial.exact ? 'review' : 'match');
  const [busy, setBusy] = useState(false);

  const problems = mappingProblems(settings.mapping);
  const preview = useMemo(
    () => (step === 'review' ? buildImport(table, settings, todayKey()) : null),
    [step, table, settings],
  );

  const sample = (col: number) => table.rows.map((r) => r[col]?.trim()).find(Boolean) ?? '';
  const setColumn = (field: ImportField, col: number) =>
    setSettings((s) => {
      const mapping = { ...s.mapping };
      if (col < 0) delete mapping[field];
      else mapping[field] = col;
      return { ...s, mapping };
    });
  const dateCol = settings.mapping.date;
  const ambiguousDates =
    dateCol !== undefined &&
    table.rows.some((r) => /^\d{1,2}[-/.]\d{1,2}[-/.]/.test(r[dateCol] ?? ''));
  const hasWeight =
    settings.mapping.weight_kg !== undefined || settings.mapping.body_weight_kg !== undefined;

  const runImport = async () => {
    if (!preview?.logs.length) return;
    setBusy(true);
    try {
      const r = await mutate((db) => importLogs(db, preview.logs, offsetOn));
      info(
        IMPORT_MSG.done(r.imported, r.skipped) +
          (r.newExercises.length ? IMPORT_MSG.newExercises(r.newExercises.length) : ''),
      );
      onClose();
    } catch (e) {
      error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'match') {
    return (
      <Sheet
        isOpen
        full
        title={IMPORT_MSG.matchTitle}
        onDismiss={onClose}
        doneLabel="Next"
        doneDisabled={problems.length > 0}
        onDone={() => setStep('review')}
      >
        <p className="gt-import__intro">{IMPORT_MSG.matchIntro}</p>
        <IonList inset className="gt-import__fields">
          {IMPORT_FIELDS.map((f) => {
            const col = settings.mapping[f.key];
            const text = IMPORT_FIELD_TEXT[f.key]!;
            return (
              <IonItem key={f.key}>
                <IonLabel className="ion-text-wrap">
                  <h3>
                    {text.label}
                    {f.required && <span className="gt-import__req">{IMPORT_MSG.required}</span>}
                  </h3>
                  <p>{IMPORT_MSG.format(text.format)}</p>
                  {col !== undefined && sample(col) && (
                    <p className="gt-import__sample">{IMPORT_MSG.sample(sample(col))}</p>
                  )}
                </IonLabel>
                <IonSelect
                  slot="end"
                  interface="action-sheet"
                  aria-label={text.label}
                  value={col ?? -1}
                  onIonChange={(e) => setColumn(f.key, Number(e.detail.value))}
                >
                  <IonSelectOption value={-1}>{IMPORT_MSG.notInFile}</IonSelectOption>
                  {table.headers.map((h, i) => (
                    <IonSelectOption key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            );
          })}
        </IonList>

        {(hasWeight || settings.mapping.distance_km !== undefined || ambiguousDates) && (
          <IonList inset className="gt-import__units">
            {hasWeight && (
              <Choice
                label={IMPORT_MSG.weightUnit}
                value={settings.weightUnit}
                options={[
                  ['kg', 'kg'],
                  ['lb', 'lb'],
                ]}
                onChange={(weightUnit) => setSettings((s) => ({ ...s, weightUnit }))}
              />
            )}
            {settings.mapping.distance_km !== undefined && (
              <Choice
                label={IMPORT_MSG.distanceUnit}
                value={settings.distanceUnit}
                options={[
                  ['km', 'km'],
                  ['mi', 'mi'],
                ]}
                onChange={(distanceUnit) => setSettings((s) => ({ ...s, distanceUnit }))}
              />
            )}
            {ambiguousDates && (
              <Choice
                label={IMPORT_MSG.dateOrder}
                value={settings.dateOrder}
                options={[
                  ['dmy', IMPORT_MSG.dayMonth],
                  ['mdy', IMPORT_MSG.monthDay],
                ]}
                onChange={(dateOrder) => setSettings((s) => ({ ...s, dateOrder }))}
              />
            )}
          </IonList>
        )}

        {problems.length > 0 && (
          <ul className="gt-import__problems" role="alert">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </Sheet>
    );
  }

  const n = preview?.logs.length ?? 0;
  return (
    <Sheet
      isOpen
      full
      title={IMPORT_MSG.reviewTitle}
      onDismiss={onClose}
      doneLabel={IMPORT_MSG.importButton}
      doneDisabled={n === 0 || busy}
      onDone={() => void runImport()}
    >
      {preview && (
        <>
          <p className="gt-import__summary">
            {n ? IMPORT_MSG.summary(n, preview.setCount) : IMPORT_MSG.nothingValid}
          </p>
          {n > 0 && (
            <IonList inset>
              {preview.logs.slice(0, MAX_LOGS_SHOWN).map((l, i) => (
                <IonItem key={i}>
                  <IonLabel className="ion-text-wrap">
                    <h3>{l.name}</h3>
                    <p>
                      {formatDateKeyLong(l.date)} · {l.startTime} ·{' '}
                      {MSG_EXTRA.exerciseCount(l.exercises.length)}
                    </p>
                  </IonLabel>
                </IonItem>
              ))}
              {n > MAX_LOGS_SHOWN && (
                <IonItem lines="none">
                  <IonLabel color="medium">{IMPORT_MSG.moreErrors(n - MAX_LOGS_SHOWN)}</IonLabel>
                </IonItem>
              )}
            </IonList>
          )}
          {preview.errors.length > 0 && (
            <>
              <h2 className="gt-section-title">{IMPORT_MSG.skipped(preview.skippedRows)}</h2>
              <ul className="gt-import__errors">
                {preview.errors.slice(0, MAX_ERRORS_SHOWN).map((e, i) => (
                  <li key={i}>{IMPORT_MSG.rowError(e.row, e.column, e.value, e.message)}</li>
                ))}
                {preview.errors.length > MAX_ERRORS_SHOWN && (
                  <li>{IMPORT_MSG.moreErrors(preview.errors.length - MAX_ERRORS_SHOWN)}</li>
                )}
              </ul>
            </>
          )}
          <div className="gt-import__back">
            <IonButton fill="clear" onClick={() => setStep('match')}>
              {IMPORT_MSG.changeMatching}
            </IonButton>
          </div>
        </>
      )}
    </Sheet>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <IonItem>
      <IonLabel className="ion-text-wrap">{label}</IonLabel>
      <IonSegment
        slot="end"
        className="gt-import__seg"
        value={value}
        onIonChange={(e) => onChange(e.detail.value as T)}
      >
        {options.map(([v, text]) => (
          <IonSegmentButton key={v} value={v}>
            <IonLabel>{text}</IonLabel>
          </IonSegmentButton>
        ))}
      </IonSegment>
    </IonItem>
  );
}
