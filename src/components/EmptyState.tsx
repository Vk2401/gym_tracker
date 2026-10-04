import { IonButton, IonIcon } from '@ionic/react';
import './EmptyState.css';

interface Props {
  icon: string;
  message: string;
  action?: string;
  onAction?: () => void;
}

/** BRD §14: every empty screen says what to do next. Copy comes from domain/messages. */
export function EmptyState({ icon, message, action, onAction }: Props) {
  return (
    <div className="gt-empty" role="status">
      <IonIcon icon={icon} aria-hidden="true" className="gt-empty__icon" />
      <p className="gt-empty__message">{message}</p>
      {action && onAction && (
        <IonButton shape="round" onClick={onAction}>
          {action}
        </IonButton>
      )}
    </div>
  );
}
