import { useIonActionSheet, useIonAlert } from '@ionic/react';
import { useCallback } from 'react';
import { MSG } from '@/domain/messages';
import { validateName } from '@/domain/validation';
import { useFeedback } from './useFeedback';

export interface ChoiceButton<T extends string> {
  text: string;
  value: T;
  role?: 'destructive' | 'cancel';
}

/** Promise-based alerts / action sheets used across screens. */
export function useDialogs() {
  const [alert] = useIonAlert();
  const [sheet] = useIonActionSheet();
  const { error } = useFeedback();

  /** VR-1 name prompt: 1–60 chars, optional case-insensitive uniqueness. */
  const promptName = useCallback(
    (opts: {
      header: string;
      value?: string;
      placeholder?: string;
      existing?: string[];
      kind?: 'exercise' | 'category';
    }) =>
      new Promise<string | null>((resolve) => {
        let done = false;
        void alert({
          header: opts.header,
          inputs: [
            {
              name: 'name',
              type: 'text',
              value: opts.value ?? '',
              placeholder: opts.placeholder ?? 'Name',
              attributes: { maxlength: 60, autocapitalize: 'words' },
            },
          ],
          buttons: [
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Save',
              handler: (v: { name: string }) => {
                const check = validateName(v.name, { existing: opts.existing, kind: opts.kind });
                if (!check.ok) {
                  error(check.message);
                  return false;
                }
                done = true;
                resolve(v.name.trim());
                return true;
              },
            },
          ],
          onDidDismiss: () => !done && resolve(null),
        });
      }),
    [alert, error],
  );

  /** "Delete "{name}"? This can't be undone." (BRD §14). */
  const confirmDelete = useCallback(
    (name: string, message?: string) =>
      new Promise<boolean>((resolve) => {
        void alert({
          header: message ? `Delete "${name}"?` : MSG.deleteConfirm(name),
          message,
          buttons: [
            { text: 'Cancel', role: 'cancel', handler: () => resolve(false) },
            { text: 'Delete', role: 'destructive', handler: () => resolve(true) },
          ],
          onDidDismiss: () => resolve(false),
        });
      }),
    [alert],
  );

  const choose = useCallback(
    <T extends string>(header: string | undefined, buttons: ChoiceButton<T>[], message?: string) =>
      new Promise<T | null>((resolve) => {
        void alert({
          header,
          message,
          buttons: buttons.map((b) => ({
            text: b.text,
            role: b.role,
            handler: () => resolve(b.role === 'cancel' ? null : b.value),
          })),
          onDidDismiss: () => resolve(null),
        });
      }),
    [alert],
  );

  const actions = useCallback(
    <T extends string>(header: string | undefined, buttons: ChoiceButton<T>[]) =>
      new Promise<T | null>((resolve) => {
        void sheet({
          header,
          buttons: [
            ...buttons.map((b) => ({
              text: b.text,
              role: b.role,
              handler: () => resolve(b.value),
            })),
            { text: 'Cancel', role: 'cancel', handler: () => resolve(null) },
          ],
          onDidDismiss: () => resolve(null),
        });
      }),
    [sheet],
  );

  return { promptName, confirmDelete, choose, actions, alert };
}
