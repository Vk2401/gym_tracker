import { Health } from '@capgo/capacitor-health';
import { isNative, isPluginAvailable, platform } from './platform';

/**
 * ST-5: Apple Health (iOS) / Health Connect (Android) — optional permission to read and write
 * body weight. Writing workout objects is not supported by the plugin yet, so completed
 * sessions are written as exercise time.
 */
export async function healthAvailable(): Promise<boolean> {
  if (!isNative() || !isPluginAvailable('Health')) return false;
  try {
    return (await Health.isAvailable()).available;
  } catch {
    return false;
  }
}

export async function requestHealth(): Promise<boolean> {
  try {
    const r = await Health.requestAuthorization({
      read: ['weight'],
      write: ['weight', 'exerciseTime'],
    });
    return r.writeAuthorized.includes('weight');
  } catch {
    return false;
  }
}

export async function writeBodyWeight(kg: number, atUtc: string): Promise<void> {
  await Health.saveSample({
    dataType: 'weight',
    value: kg,
    unit: 'kilogram',
    startDate: atUtc,
    endDate: atUtc,
  }).catch(() => undefined);
}

export async function writeWorkoutTime(startUtc: string, endUtc: string): Promise<void> {
  const minutes = Math.round((Date.parse(endUtc) - Date.parse(startUtc)) / 60000);
  if (minutes <= 0) return;
  await Health.saveSample({
    dataType: 'exerciseTime',
    value: minutes,
    unit: 'minute',
    startDate: startUtc,
    endDate: endUtc,
  }).catch(() => undefined);
}

export async function latestBodyWeight(): Promise<number | null> {
  try {
    const r = await Health.readSamples({ dataType: 'weight', limit: 1, ascending: false });
    const s = r.samples[0];
    return s ? s.value : null;
  } catch {
    return null;
  }
}

export const healthPlatformName = (): string =>
  platform() === 'android' ? 'Health Connect' : 'Apple Health';
