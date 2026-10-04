import { useAppStore } from '@/store/appStore';

/**
 * BRD §15 analytics: anonymous and opt-in. Events never carry body weight, measurements,
 * notes or names. No analytics provider is connected yet, so events are kept in a small
 * in-memory buffer (visible in dev tools) until a sink is registered.
 */
export type AnalyticsEvent =
  | 'app_opened'
  | 'template_created'
  | 'session_started'
  | 'set_completed'
  | 'session_finished'
  | 'personal_record_set'
  | 'explore_viewed'
  | 'setting_changed'
  | 'data_exported';

type Props = Record<string, string | number | boolean>;
type Sink = (event: AnalyticsEvent, props: Props) => void;

let sink: Sink | null = null;
export const recentEvents: { event: AnalyticsEvent; props: Props }[] = [];

export function setAnalyticsSink(s: Sink | null): void {
  sink = s;
}

export function track(event: AnalyticsEvent, props: Props = {}): void {
  if (useAppStore.getState().prefs?.analyticsOptIn !== true) return;
  recentEvents.push({ event, props });
  if (recentEvents.length > 200) recentEvents.shift();
  sink?.(event, props);
}

/** session_finished duration band (never the exact duration). */
export function durationBand(minutes: number): string {
  if (minutes < 30) return '<30m';
  if (minutes < 60) return '30-60m';
  if (minutes < 90) return '60-90m';
  if (minutes < 120) return '90-120m';
  return '120m+';
}
