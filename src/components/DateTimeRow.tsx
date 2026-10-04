import { useState } from 'react';
import { clockAt } from '@/domain/time';
import { DateTimeSheet } from './DateTimeSheet';
import './DateTimeRow.css';

/**
 * WL-2 as a stat tile (workout log header grid): label and time; tapping the time opens the
 * wheel picker, which edits the date too. Session local time (VR-15), 24-hour (BR-10).
 */
export function DateTimeTile({
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
    <div className="gt-stat3">
      <span className="gt-stat3__label">{label}</span>
      {utc ? (
        <>
          <button
            type="button"
            className="gt-stat3__value num"
            aria-label={`${label} time`}
            onClick={() => setOpen(true)}
          >
            {clockAt(utc, offsetMin)}
          </button>
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
        </>
      ) : (
        <span className="gt-stat3__value gt-stat3__value--empty">{placeholder}</span>
      )}
    </div>
  );
}
