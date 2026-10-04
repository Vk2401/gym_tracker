import { IonItem, IonLabel } from '@ionic/react';
import { useState } from 'react';
import { clockAt, dateKeyAt, formatDateKeyLong } from '@/domain/time';
import { DateTimeSheet } from './DateTimeSheet';
import './DateTimeRow.css';

/**
 * WL-2: date + time chips; tapping either opens the wheel picker. Shown and edited in the
 * session's own local time (VR-15), always 24-hour (BR-10).
 */
export function DateTimeRow({
  label,
  utc,
  offsetMin,
  placeholder = '—',
  onChange,
}: {
  label: string;
  utc: string | null;
  offsetMin: number;
  placeholder?: string;
  onChange: (utc: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <IonItem className="gt-dt">
      <IonLabel className="gt-dt__label">{label}</IonLabel>
      {utc ? (
        <div slot="end" className="gt-dt__chips">
          <button
            type="button"
            className="gt-chip num"
            aria-label={`${label} date`}
            onClick={() => setOpen(true)}
          >
            {formatDateKeyLong(dateKeyAt(utc, offsetMin))}
          </button>
          <button
            type="button"
            className="gt-chip num"
            aria-label={`${label} time`}
            onClick={() => setOpen(true)}
          >
            {clockAt(utc, offsetMin)}
          </button>
        </div>
      ) : (
        <IonLabel slot="end" color="medium">
          {placeholder}
        </IonLabel>
      )}
      {utc && (
        <DateTimeSheet
          isOpen={open}
          title={label}
          utc={utc}
          offsetMin={offsetMin}
          onDismiss={() => setOpen(false)}
          onDone={(next) => {
            setOpen(false);
            if (next !== utc) onChange(next);
          }}
        />
      )}
    </IonItem>
  );
}
