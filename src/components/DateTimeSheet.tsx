import { IonButton } from '@ionic/react';
import { useState } from 'react';
import Picker from 'react-mobile-picker';
import { daysInMonth } from '@/domain/calendar';
import {
  formatPartsLong,
  localParts,
  MONTHS_SHORT,
  partsToUtc,
  type LocalParts,
} from '@/domain/time';
import { Sheet } from './Sheet';
import './DateTimeSheet.css';

const pad = (n: number) => String(n).padStart(2, '0');
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

type WheelValue = { day: string; month: string; year: string; hour: string; minute: string };

const toWheel = (p: LocalParts): WheelValue => ({
  day: String(p.day),
  month: String(p.month),
  year: String(p.year),
  hour: String(p.hour),
  minute: String(p.minute),
});
const fromWheel = (v: WheelValue): LocalParts => ({
  year: Number(v.year),
  month: Number(v.month),
  day: Number(v.day),
  hour: Number(v.hour),
  minute: Number(v.minute),
});

/**
 * WL-2 Start / End Time picker: iOS-style scroll wheels (react-mobile-picker) in a bottom
 * sheet. Same look on every phone, always 24-hour (BR-10, device-independence §6), edited in
 * the session's own local time (VR-15). Validation (VR-3, VR-4) stays with the caller.
 */
export function DateTimeSheet({
  isOpen,
  title,
  utc,
  offsetMin,
  onDismiss,
  onDone,
}: {
  isOpen: boolean;
  title: string;
  utc: string;
  offsetMin: number;
  onDismiss: () => void;
  onDone: (utc: string) => void;
}) {
  const [value, setValue] = useState<WheelValue>(() => toWheel(localParts(utc, offsetMin)));
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  // Reset the wheels to the stored value each time the sheet opens.
  const key = isOpen ? `${utc}|${offsetMin}` : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    if (key) setValue(toWheel(localParts(utc, offsetMin)));
  }

  const parts = fromWheel(value);
  const thisYear = new Date().getUTCFullYear();
  const years = range(Math.min(parts.year, thisYear - 5), Math.max(parts.year, thisYear));
  const maxDay = daysInMonth(parts.year, parts.month);

  const onChange = (next: WheelValue) => {
    // Keep the day valid when the month or year changes (31 Jan → Feb).
    const max = daysInMonth(Number(next.year), Number(next.month));
    setValue(Number(next.day) > max ? { ...next, day: String(max) } : next);
  };

  const now = () => {
    const d = new Date();
    setValue(toWheel(localParts(d.toISOString(), offsetMin)));
  };

  const column = (
    name: keyof WheelValue,
    label: string,
    items: { value: number; text: string }[],
    className = '',
  ) => (
    <Picker.Column
      name={name}
      className={`gt-wheel__col ${className}`}
      aria-label={label}
      role="listbox"
    >
      {items.map((it) => (
        <Picker.Item key={it.value} value={String(it.value)}>
          {({ selected }) => (
            <div
              className={`gt-wheel__item num ${selected ? 'gt-wheel__item--on' : ''}`}
              role="option"
              aria-selected={selected}
            >
              {it.text}
            </div>
          )}
        </Picker.Item>
      ))}
    </Picker.Column>
  );

  return (
    <Sheet
      isOpen={isOpen}
      title={title}
      onDismiss={onDismiss}
      onDone={() => onDone(partsToUtc(parts, offsetMin))}
    >
      <div className="gt-dts">
        <div className="gt-dts__preview">
          <span className="num">{formatPartsLong(parts)}</span>
          <IonButton size="small" fill="clear" onClick={now}>
            Now
          </IonButton>
        </div>
        <div className="gt-wheel">
          <div className="gt-wheel__band" aria-hidden="true" />
          <Picker
            value={value}
            onChange={onChange}
            height={220}
            itemHeight={44}
            wheelMode="natural"
          >
            {column(
              'day',
              'Day',
              range(1, maxDay).map((d) => ({ value: d, text: pad(d) })),
            )}
            {column(
              'month',
              'Month',
              range(1, 12).map((m) => ({ value: m, text: MONTHS_SHORT[m - 1]! })),
              'gt-wheel__col--wide',
            )}
            {column(
              'year',
              'Year',
              years.map((y) => ({ value: y, text: String(y) })),
              'gt-wheel__col--wide',
            )}
            <div className="gt-wheel__gap" aria-hidden="true" />
            {column(
              'hour',
              'Hour',
              range(0, 23).map((h) => ({ value: h, text: pad(h) })),
            )}
            <div className="gt-wheel__colon" aria-hidden="true">
              :
            </div>
            {column(
              'minute',
              'Minute',
              range(0, 59).map((m) => ({ value: m, text: pad(m) })),
            )}
          </Picker>
        </div>
      </div>
    </Sheet>
  );
}
