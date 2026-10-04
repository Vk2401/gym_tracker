import { IonButton, useIonRouter } from '@ionic/react';
import { TimerIcon } from 'lucide-react';
import { Icon } from '@/components/Icon';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { formatCountdown, remainingSeconds } from '@/domain/session';
import { successHaptic } from '@/native/haptics';
import { beep } from '@/native/sound';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';
import { getDb } from '@/db/client';
import { getLog } from '@/db/repos/logs';
import { useDataStore } from '@/store/dataStore';
import './BottomBars.css';

/**
 * SS-1 rest-timer bar and SS-3 resume banner, stacked above the tab bar on every tab. Their
 * height is published as --gt-bottom-stack so content and footers stay clear of them.
 */
export function BottomBars() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty('--gt-bottom-stack', `${el.offsetHeight}px`);
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    apply();
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="gt-bottom-stack hide-on-keyboard">
      <ResumeBanner />
      <RestTimerBar />
    </div>
  );
}

function ResumeBanner() {
  const logId = useSessionStore((s) => s.logId);
  const version = useDataStore((s) => s.version);
  const { pathname } = useLocation();
  const router = useIonRouter();
  const [name, setName] = useState('');
  useEffect(() => {
    if (!logId) return;
    void getLog(getDb(), logId).then((l) => setName(l?.name ?? ''));
  }, [logId, version]);
  if (!logId || pathname === `/logs/${logId}`) return null;
  return (
    <button
      type="button"
      className="gt-resume"
      onClick={() => router.push(`/logs/${logId}`, 'forward')}
    >
      <span className="gt-resume__icon">
        <Icon icon={TimerIcon} />
      </span>
      <span className="gt-resume__text truncate">
        <small>Workout in progress</small>
        <strong className="truncate">{name}</strong>
      </span>
      <span className="gt-resume__cta">Resume</span>
    </button>
  );
}

function RestTimerBar() {
  const end = useSessionStore((s) => s.restEndUtc);
  const [left, setLeft] = useState(() => (end ? remainingSeconds(end) : 0));
  useEffect(() => {
    if (!end) return;
    // Time-based: recomputed from the stored end time, so throttling never makes it drift.
    const tick = () => {
      const r = remainingSeconds(end);
      setLeft(r);
      if (r === 0) {
        const prefs = useAppStore.getState().prefs;
        if (document.visibilityState === 'visible') {
          if (prefs?.sound) beep();
          void successHaptic(prefs?.haptics ?? true);
        }
        void useSessionStore.getState().skipRest();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [end]);
  if (!end || left <= 0) return null;
  const s = useSessionStore.getState();
  return (
    <div
      className="gt-rest"
      role="timer"
      aria-live="off"
      aria-label={`Rest ${formatCountdown(left)}`}
    >
      <span className="gt-rest__label">Rest</span>
      <span className="gt-rest__time num">{formatCountdown(left)}</span>
      <IonButton
        size="small"
        fill="clear"
        aria-label="Subtract 15 seconds"
        onClick={() => void s.adjustRest(-15)}
      >
        −15 s
      </IonButton>
      <IonButton
        size="small"
        fill="clear"
        aria-label="Add 15 seconds"
        onClick={() => void s.adjustRest(15)}
      >
        +15 s
      </IonButton>
      <IonButton className="gt-rest__skip" size="small" onClick={() => void s.skipRest()}>
        Skip
      </IonButton>
    </div>
  );
}
