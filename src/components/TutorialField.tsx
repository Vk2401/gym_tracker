import { IonInput } from '@ionic/react';
import { LinkIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TUTORIAL } from '@/domain/messages';
import { normalizeTutorialUrl } from '@/domain/tutorial';
import { useFeedback } from '@/hooks/useFeedback';
import { Icon } from './Icon';

/**
 * ED-7: tutorial link input. Saves as the user types once the text is a web link (NFR-3,
 * debounced); on leaving the field an invalid link is rejected with a message (PD-18).
 */
export function TutorialField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { error } = useFeedback();
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const save = (text: string) => {
    const url = normalizeTutorialUrl(text);
    if (url !== null && url !== value) onSave(url);
    return url;
  };
  return (
    <IonInput
      className="gt-tutorial-input"
      aria-label={TUTORIAL.inputLabel}
      placeholder={TUTORIAL.placeholder}
      type="url"
      inputmode="url"
      autocapitalize="off"
      spellcheck={false}
      clearInput
      value={draft}
      onIonFocus={() => (focused.current = true)}
      onIonInput={(e) => {
        const v = e.detail.value ?? '';
        setDraft(v);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => save(v), 300);
      }}
      onIonBlur={() => {
        focused.current = false;
        clearTimeout(timer.current);
        const url = save(draft);
        if (url === null) {
          error(TUTORIAL.invalid);
          setDraft(value);
        } else setDraft(url);
      }}
    >
      <Icon slot="start" icon={LinkIcon} aria-hidden="true" />
    </IonInput>
  );
}
