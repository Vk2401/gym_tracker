import { IonButton } from '@ionic/react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import './EmptyState.css';

interface Props {
  icon: LucideIcon;
  message: string;
  action?: string;
  onAction?: () => void;
  /** Centre in the remaining screen height (full-page empty states). */
  fill?: boolean;
  /** Dashed card inside a screen section (design: empty Logs day). */
  card?: boolean;
}

/** BRD §14: every empty screen says what to do next. Copy comes from domain/messages. */
export function EmptyState({ icon, message, action, onAction, fill, card }: Props) {
  return (
    <div
      className={`gt-empty${fill ? ' gt-empty--fill' : ''}${card ? ' gt-empty--card' : ''}`}
      role="status"
    >
      <span className="gt-empty__badge">
        <Icon icon={icon} className="gt-empty__icon" />
      </span>
      <p className="gt-empty__message">{message}</p>
      {action && onAction && <IonButton onClick={onAction}>{action}</IonButton>}
    </div>
  );
}
