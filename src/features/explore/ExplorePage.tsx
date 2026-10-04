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
  useIonRouter,
} from '@ionic/react';
import { statsChartOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { track } from '@/app/analytics';
import { CategoryDot } from '@/components/CategoryDot';
import { EmptyState } from '@/components/EmptyState';
import { OptionSheet } from '@/components/OptionSheet';
import { PageHeader } from '@/components/PageHeader';
import { RecordRow } from '@/components/RecordsList';
import type { Db } from '@/db/types';
import { listExercises } from '@/db/repos/library';
import * as st from '@/db/repos/stats';
import { formatDistance, formatTime, formatWeight } from '@/domain/format';
import { MEASUREMENT_TYPES } from '@/domain/measurements';
import { EMPTY } from '@/domain/messages';
import { computeRecords } from '@/domain/records';
import {
  RANGES_LIST,
  rangeStart,
  sessionBests,
  volumePerWeek,
  weekKey,
  weekStreak,
  workoutsPerWeek,
  type RangeKey,
} from '@/domain/stats';
import { formatDateKeyLong, MONTHS_SHORT, todayKey } from '@/domain/time';
import { kgToLb, kmToMi } from '@/domain/units';
import { useLive } from '@/hooks/useLive';
import { usePrefs } from '@/hooks/usePrefs';
import { ChartTable, ColumnChart, LineChart } from './charts';
import './ExplorePage.css';

const shortDate = (key: string) => `${key.slice(8)} ${MONTHS_SHORT[Number(key.slice(5, 7)) - 1]}`;

async function load(db: Db, range: RangeKey) {
  const today = todayKey();
  const from = rangeStart(range, today);
  const [allLogs, sets, cats, recordSets, body, exercises] = await Promise.all([
    st.logsSince(db, null),
    st.workingSetsSince(db, from),
    st.setsPerCategory(db, from),
    st.recordSets(db),
    st.bodySince(db, from),
    listExercises(db),
  ]);
  return { today, from, allLogs, sets, cats, recordSets, body, exercises };
}

/** XP-1..8: progress dashboard. */
export default function ExplorePage() {
  const prefs = usePrefs();
  const router = useIonRouter();
  const [range, setRange] = useState<RangeKey>('3m');
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [exSheet, setExSheet] = useState(false);
  const [bodyMetric, setBodyMetric] = useState('weight');
  const { data, loading } = useLive((db) => load(db, range), [range]);
  useEffect(() => track('explore_viewed', { time_range: range }), [range]);

  const wu = prefs.weightUnit;
  const du = prefs.distanceUnit;
  const ws = prefs.weekStart;
  const open = (logId?: string) => logId && router.push(`/logs/${logId}`, 'forward'); // XP-8

  const view = useMemo(() => {
    if (!data) return null;
    const inRange = data.allLogs.filter((l) => !data.from || l.dateKey >= data.from);
    const from = data.from ?? data.allLogs[0]?.dateKey ?? data.today;
    const perWeek = workoutsPerWeek(
      inRange.map((l) => l.dateKey),
      from,
      data.today,
      ws,
    );
    const volume = volumePerWeek(data.sets, from, data.today, ws);
    const lastLogOfWeek = (week: string) =>
      [...inRange].reverse().find((l) => weekKey(l.dateKey, ws) === week)?.logId;
    const dateOfLog = new Map(data.allLogs.map((l) => [l.logId, l.dateKey]));
    const records = computeRecords(data.recordSets);
    const exName = new Map(data.exercises.map((e) => [e.id, e.name]));
    // exercises with history, most-trained first
    const counts = new Map<string, number>();
    for (const s of data.recordSets) counts.set(s.exerciseId, (counts.get(s.exerciseId) ?? 0) + 1);
    const trained = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    return {
      perWeek,
      streak: weekStreak(
        data.allLogs.map((l) => l.dateKey),
        data.today,
        ws,
      ),
      volume,
      lastLogOfWeek,
      dateOfLog,
      records,
      exName,
      trained,
    };
  }, [data, ws]);

  const exId = exerciseId ?? view?.trained[0] ?? null;
  const exSets = useMemo(
    () => (data && exId ? data.sets.filter((s) => s.exerciseId === exId) : []),
    [data, exId],
  );
  const bests = useMemo(() => sessionBests(exSets), [exSets]);

  if (!data || !view)
    return (
      <IonPage>
        <PageHeader title="Explore" />
        <IonContent />
      </IonPage>
    );

  if (!loading && data.allLogs.length === 0) {
    return (
      <IonPage>
        <PageHeader title="Explore" />
        <IonContent>
          <EmptyState
            fill
            icon={statsChartOutline}
            message={EMPTY.explore.message}
            action={EMPTY.explore.action}
            onAction={() => router.push('/workouts', 'root')}
          />
        </IonContent>
      </IonPage>
    );
  }

  const fmtW = (kg: number) => `${formatWeight(kg, wu)} ${wu}`;
  const weekLabels = view.perWeek.map((w) => shortDate(w.week));
  const volSeries = [
    {
      label: `Volume (${wu})`,
      values: view.volume.map((v) => (wu === 'lb' ? kgToLb(v.volume) : v.volume)),
    },
  ];
  const maxCat = Math.max(1, ...data.cats.map((c) => c.sets));

  // XP-5 series: weight-based exercises plot best set + e1RM, others their main metric.
  const hasWeight = bests.some((b) => b.bestWeightKg !== null);
  const hasTime = bests.some((b) => b.bestTimeS !== null);
  const hasDist = bests.some((b) => b.bestDistanceKm !== null);
  const progLabels = bests.map((b) => shortDate(b.dateKey));
  const conv = (kg: number | null) => (kg === null ? null : wu === 'lb' ? kgToLb(kg) : kg);
  const progSeries = hasWeight
    ? [
        { label: 'Best set', values: bests.map((b) => conv(b.bestWeightKg)) },
        { label: 'Est. 1RM', values: bests.map((b) => conv(b.e1rm)) },
      ]
    : hasTime
      ? [{ label: 'Best time', values: bests.map((b) => b.bestTimeS) }]
      : hasDist
        ? [
            {
              label: 'Best distance',
              values: bests.map((b) =>
                b.bestDistanceKm === null
                  ? null
                  : du === 'mi'
                    ? kmToMi(b.bestDistanceKm)
                    : b.bestDistanceKm,
              ),
            },
          ]
        : [{ label: 'Best reps', values: bests.map((b) => b.bestReps) }];
  const progFormat = hasWeight
    ? (v: number) => `${(Math.round(v * 10) / 10).toFixed(1)} ${wu}`
    : hasTime
      ? (v: number) => formatTime(v)
      : hasDist
        ? (v: number) => `${(Math.round(v * 10) / 10).toFixed(1)} ${du}`
        : (v: number) => `${Math.round(v)}`;

  // XP-7
  const bodyOptions = [
    { value: 'weight', label: 'Body weight' },
    ...MEASUREMENT_TYPES.filter((m) =>
      data.body.some((b) => b.measurements[m.type] !== undefined),
    ).map((m) => ({ value: m.type, label: m.label })),
  ];
  const bodyPts = data.body.filter((b) =>
    bodyMetric === 'weight' ? b.bodyWeightKg !== null : b.measurements[bodyMetric] !== undefined,
  );
  const bodyUnit =
    bodyMetric === 'weight'
      ? wu
      : (MEASUREMENT_TYPES.find((m) => m.type === bodyMetric)?.unit ?? '');
  const bodyVals = bodyPts.map((b) =>
    bodyMetric === 'weight' ? conv(b.bodyWeightKg) : b.measurements[bodyMetric]!,
  );

  const recordsByExercise = new Map<string, typeof view.records>();
  for (const r of view.records)
    recordsByExercise.set(r.exerciseId, [...(recordsByExercise.get(r.exerciseId) ?? []), r]);
  const recordGroups = [...recordsByExercise.entries()]
    .map(([id, rs]) => ({ id, name: view.exName.get(id) ?? 'Deleted exercise', rs }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <IonPage>
      <PageHeader title="Explore">
        {/* XP-1 */}
        <IonSegment
          value={range}
          onIonChange={(e) => setRange(e.detail.value as RangeKey)}
          className="gt-range"
          aria-label="Time range"
        >
          {RANGES_LIST.map((r) => (
            <IonSegmentButton key={r.key} value={r.key} aria-label={r.label}>
              <IonLabel>{r.short}</IonLabel>
            </IonSegmentButton>
          ))}
        </IonSegment>
      </PageHeader>
      <IonContent>
        {/* XP-2 */}
        <section className="gt-card">
          <header className="gt-card__head">
            <h2>Consistency</h2>
            <p>Workouts per week</p>
          </header>
          <div className="gt-stat">
            <span className="gt-stat__value num">{view.streak}</span>
            <span className="gt-stat__label">week streak</span>
          </div>
          <ColumnChart
            ariaLabel="Workouts per week"
            integer
            labels={weekLabels}
            series={[{ label: 'Workouts', values: view.perWeek.map((w) => w.count) }]}
            format={(v) => String(Math.round(v))}
            onPick={(i) => open(view.lastLogOfWeek(view.perWeek[i]!.week))}
          />
          <ChartTable
            caption="Workouts per week"
            labels={weekLabels}
            series={[{ label: 'Workouts', values: view.perWeek.map((w) => w.count) }]}
            format={String}
          />
        </section>

        {/* XP-3 */}
        <section className="gt-card">
          <header className="gt-card__head">
            <h2>Volume</h2>
            <p>Weekly reps × weight, completed working sets ({wu})</p>
          </header>
          <LineChart
            ariaLabel="Weekly volume"
            labels={weekLabels}
            series={volSeries}
            format={(v) => Math.round(v).toLocaleString('en-US')}
            onPick={(i) => open(view.lastLogOfWeek(view.volume[i]!.week))}
          />
          <ChartTable
            caption="Weekly volume"
            labels={weekLabels}
            series={volSeries}
            format={(v) => Math.round(v).toLocaleString('en-US')}
          />
        </section>

        {/* XP-4 */}
        <section className="gt-card">
          <header className="gt-card__head">
            <h2>Muscle Balance</h2>
            <p>Completed working sets per category</p>
          </header>
          {data.cats.length === 0 && (
            <p className="gt-card__empty">No completed sets in this range.</p>
          )}
          <ul className="gt-hbars">
            {data.cats.map((c) => (
              <li key={c.id}>
                <span className="gt-hbars__name truncate">
                  <CategoryDot color={c.color} />
                  {c.name}
                </span>
                <span className="gt-hbars__track">
                  <span
                    className="gt-hbars__bar"
                    style={{ width: `${(c.sets / maxCat) * 100}%`, background: c.color }}
                  />
                </span>
                <span className="gt-hbars__value num">{c.sets}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* XP-5 */}
        <section className="gt-card">
          <header className="gt-card__head">
            <h2>Exercise Progress</h2>
          </header>
          <IonList lines="none" className="gt-card__list">
            <IonItem
              button
              detail
              onClick={() => setExSheet(true)}
              disabled={view.trained.length === 0}
            >
              <IonLabel className="truncate">
                {exId ? (view.exName.get(exId) ?? 'Deleted exercise') : 'Pick an exercise'}
              </IonLabel>
            </IonItem>
          </IonList>
          {bests.length > 0 ? (
            <>
              <LineChart
                ariaLabel="Exercise progress"
                labels={progLabels}
                series={progSeries}
                format={progFormat}
                beginAtZero={false}
                onPick={(i) => open(bests[i]?.logId)}
              />
              <ChartTable
                caption="Exercise progress"
                labels={progLabels}
                series={progSeries}
                format={progFormat}
              />
              <IonList className="gt-card__list">
                {[...bests].reverse().map((b) => (
                  <IonItem key={b.logId} button detail onClick={() => open(b.logId)}>
                    <IonLabel>{formatDateKeyLong(b.dateKey)}</IonLabel>
                    <IonNote slot="end" className="num">
                      {b.bestWeightKg !== null
                        ? `${fmtW(b.bestWeightKg)} × ${b.bestReps ?? 0}${b.e1rm ? ` · 1RM ${formatWeight(b.e1rm, wu)}` : ''}`
                        : b.bestTimeS !== null
                          ? formatTime(b.bestTimeS)
                          : b.bestDistanceKm !== null
                            ? `${formatDistance(b.bestDistanceKm, du)} ${du}`
                            : `${b.bestReps ?? 0} reps`}
                    </IonNote>
                  </IonItem>
                ))}
              </IonList>
            </>
          ) : (
            <p className="gt-card__empty">No sessions for this exercise in this range.</p>
          )}
        </section>

        {/* XP-6 */}
        <IonList inset>
          <IonListHeader>Personal Records</IonListHeader>
          {recordGroups.length === 0 && (
            <IonItem lines="none">
              <IonLabel color="medium">{EMPTY.personalRecords.message}</IonLabel>
            </IonItem>
          )}
          {recordGroups.flatMap((g) =>
            g.rs.map((r) => (
              <RecordRow
                key={`${g.id}-${r.recordType}`}
                r={r}
                name={g.name}
                date={formatDateKeyLong(view.dateOfLog.get(r.logId) ?? r.achievedUtc.slice(0, 10))}
                wu={wu}
                du={du}
                href={`/logs/${r.logId}`}
              />
            )),
          )}
        </IonList>

        {/* XP-7 */}
        <section className="gt-card">
          <header className="gt-card__head">
            <h2>Body</h2>
          </header>
          {bodyOptions.length > 1 && (
            <IonSegment
              scrollable
              value={bodyMetric}
              onIonChange={(e) => setBodyMetric(String(e.detail.value))}
              aria-label="Body metric"
            >
              {bodyOptions.map((o) => (
                <IonSegmentButton key={o.value} value={o.value}>
                  <IonLabel>{o.label}</IonLabel>
                </IonSegmentButton>
              ))}
            </IonSegment>
          )}
          {bodyPts.length > 0 ? (
            <>
              <LineChart
                ariaLabel={`${bodyOptions.find((o) => o.value === bodyMetric)?.label} over time`}
                labels={bodyPts.map((b) => shortDate(b.dateKey))}
                series={[
                  {
                    label: `${bodyOptions.find((o) => o.value === bodyMetric)?.label} (${bodyUnit})`,
                    values: bodyVals,
                  },
                ]}
                format={(v) => `${(Math.round(v * 10) / 10).toFixed(1)}`}
                beginAtZero={false}
                onPick={(i) => open(bodyPts[i]?.logId)}
              />
              <ChartTable
                caption="Body"
                labels={bodyPts.map((b) => shortDate(b.dateKey))}
                series={[{ label: bodyUnit, values: bodyVals }]}
                format={(v) => (Math.round(v * 10) / 10).toFixed(1)}
              />
            </>
          ) : (
            <p className="gt-card__empty">Enter body weight in a workout log to see it here.</p>
          )}
        </section>
        <div className="gt-fab-space" />
      </IonContent>
      <OptionSheet
        isOpen={exSheet}
        title="Exercise"
        options={view.trained.map((id) => ({
          value: id,
          label: view.exName.get(id) ?? 'Deleted exercise',
        }))}
        selected={exId}
        onDismiss={() => setExSheet(false)}
        onSelect={setExerciseId}
      />
    </IonPage>
  );
}
