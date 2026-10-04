import { IonButton, useIonRouter } from '@ionic/react';
import { TimerIcon } from 'lucide-react';
import { Icon } from '@/components/Icon';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { formatCountdown, remainingSeconds, restProgress } from '@/domain/session';
import { formatElapsed } from '@/domain/duration';
import { MSG_EXTRA } from '@/domain/messages';

const RING = 2 * Math.PI * 18; // rest ring circumference (r = 18)
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

/** The session in progress (SS-3): id, name and start time, refreshed after every write. */
function useActiveSession() {
  const logId = useSessionStore((s) => s.logId);
  const version = useDataStore((s) => s.version);
  const [info, setInfo] = useState<{ name: string; startUtc: string } | null>(null);
  useEffect(() => {
    if (!logId) return;
    void getLog(getDb(), logId).then((l) =>
      setInfo(l ? { name: l.name, startUtc: l.startUtc } : null),
    );
  }, [logId, version]);
  return logId ? { logId, info } : null;
}

/** Ticking session clock in its own component, so only this text re-renders each second. */
function Elapsed({ startUtc }: { startUtc: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="num">{formatElapsed(startUtc, now)}</span>;
}

function ResumeContent({ name, startUtc }: { name: string; startUtc?: string }) {
  return (
    <>
      <span className="gt-resume__icon">
        <Icon icon={TimerIcon} />
      </span>
      <span className="gt-resume__text">
        <small>{MSG_EXTRA.workoutInProgress}</small>
        <strong>
          {name}
          {startUtc && (
            <>
              {' · '}
              <Elapsed startUtc={startUtc} />
            </>
          )}
        </strong>
      </span>
      <span className="gt-resume__cta">Resume</span>
    </>
  );
}

/** SS-3 on the Workouts screen: inline navy card under the search (design "Workouts"). */
export function ResumeCard() {
  const s = useActiveSession();
  const router = useIonRouter();
  if (!s) return null;
  return (
    <button
      type="button"
      className="gt-resume gt-resume--card"
      onClick={() => router.push(`/logs/${s.logId}`, 'forward')}
    >
      <span className="gt-glow" aria-hidden="true" />
      <ResumeContent name={s.info?.name ?? ''} startUtc={s.info?.startUtc} />
    </button>
  );
}

/** SS-3 on the other tabs: the same card floating above the tab bar. */
function ResumeBanner() {
  const s = useActiveSession();
  const { pathname } = useLocation();
  const router = useIonRouter();
  if (!s || pathname === `/logs/${s.logId}` || pathname === '/workouts') return null;
  return (
    <button
      type="button"
      className="gt-resume"
      onClick={() => router.push(`/logs/${s.logId}`, 'forward')}
    >
      <ResumeContent name={s.info?.name ?? ''} startUtc={s.info?.startUtc} />
    </button>
  );
}

function RestTimerBar() {
  const end = useSessionStore((s) => s.restEndUtc);
  const total = useSessionStore((s) => s.restTotalS);
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
      <svg className="gt-rest__ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r="18" className="gt-rest__track" />
        <circle
          cx="22"
          cy="22"
          r="18"
          className="gt-rest__progress"
          style={{ strokeDashoffset: RING * (1 - restProgress(left, total)) }}
        />
      </svg>
      <span className="gt-rest__text">
        <span className="gt-rest__label">Rest</span>
        <span className="gt-rest__time num">{formatCountdown(left)}</span>
      </span>
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
