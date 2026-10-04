import { IonModal } from '@ionic/react';
import { ChevronRightIcon, XIcon } from 'lucide-react';
import { useRef } from 'react';
import { useMenuStore } from '@/store/menuStore';
import { Icon } from './Icon';
import { MENU_ICONS } from './menuIcons';
import './ActionMenu.css';

/**
 * Bottom menu of the design ("Create" / "Add to workout"): title with a close button, then
 * options with a tinted icon tile, optional subtitle and a chevron. Slides up as an Ionic
 * modal, so the backdrop, hardware back button and focus handling come for free.
 */
export function ActionMenuHost() {
  const menu = useMenuStore((s) => s.menu);
  const modal = useRef<HTMLIonModalElement>(null);
  const picked = useRef<string | null>(null);
  const close = () => void modal.current?.dismiss();
  return (
    <IonModal
      ref={modal}
      isOpen={menu !== null}
      className="gt-menu"
      onDidDismiss={() => {
        menu?.resolve(picked.current);
        picked.current = null;
        useMenuStore.setState({ menu: null });
      }}
    >
      {menu && (
        <div className="gt-menu__panel" role="dialog" aria-label={menu.header ?? 'Options'}>
          <div className="gt-menu__handle" aria-hidden="true" />
          <div className="gt-menu__head">
            <h2 className="gt-menu__title">{menu.header ?? ''}</h2>
            <button type="button" className="gt-menu__close" aria-label="Close" onClick={close}>
              <Icon icon={XIcon} />
            </button>
          </div>
          <div className="gt-menu__list">
            {menu.options.map((o) => {
              const [icon, tint] = o.icon ? MENU_ICONS[o.icon] : [null, 'blue'];
              const danger = o.role === 'destructive';
              return (
                <button
                  key={o.value}
                  type="button"
                  className={`gt-menu__opt${danger ? ' gt-menu__opt--danger' : ''}`}
                  aria-label={o.text}
                  onClick={() => {
                    picked.current = o.value;
                    close();
                  }}
                >
                  {icon && (
                    <span
                      className={`gt-ico gt-menu__tile gt-ico--${danger ? 'red' : (o.tint ?? tint)}`}
                    >
                      <Icon icon={icon} />
                    </span>
                  )}
                  <span className="gt-menu__text">
                    <span>{o.text}</span>
                    {o.subtitle && <small>{o.subtitle}</small>}
                  </span>
                  {!danger && <Icon icon={ChevronRightIcon} className="gt-menu__chev" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </IonModal>
  );
}
