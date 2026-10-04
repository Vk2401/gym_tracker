/**
 * ED-7 / PD-18: an optional tutorial link per exercise (YouTube or any website), opened
 * outside the app. Only web links are accepted, so a saved value can never run script.
 */

/** Normalises what the user typed: '' clears the link; null means it is not a web link. */
export function normalizeTutorialUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text) return '';
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!/^[^.\s]+(\.[^.\s]+)+$/.test(url.hostname)) return null;
  return url.href;
}

/** Short source label shown next to the link: "YouTube" or the site's domain. */
export function tutorialSource(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
  host = host.replace(/^(www|m)\./, '');
  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) {
    return 'YouTube';
  }
  return host;
}
