import { IonTextarea } from '@ionic/react';
import { useEffect, useRef, useState } from 'react';

/**
 * Auto-growing note that saves as the user types (NFR-3, debounce ≤ 300 ms) and on blur.
 */
export function NoteField({
  value,
  onSave,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  const flush = (v: string) => {
    clearTimeout(timer.current);
    if (v !== value) onSave(v);
  };
  return (
    <IonTextarea
      aria-label={ariaLabel}
      autoGrow
      placeholder={placeholder}
      value={draft}
      onIonFocus={() => (focused.current = true)}
      onIonInput={(e) => {
        const v = e.detail.value ?? '';
        setDraft(v);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => onSave(v), 300);
      }}
      onIonBlur={() => {
        focused.current = false;
        flush(draft);
      }}
    />
  );
}

/** VR-16: notes truncate to 3 lines with More. */
export function ClampedText({ text, onMore }: { text: string; onMore?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el) setOverflow(el.scrollHeight > el.clientHeight + 1);
  }, [text]);
  if (!text.trim()) return null;
  return (
    <div className="gt-clamp">
      <p ref={ref} className={open ? '' : 'gt-clamp__text'}>
        {text}
      </p>
      {(overflow || open) && (
        <button
          type="button"
          className="gt-link"
          onClick={() => (onMore ? onMore() : setOpen(!open))}
        >
          {open ? 'Less' : 'More'}
        </button>
      )}
    </div>
  );
}
