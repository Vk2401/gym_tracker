import { IonDatetime, IonDatetimeButton, IonItem, IonLabel, IonModal } from '@ionic/react';
import { formatInTimeZone } from 'date-fns-tz';
import { useId } from 'react';
import { offsetToZone } from '@/domain/format';
import { localToUtc } from '@/domain/time';
import './DateTimeRow.css';

/**
 * WL-2: date + time pickers editing a stored stamp in the session's own local time (VR-15),
 * always 24-hour (BR-10, device-independence §6).
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
  const id = `dt-${useId().replace(/:/g, '')}`;
  const local = utc
    ? formatInTimeZone(utc, offsetToZone(offsetMin), "yyyy-MM-dd'T'HH:mm:ss")
    : undefined;
  return (
    <IonItem className="gt-dt">
      <IonLabel className="gt-dt__label">{label}</IonLabel>
      {utc ? (
        <IonDatetimeButton slot="end" datetime={id} />
      ) : (
        <IonLabel slot="end" color="medium">
          {placeholder}
        </IonLabel>
      )}
      <IonModal keepContentsMounted>
        <IonDatetime
          id={id}
          presentation="date-time"
          hourCycle="h23"
          locale="en-GB"
          value={local}
          showDefaultButtons
          onIonChange={(e) => {
            const v = e.detail.value;
            if (typeof v !== 'string' || v === local) return;
            const [date, time = '00:00:00'] = v.split('T');
            onChange(localToUtc(date!, time.slice(0, 8), offsetMin));
          }}
        />
      </IonModal>
    </IonItem>
  );
}
