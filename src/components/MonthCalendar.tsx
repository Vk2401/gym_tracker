import { IonButton, IonIcon } from '@ionic/react';
import { chevronBack, chevronForward } from 'ionicons/icons';
import { memo } from 'react';
import type { Category } from '@/db/models';
import { monthGrid, monthTitle, weekdayHeaders } from '@/domain/calendar';
import { formatDateKeyLong } from '@/domain/time';
import type { WeekStart } from '@/domain/types';
import './MonthCalendar.css';

interface Props {
  year: number;
  month: number;
  weekStart: WeekStart;
  showDots: boolean;
  selected: string;
  today: string;
  /** Dates with at least one log → categories trained that day (LG-3, LG-4). */
  logged: Map<string, Category[]>;
  collapsed: boolean;
  onSelect: (dateKey: string) => void;
  onMonth: (delta: number) => void;
  onToggleCollapsed: () => void;
}

/** LG-2..6: monthly calendar with logged-day circles, category dots and collapse handle. */
export const MonthCalendar = memo(function MonthCalendar(p: Props) {
  const weeks = monthGrid(p.year, p.month, p.weekStart);
  // Collapsed: only the week containing the selected date (LG-6).
  const visible = p.collapsed ? weeks.filter((w) => w.includes(p.selected)).slice(0, 1) : weeks;
  const shown = visible.length ? visible : weeks.slice(0, 1);
  return (
    <section className="gt-cal" aria-label="Calendar">
      <div className="gt-cal__bar">
        <IonButton fill="clear" aria-label="Previous month" onClick={() => p.onMonth(-1)}>
          <IonIcon slot="icon-only" icon={chevronBack} />
        </IonButton>
        <h2 className="gt-cal__title">{monthTitle(p.year, p.month)}</h2>
        <IonButton fill="clear" aria-label="Next month" onClick={() => p.onMonth(1)}>
          <IonIcon slot="icon-only" icon={chevronForward} />
        </IonButton>
      </div>
      <div className="gt-cal__grid gt-cal__head" aria-hidden="true">
        {weekdayHeaders(p.weekStart).map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div role="grid">
        {shown.map((w, i) => (
          <div className="gt-cal__grid" role="row" key={i}>
            {w.map((d, j) => {
              if (!d) return <span key={j} />;
              const cats = p.logged.get(d);
              const logged = cats !== undefined;
              const sel = d === p.selected;
              const label = `${formatDateKeyLong(d)}${logged ? ', workout logged' : ''}${cats?.length ? `: ${cats.map((c) => c.name).join(', ')}` : ''}`;
              return (
                <button
                  key={d}
                  type="button"
                  role="gridcell"
                  aria-selected={sel}
                  aria-label={label}
                  data-date={d}
                  className={`gt-day ${logged ? 'gt-day--logged' : ''} ${sel ? 'gt-day--selected' : ''} ${d === p.today ? 'gt-day--today' : ''}`}
                  onClick={() => p.onSelect(d)}
                >
                  <span className="gt-day__num num">{Number(d.slice(8))}</span>
                  <span className="gt-day__dots" aria-hidden="true">
                    {p.showDots &&
                      cats
                        ?.slice(0, 5)
                        .map((c) => (
                          <span key={c.id} className="gt-dot" style={{ background: c.color }} />
                        ))}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="gt-cal__handle"
        aria-label={p.collapsed ? 'Expand calendar' : 'Collapse calendar'}
        aria-expanded={!p.collapsed}
        onClick={p.onToggleCollapsed}
      >
        <span />
      </button>
    </section>
  );
});
