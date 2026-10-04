/// <reference types="vite/client" />
declare const __APP_VERSION__: string;
declare module 'jeep-sqlite/loader' {
  export function defineCustomElements(win?: Window): Promise<void>;
}
