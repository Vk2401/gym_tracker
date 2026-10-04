import { IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList } from '@ionic/react';
import { CheckIcon } from 'lucide-react';
import { Icon } from '@/components/Icon';
import { memo, useState } from 'react';
import { COLUMN_LABEL, setColumns, type SetColumn } from '@/domain/setColumns';
import type { DistanceUnit, FocusMetric, SetType, WeightUnit } from '@/domain/types';
import { NumberField, TimeField } from './fields';
import './SetTable.css';

export interface TableSet {
  id: string;
  setNumber: number;
  type: SetType;
  reps: number | null;
  weightKg: number | null;
  timeS: number | null;
  distanceKm: number | null;
  rpe?: number | null;
  completed?: boolean;
}

export type SetChange = Partial<
  Pick<TableSet, 'reps' | 'weightKg' | 'timeS' | 'distanceKm' | 'rpe'>
>;

interface Props {
  primary: FocusMetric;
  secondary: FocusMetric | null;
  sets: readonly TableSet[];
  /** 'log' adds RPE and the completion control (WL-4..6); 'template' holds prescribed values (WT-5). */
  mode: 'log' | 'template';
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  exerciseName: string;
  onChange: (setId: string, patch: SetChange) => void;
  onToggle?: (set: TableSet, completed: boolean) => void;
  onDelete: (setId: string) => void;
}

const unitSuffix = (c: SetColumn, wu: WeightUnit, du: DistanceUnit) =>
  c === 'weight' ? wu : c === 'distance' ? du : c === 'time' ? 'hh:mm:ss' : '';

/** WL-4 / BR-7: columns follow the exercise focus. */
export function SetTable(props: Props) {
  const { primary, secondary, sets, mode, weightUnit, distanceUnit } = props;
  const cols = setColumns(primary, secondary).filter((c) => mode === 'log' || c !== 'rpe');
  // RPE gets a narrower column; SET # is fixed chrome.
  const colSizes = cols
    .map((c) =>
      c === 'rpe' ? 'minmax(0, 0.7fr)' : c === 'time' ? 'minmax(0, 1.3fr)' : 'minmax(0, 1fr)',
    )
    .join(' ');
  const template = `38px ${colSizes}${mode === 'log' ? ' 44px' : ''}`;
  return (
    <div className="gt-sets" style={{ ['--gt-set-cols' as string]: template }}>
      <div className="gt-sets__head" aria-hidden="true">
        <span>SET #</span>
        {cols.map((c) => (
          <span key={c}>
            {COLUMN_LABEL[c]}
            {unitSuffix(c, weightUnit, distanceUnit) && (
              <small>{unitSuffix(c, weightUnit, distanceUnit)}</small>
            )}
          </span>
        ))}
        {mode === 'log' && <span />}
      </div>
      <IonList lines="none" className="gt-sets__list">
        {sets.map((s) => (
          <SetRowView key={s.id} set={s} cols={cols} {...props} />
        ))}
      </IonList>
    </div>
  );
}

const SetRowView = memo(function SetRowView({
  set,
  cols,
  mode,
  weightUnit,
  distanceUnit,
  exerciseName,
  onChange,
  onToggle,
  onDelete,
}: Props & { set: TableSet; cols: SetColumn[] }) {
  // NFR-1: optimistic completion so the tap registers instantly; DB write follows.
  const [done, setDone] = useState(!!set.completed);
  const [prev, setPrev] = useState(!!set.completed);
  if (prev !== !!set.completed) {
    setPrev(!!set.completed);
    setDone(!!set.completed);
  }
  const label = set.type === 'warmup' ? 'W' : String(set.setNumber); // PD-9
  const name = `${exerciseName} ${set.type === 'warmup' ? 'warm-up' : 'set'} ${set.setNumber}`;

  const cell = (c: SetColumn) => {
    switch (c) {
      case 'reps':
        return (
          <NumberField
            kind="reps"
            value={set.reps}
            ariaLabel={`${name} reps`}
            onCommit={(v) => onChange(set.id, { reps: v })}
          />
        );
      case 'weight':
        return (
          <NumberField
            kind="weight"
            value={set.weightKg}
            weightUnit={weightUnit}
            ariaLabel={`${name} weight`}
            onCommit={(v) => onChange(set.id, { weightKg: v })}
          />
        );
      case 'distance':
        return (
          <NumberField
            kind="distance"
            value={set.distanceKm}
            distanceUnit={distanceUnit}
            ariaLabel={`${name} distance`}
            onCommit={(v) => onChange(set.id, { distanceKm: v })}
          />
        );
      case 'time':
        return (
          <TimeField
            value={set.timeS}
            ariaLabel={`${name} time`}
            onCommit={(v) => onChange(set.id, { timeS: v })}
          />
        );
      case 'rpe':
        // BR-11: optional, placeholder RPE until entered (WL-5)
        return (
          <NumberField
            kind="rpe"
            value={set.rpe ?? null}
            placeholder="RPE"
            ariaLabel={`${name} RPE`}
            onCommit={(v) => onChange(set.id, { rpe: v })}
          />
        );
    }
  };

  return (
    <IonItemSliding>
      <IonItem
        className={`gt-set ${done ? 'gt-set--done' : ''} ${set.type === 'warmup' ? 'gt-set--warmup' : ''}`}
      >
        <div className="gt-set__grid">
          <span className="gt-set__num num">{label}</span>
          {cols.map((c) => (
            <span key={c} className="gt-set__cell">
              {cell(c)}
            </span>
          ))}
          {mode === 'log' && (
            <button
              type="button"
              className={`gt-check ${done ? 'gt-check--on' : ''}`}
              role="checkbox"
              aria-checked={done}
              aria-label={`Complete ${name}`}
              onClick={() => {
                const next = !done;
                setDone(next);
                onToggle?.(set, next);
              }}
            >
              <Icon icon={CheckIcon} aria-hidden="true" />
            </button>
          )}
        </div>
      </IonItem>
      <IonItemOptions side="end">
        <IonItemOption color="danger" onClick={() => onDelete(set.id)}>
          Delete
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );
});
