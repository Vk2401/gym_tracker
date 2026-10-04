import { IonItem, IonLabel, IonNote } from '@ionic/react';
import { TrophyIcon } from 'lucide-react';
import { Icon } from './Icon';
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
    <IonItem routerLink={href} detail={false} className="gt-record">
      <span slot="start" className="gt-trophy" aria-hidden="true">
        <Icon icon={TrophyIcon} />
      </span>
      <IonLabel>
        <h3>{name}</h3>
        <p>
          {date
            ? `${date} · ${RECORD_LABEL[r.recordType].toLowerCase()}`
            : RECORD_LABEL[r.recordType]}
        </p>
      </IonLabel>
      <IonNote slot="end" className="num">
        {recordValue(r, wu, du)}
      </IonNote>
    </IonItem>
  );
}
