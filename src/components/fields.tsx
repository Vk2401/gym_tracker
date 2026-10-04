import { useState, type KeyboardEvent } from 'react';
import { formatDistance, formatTime, formatWeight } from '@/domain/format';
import { parseDecimal, parseTime } from '@/domain/parse';
import { lbToKg, miToKm } from '@/domain/units';
import { validateRange } from '@/domain/validation';
import type { DistanceUnit, WeightUnit } from '@/domain/types';
import { useFeedback } from '@/hooks/useFeedback';
import { focusNext } from './focus';

export type NumberKind = 'reps' | 'weight' | 'distance' | 'rpe' | 'bodyWeight' | 'plain';

interface NumberFieldProps {
  kind: NumberKind;
  /** Stored value: kg / km / count (BR-9). */
  value: number | null;
  weightUnit?: WeightUnit;
  distanceUnit?: DistanceUnit;
  onCommit: (stored: number | null) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  /** Bounds for kind 'plain' (e.g. measurements). */
  range?: { min: number; max: number };
}

function display(kind: NumberKind, v: number | null, wu: WeightUnit, du: DistanceUnit): string {
  if (v === null) return '';
  switch (kind) {
    case 'weight':
    case 'bodyWeight':
      return formatWeight(v, wu);
    case 'distance':
      return formatDistance(v, du);
    default:
      return String(v);
  }
}

const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    focusNext(e.currentTarget);
  }
};

/**
 * Numeric input with locale-tolerant parsing (device-independence §7), unit conversion at
 * display time only (BR-9) and range validation as the user commits (VR-2): invalid values
 * are never saved.
 */
export function NumberField({
  kind,
  value,
  weightUnit = 'kg',
  distanceUnit = 'km',
  onCommit,
  ariaLabel,
  placeholder,
  className,
  range,
}: NumberFieldProps) {
  const shown = display(kind, value, weightUnit, distanceUnit);
  const [draft, setDraft] = useState(shown);
  const [prevShown, setPrevShown] = useState(shown);
  if (shown !== prevShown) {
    setPrevShown(shown);
    setDraft(shown);
  }
  const { error } = useFeedback();

  const commit = () => {
    if (draft.trim() === shown) return;
    if (draft.trim() === '') {
      if (value !== null) onCommit(null);
      return;
    }
    const n = parseDecimal(draft);
    let stored: number | null = n;
    if (n !== null) {
      if (kind === 'weight' || kind === 'bodyWeight') stored = weightUnit === 'lb' ? lbToKg(n) : n;
      if (kind === 'distance') stored = distanceUnit === 'mi' ? miToKm(n) : n;
    }
    const field =
      kind === 'weight'
        ? 'weightKg'
        : kind === 'distance'
          ? 'distanceKm'
          : kind === 'bodyWeight'
            ? 'bodyWeightKg'
            : kind;
    // VR-2 bounds apply to the number typed; body weight bounds are in kg.
    const check =
      n === null
        ? { ok: false as const, message: '' }
        : kind === 'plain'
          ? n >= (range?.min ?? 0) && n <= (range?.max ?? Infinity)
            ? { ok: true as const }
            : {
                ok: false as const,
                message: `Enter a value between ${range?.min} and ${range?.max}.`,
              }
          : kind === 'bodyWeight'
            ? validateRange('bodyWeightKg', Math.round(stored! * 10) / 10)
            : validateRange(field as 'reps' | 'weightKg' | 'distanceKm' | 'rpe', n);
    if (!check.ok || stored === null) {
      const r = {
        reps: '0 and 999',
        weight: '0 and 999.9',
        distance: '0 and 999.9',
        rpe: '1 and 10',
        bodyWeight: '20.0 and 400.0',
        plain: `${range?.min} and ${range?.max}`,
      }[kind];
      error(check.ok === false && check.message ? check.message : `Enter a value between ${r}.`);
      setDraft(shown);
      return;
    }
    const rounded = kind === 'reps' ? Math.round(stored) : Math.round(stored * 1000) / 1000;
    onCommit(rounded);
  };

  return (
    <input
      className={`gt-input num ${className ?? ''}`}
      inputMode={kind === 'reps' ? 'numeric' : 'decimal'}
      enterKeyHint="next"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      data-nav
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={draft}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKey}
    />
  );
}

/** BR-8: HH:MM:SS time input. */
export function TimeField({
  value,
  onCommit,
  ariaLabel,
  className,
}: {
  value: number | null;
  onCommit: (seconds: number | null) => void;
  ariaLabel: string;
  className?: string;
}) {
  const shown = value === null ? '' : formatTime(value);
  const [draft, setDraft] = useState(shown);
  const [prevShown, setPrevShown] = useState(shown);
  if (shown !== prevShown) {
    setPrevShown(shown);
    setDraft(shown);
  }
  const { error } = useFeedback();
  const commit = () => {
    if (draft.trim() === shown) return;
    if (draft.trim() === '') {
      if (value !== null) onCommit(null);
      return;
    }
    const s = parseTime(draft);
    const check = s === null ? null : validateRange('timeS', s);
    if (s === null || !check?.ok) {
      error('Enter a value between 00:00:00 and 23:59:59.');
      setDraft(shown);
      return;
    }
    onCommit(s);
  };
  return (
    <input
      className={`gt-input num ${className ?? ''}`}
      inputMode="numeric"
      enterKeyHint="next"
      autoComplete="off"
      data-nav
      aria-label={ariaLabel}
      placeholder="00:00:00"
      value={draft}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d:]/g, ''))}
      onBlur={commit}
      onKeyDown={onKey}
    />
  );
}
