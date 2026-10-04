import { useIonAlert } from '@ionic/react';
import { useCallback } from 'react';
import { MSG } from '@/domain/messages';
import type { MenuIcon } from '@/components/menuIcons';
import type { Tint } from '@/components/RowIcon';
import { useMenuStore } from '@/store/menuStore';
import { validateName } from '@/domain/validation';
import { useFeedback } from './useFeedback';

export interface ChoiceButton<T extends string> {
  text: string;
  value: T;
  role?: 'destructive' | 'cancel';
  /** Icon shown in a tinted tile in bottom menus. */
  icon?: MenuIcon;
  tint?: Tint;
  /** Second line under the option (bottom menus). */
  subtitle?: string;
}

/** Promise-based alerts / action sheets used across screens. */
export function useDialogs() {
  const [alert] = useIonAlert();
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
          cssClass: 'gt-alert-danger',
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

  // Bottom menu (ActionMenuHost). Resolves after the menu has finished closing.
  const actions = useCallback(
    <T extends string>(header: string | undefined, buttons: ChoiceButton<T>[]) =>
      new Promise<T | null>((resolve) => {
        useMenuStore.setState({
          menu: {
            header,
            options: buttons.filter((b) => b.role !== 'cancel'),
            resolve: (v) => resolve(v as T | null),
          },
        });
      }),
    [],
  );

  return { promptName, confirmDelete, choose, actions, alert };
}
