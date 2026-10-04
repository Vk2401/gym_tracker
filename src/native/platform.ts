import { Capacitor } from '@capacitor/core';

/** True when running inside the iOS/Android shell (bridge injected into the hosted page). */
export const isNative = (): boolean => Capacitor.isNativePlatform();
export const platform = (): 'ios' | 'android' | 'web' =>
  Capacitor.getPlatform() as 'ios' | 'android' | 'web';
export const isPluginAvailable = (name: string): boolean => Capacitor.isPluginAvailable(name);
