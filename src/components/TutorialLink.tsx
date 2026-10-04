import { IonItem, IonLabel, IonNote } from '@ionic/react';
import { ExternalLinkIcon, PlayIcon } from 'lucide-react';
import { TUTORIAL } from '@/domain/messages';
import { tutorialSource } from '@/domain/tutorial';
import { Icon } from './Icon';
import { RowIcon } from './RowIcon';

/**
 * ED-7 / PD-18: opens the exercise's tutorial outside the app. A plain new-window link: the
 * browser opens a tab; the Capacitor shells hand any non-app host to the system browser
 * (YouTube links to the YouTube app), so no native plugin is needed.
 */
export function TutorialLink({ url, compact }: { url: string; compact?: boolean }) {
  const source = tutorialSource(url);
  if (compact) {
    return (
      <a className="gt-tutorial-chip" href={url} target="_blank" rel="noopener noreferrer">
        <Icon icon={PlayIcon} aria-hidden="true" />
        {TUTORIAL.open}
        {source && <span>· {source}</span>}
      </a>
    );
  }
  return (
    <IonItem
      className="gt-tutorial-link"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      detail={false}
      lines="none"
    >
      <RowIcon icon={PlayIcon} tint="red" />
      <IonLabel>{TUTORIAL.open}</IonLabel>
      {source && <IonNote slot="end">{source}</IonNote>}
      <Icon slot="end" icon={ExternalLinkIcon} className="gt-row-chev" aria-hidden="true" />
    </IonItem>
  );
}
