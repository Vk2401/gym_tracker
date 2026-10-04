import { IonItem, IonLabel, IonNote } from '@ionic/react';
import type { PersonalRecord } from '@/domain/records';
import { RECORD_LABEL } from '@/domain/records';
import { recordValue } from './recordText';
import type { DistanceUnit, WeightUnit } from '@/domain/types';

/** XP-6 / SS-4 record rows. */
export function RecordRow({
  r,
  name,
  date,
  wu,
  du,
  href,
}: {
  r: PersonalRecord;
  name: string;
  date?: string;
  wu: WeightUnit;
  du: DistanceUnit;
  href?: string;
}) {
  return (
    <IonItem routerLink={href} detail={!!href}>
      <IonLabel>
        <h3 className="truncate">{name}</h3>
        <p>{RECORD_LABEL[r.recordType]}</p>
      </IonLabel>
      <IonNote slot="end" className="num gt-note-right">
        {recordValue(r, wu, du)}
        {date && <small>{date}</small>}
      </IonNote>
    </IonItem>
  );
}
