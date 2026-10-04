import { IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { checkmark } from 'ionicons/icons';
import { CategoryDot } from './CategoryDot';
import { Sheet } from './Sheet';

export interface Option<T extends string> {
  value: T;
  label: string;
  color?: string;
}

/** Single-choice picker (equipment, focus, group, rest time …). */
export function OptionSheet<T extends string>({
  isOpen,
  title,
  options,
  selected,
  onSelect,
  onDismiss,
}: {
  isOpen: boolean;
  title: string;
  options: readonly Option<T>[];
  selected?: T | null;
  onSelect: (v: T) => void;
  onDismiss: () => void;
}) {
  return (
    <Sheet isOpen={isOpen} title={title} onDismiss={onDismiss}>
      <IonList inset>
        {options.map((o) => (
          <IonItem
            key={o.value}
            button
            detail={false}
            onClick={() => {
              onSelect(o.value);
              onDismiss();
            }}
          >
            {o.color && (
              <span slot="start">
                <CategoryDot color={o.color} size={12} />
              </span>
            )}
            <IonLabel className="truncate">{o.label}</IonLabel>
            {selected === o.value && (
              <IonIcon slot="end" icon={checkmark} color="primary" aria-label="Selected" />
            )}
          </IonItem>
        ))}
      </IonList>
    </Sheet>
  );
}
