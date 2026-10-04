import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNative, isPluginAvailable } from './platform';

/** WT-6 / WL-9 / ED share: plain text through the system share sheet (PD-13). */
export async function shareText(title: string, text: string): Promise<void> {
  try {
    if (isNative() && isPluginAvailable('Share')) {
      await Share.share({ title, text, dialogTitle: title });
      return;
    }
    if (navigator.share) {
      await navigator.share({ title, text });
      return;
    }
    await navigator.clipboard?.writeText(text);
    alert('Copied to clipboard.');
  } catch {
    /* user cancelled */
  }
}

/**
 * ST-6: shares a generated file (CSV export, backup). Native: written to the cache directory
 * then shared, so it can be saved to Files / iCloud Drive. Web: downloaded.
 */
export async function shareFile(fileName: string, content: string, mime: string): Promise<void> {
  if (isNative() && isPluginAvailable('Filesystem') && isPluginAvailable('Share')) {
    const res = await Filesystem.writeFile({
      path: fileName,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({ title: fileName, url: res.uri, dialogTitle: fileName });
    } catch {
      /* user cancelled */
    }
    return;
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Lets the user pick a file (backup restore) and returns its text, or null when cancelled. */
export function pickTextFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      f.text().then(resolve, () => resolve(null));
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
