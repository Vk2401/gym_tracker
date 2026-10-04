import {
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonPage,
} from '@ionic/react';
import { add } from 'ionicons/icons';
import { useState } from 'react';
import { CategoryDot } from '@/components/CategoryDot';
import { OptionSheet } from '@/components/OptionSheet';
import { PageHeader } from '@/components/PageHeader';
import { mutate } from '@/db/mutate';
import type { Category } from '@/db/models';
import * as lib from '@/db/repos/library';
import { useDialogs } from '@/hooks/useDialogs';
import { useLive } from '@/hooks/useLive';
import { CATEGORY_COLORS } from './colors';

/** ST-4: add, rename, recolour, delete categories (VR-1, VR-10). */
export default function CategoriesPage() {
  const { data: cats = [] } = useLive(lib.listCategories, []);
  const [recolor, setRecolor] = useState<Category | null>(null);
  const [newName, setNewName] = useState<string | null>(null);
  const { promptName, confirmDelete, actions } = useDialogs();
  const names = (except?: string) => cats.filter((c) => c.id !== except).map((c) => c.name);

  const create = async () => {
    const name = await promptName({ header: 'New Category', existing: names(), kind: 'category' });
    if (name) setNewName(name);
  };
  const menu = async (c: Category) => {
    const a = await actions(c.name, [
      { text: 'Rename', value: 'rename' },
      { text: 'Change Colour', value: 'color' },
      { text: 'Delete', value: 'delete', role: 'destructive' },
    ]);
    if (a === 'rename') {
      const name = await promptName({
        header: 'Rename Category',
        value: c.name,
        existing: names(c.id),
        kind: 'category',
      });
      if (name) await mutate((db) => lib.updateCategory(db, c.id, { name }));
    }
    if (a === 'color') setRecolor(c);
    if (a === 'delete') await remove(c);
  };
  const remove = async (c: Category) => {
    if (
      await confirmDelete(c.name, "It will be removed from all exercises. This can't be undone.")
    ) {
      await mutate((db) => lib.deleteCategory(db, c.id));
    }
  };

  return (
    <IonPage>
      <PageHeader
        title="Categories"
        back={{ href: '/settings', text: 'Settings' }}
        end={
          <IonButton aria-label="Add category" onClick={() => void create()}>
            <IonIcon slot="icon-only" icon={add} />
          </IonButton>
        }
      />
      <IonContent>
        <IonList inset>
          {cats.map((c) => (
            <IonItemSliding key={c.id}>
              <IonItem button detail={false} onClick={() => void menu(c)}>
                <span slot="start">
                  <CategoryDot color={c.color} size={14} />
                </span>
                <IonLabel className="truncate">{c.name}</IonLabel>
              </IonItem>
              <IonItemOptions side="end">
                <IonItemOption color="danger" onClick={() => void remove(c)}>
                  Delete
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          ))}
        </IonList>
      </IonContent>
      <OptionSheet
        isOpen={!!recolor || newName !== null}
        title={newName ? `Colour for ${newName}` : 'Colour'}
        options={CATEGORY_COLORS.map((c) => ({ ...c, color: c.value }))}
        selected={recolor?.color ?? null}
        onDismiss={() => {
          setRecolor(null);
          setNewName(null);
        }}
        onSelect={(color) => {
          if (newName) void mutate((db) => lib.createCategory(db, newName, color));
          else if (recolor) void mutate((db) => lib.updateCategory(db, recolor.id, { color }));
        }}
      />
    </IonPage>
  );
}
