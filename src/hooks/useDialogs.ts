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
        let value: string | null = null;
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
                value = v.name.trim();
                return true;
              },
            },
          ],
          onDidDismiss: () => resolve(value),
        });
      }),
    [alert, error],
  );

  /** "Delete "{name}"? This can't be undone." (BRD §14). */
  const confirmDelete = useCallback(
    (name: string, message?: string) =>
      new Promise<boolean>((resolve) => {
        let ok = false;
        void alert({
          header: message ? `Delete "${name}"?` : MSG.deleteConfirm(name),
          message,
          buttons: [
            { text: 'Cancel', role: 'cancel' },
            { text: 'Delete', role: 'destructive', handler: () => void (ok = true) },
          ],
          onDidDismiss: () => resolve(ok),
        });
      }),
    [alert],
  );

  // Results resolve on didDismiss, so a follow-up overlay never opens while this one is still
  // animating out (Ionic would otherwise leave the page aria-hidden for screen readers).
  const choose = useCallback(
    <T extends string>(header: string | undefined, buttons: ChoiceButton<T>[], message?: string) =>
      new Promise<T | null>((resolve) => {
        let picked: T | null = null;
        void alert({
          header,
          message,
          buttons: buttons.map((b) => ({
            text: b.text,
            role: b.role,
            handler: () => void (picked = b.role === 'cancel' ? null : b.value),
          })),
          onDidDismiss: () => resolve(picked),
        });
      }),
    [alert],
  );

  const actions = useCallback(
    <T extends string>(header: string | undefined, buttons: ChoiceButton<T>[]) =>
      new Promise<T | null>((resolve) => {
        let picked: T | null = null;
        void sheet({
          header,
          buttons: [
            ...buttons.map((b) => ({
              text: b.text,
              role: b.role,
              handler: () => void (picked = b.value),
            })),
            { text: 'Cancel', role: 'cancel' },
          ],
          onDidDismiss: () => resolve(picked),
        });
      }),
    [sheet],
  );

  return { promptName, confirmDelete, choose, actions, alert };
}
