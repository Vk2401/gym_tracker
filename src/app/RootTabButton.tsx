import { IonTabButton } from '@ionic/react';
import type { ComponentPropsWithoutRef } from 'react';
import { useLocation } from 'react-router-dom';

type Props = ComponentPropsWithoutRef<typeof IonTabButton>;

/**
 * PD-17: a tab tap opens the tab's root screen. IonTabBar hands each button the URL last
 * shown in that tab, so switching back would reopen an old detail screen; this button
 * swaps that for the root. The active tab keeps the current URL, so tapping it still
 * resets it to the root (Ionic's own behaviour).
 */
export function RootTabButton(props: Props) {
  const { pathname, search } = useLocation();
  const root = `/${props.tab}`;
  const href = props.href === pathname + search ? props.href : root;
  return <IonTabButton {...props} href={href} />;
}
/** IonTabBar only manages children that are tab buttons. */
RootTabButton.isTabButton = true;
