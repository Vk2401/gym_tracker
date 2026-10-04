import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonToggle,
} from '@ionic/react';
import { add, calendarOutline, settingsOutline } from 'ionicons/icons';
import { useCallback, useState } from 'react';
import { MonthCalendar } from '@/components/MonthCalendar';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Sheet } from '@/components/Sheet';
import { useStartWorkout } from '@/app/useStartWorkout';
import { calendarMonth, logsOnDate } from '@/db/repos/logs';
import { templateNames } from '@/db/repos/workouts';
import { monthRange, shiftMonth } from '@/domain/calendar';
import { formatDuration } from '@/domain/duration';
import { EMPTY, MSG } from '@/domain/messages';
import { formatDateKeyLong, localToUtc, stampOf, todayKey } from '@/domain/time';
import type { WeekStart } from '@/domain/types';
import { useDialogs } from '@/hooks/useDialogs';
import { useFeedback } from '@/hooks/useFeedback';
import { useLive } from '@/hooks/useLive';
import { setPref, usePrefs } from '@/hooks/usePrefs';
import { getDb } from '@/db/client';

/** LG-1..8: calendar and per-day logs. */
export default function LogsPage() {
  const prefs = usePrefs();
  const today = todayKey();
  const [selected, setSelected] = useState(today);
  const [ym, setYm] = useState(() => ({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)),
  }));
  const [collapsed, setCollapsed] = useState(false);
  const [options, setOptions] = useState(false);
  const start = useStartWorkout();
  const { actions } = useDialogs();
  const { error } = useFeedback();

  const { from, to } = monthRange(ym.year, ym.month);
  const { data: logged = new Map() } = useLive((db) => calendarMonth(db, from, to), [from, to]);
  const { data: cards = [], loading } = useLive((db) => logsOnDate(db, selected), [selected]);

  const select = useCallback((d: string) => {
    setSelected(d);
    setYm({ year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)) });
  }, []);
  const onMonth = useCallback(
    (delta: number) => {
      const next = shiftMonth(ym.year, ym.month, delta);
      setYm(next);
      setSelected(monthRange(next.year, next.month).from);
    },
    [ym],
  );

  // LG-8 / PD-3: templates plus Empty Workout; the log takes the selected date and current time.
  const newLog = async () => {
    if (selected > today) return error(MSG.futureStart); // VR-4
    const templates = await templateNames(getDb());
    const c = await actions('Log a Workout', [
      { text: 'Empty Workout', value: '__empty' },
      ...templates.map((t) => ({ text: t.name, value: t.id })),
    ]);
    if (!c) return;
    const now = new Date();
    const offset = -now.getTimezoneOffset();
    const time = now.toTimeString().slice(0, 8);
    const stamp =
      selected === today
        ? stampOf(now)
        : { utc: localToUtc(selected, time, offset), offsetMin: offset };
    await start(
      c === '__empty' ? { kind: 'empty' } : { kind: 'template', templateId: c },
      stamp,
      'logs',
    );
  };

  return (
    <IonPage>
      <PageHeader
        title="Logs"
        start={<IonButton onClick={() => select(today)}>Today</IonButton>}
        end={
          <IonButton aria-label="Calendar settings" onClick={() => setOptions(true)}>
            <IonIcon slot="icon-only" icon={settingsOutline} />
          </IonButton>
        }
      />
      <IonContent>
        <MonthCalendar
          year={ym.year}
          month={ym.month}
          weekStart={prefs.weekStart}
          showDots={prefs.showDots}
          selected={selected}
          today={today}
          logged={logged}
          collapsed={collapsed}
          onSelect={select}
          onMonth={onMonth}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
        />
        <IonList inset>
          <IonListHeader>{formatDateKeyLong(selected)}</IonListHeader>
          {cards.map((c) => (
            <IonItem key={c.id} button routerLink={`/logs/${c.id}`} detail>
              <IonLabel>
                <h2 className="truncate">{c.name}</h2>
                <p>
                  {c.endUtc
                    ? `Completed in ${formatDuration(c.startUtc, c.endUtc)}`
                    : 'In progress'}
                </p>
                <p>Exercises performed {c.exercises}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
        {!loading && cards.length === 0 && (
          <EmptyState
            icon={calendarOutline}
            message={EMPTY.logsDay.message}
            action={EMPTY.logsDay.action}
            onAction={() => void newLog()}
          />
        )}
        <div className="gt-fab-space" />
        <IonFab vertical="bottom" horizontal="end" slot="fixed" className="gt-fab hide-on-keyboard">
          <IonFabButton aria-label="New log" onClick={() => void newLog()}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>

      {/* PD-12 → ST-2 calendar options */}
      <Sheet isOpen={options} title="Calendar" onDismiss={() => setOptions(false)}>
        <IonList inset>
          <IonListHeader>First day of the week</IonListHeader>
          <IonItem lines="none">
            <IonSegment
              value={prefs.weekStart}
              onIonChange={(e) => void setPref('weekStart', e.detail.value as WeekStart)}
            >
              <IonSegmentButton value="sun">
                <IonLabel>Sunday</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="mon">
                <IonLabel>Monday</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </IonItem>
        </IonList>
        <IonList inset>
          <IonItem lines="none">
            <IonToggle
              checked={prefs.showDots}
              onIonChange={(e) => void setPref('showDots', e.detail.checked)}
            >
              Show category dots
            </IonToggle>
          </IonItem>
        </IonList>
      </Sheet>
    </IonPage>
  );
}
