import {
  IonButton,
  IonContent,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonPage,
} from '@ionic/react';
import { PlusIcon } from 'lucide-react';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { mutate } from '@/db/mutate';
import type { Equipment } from '@/db/models';
import * as lib from '@/db/repos/library';
import { useDialogs } from '@/hooks/useDialogs';
import { useLive } from '@/hooks/useLive';
import { useFeedback } from '@/hooks/useFeedback';

/** ST-4: add, rename, delete equipment types. "None" is fixed. */
export default function EquipmentPage() {
  const { data: list = [] } = useLive(lib.listEquipment, []);
  const { promptName, confirmDelete } = useDialogs();
  const { error } = useFeedback();
  const taken = (name: string, except?: string) =>
    list.some(
      (e) => e.id !== except && e.name.toLocaleLowerCase('en') === name.toLocaleLowerCase('en'),
    );

  const create = async () => {
    const name = await promptName({ header: 'New Equipment' });
    if (!name) return;
    if (taken(name)) return error(`Equipment called "${name}" already exists.`);
    await mutate((db) => lib.createEquipment(db, name));
  };
  const rename = async (e: Equipment) => {
    if (e.id === 'eq-none') return;
    const name = await promptName({ header: 'Rename Equipment', value: e.name });
    if (!name) return;
    if (taken(name, e.id)) return error(`Equipment called "${name}" already exists.`);
    await mutate((db) => lib.renameEquipment(db, e.id, name));
  };
  const remove = async (e: Equipment) => {
    if (await confirmDelete(e.name, "Exercises using it will show None. This can't be undone.")) {
      await mutate((db) => lib.deleteEquipment(db, e.id));
    }
  };

  return (
    <IonPage>
      <PageHeader
        title="Equipment"
        back={{ href: '/settings', text: 'Settings' }}
        end={
          <IonButton aria-label="Add equipment" onClick={() => void create()}>
            <Icon slot="icon-only" icon={PlusIcon} />
          </IonButton>
        }
      />
      <IonContent>
        <IonList inset>
          {list.map((e) => (
            <IonItemSliding key={e.id} disabled={e.id === 'eq-none'}>
              <IonItem button={e.id !== 'eq-none'} detail={false} onClick={() => void rename(e)}>
                <IonLabel className="truncate">{e.name}</IonLabel>
              </IonItem>
              <IonItemOptions side="end">
                <IonItemOption color="danger" onClick={() => void remove(e)}>
                  Delete
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
}
