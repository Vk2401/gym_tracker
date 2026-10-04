// Generates shell/ — the small bundled web dir of the native app. The real app is loaded from
// APP_URL (capacitor.config.ts server.url); shell/ only provides the offline / error page.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const appUrl = process.env.APP_URL ?? 'https://vk2401.github.io/gym_tracker/';
if (!/^https:\/\//.test(appUrl)) throw new Error(`APP_URL must be https: ${appUrl}`);

const offline = readFileSync('shell-src/offline.html', 'utf8').replaceAll('__APP_URL__', appUrl);
mkdirSync('shell', { recursive: true });
writeFileSync('shell/offline.html', offline);
writeFileSync(
  'shell/index.html',
  `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${appUrl}"><title>Gym Tracker</title>`,
);
console.log(`shell/ generated for ${appUrl}`);

// iOS: the hosted app's domain must be an App-Bound Domain so the service worker (offline
// cache) works in WKWebView (capacitor.config.ts ios.limitsNavigationsToAppBoundDomains).
const plist = 'ios/App/App/Info.plist';
if (existsSync(plist)) {
  const host = new URL(appUrl).hostname;
  const src = readFileSync(plist, 'utf8');
  const out = src.replace(
    /(<key>WKAppBoundDomains<\/key>\s*<array>)[\s\S]*?(<\/array>)/,
    `$1\n\t\t<string>${host}</string>\n\t$2`,
  );
  if (out !== src) writeFileSync(plist, out);
}
