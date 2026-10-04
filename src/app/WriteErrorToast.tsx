import { useEffect } from 'react';
import { WRITE_ERROR_EVENT } from '@/db/mutate';
import { SAVE_FAILED } from '@/domain/messages';
import { useFeedback } from '@/hooks/useFeedback';

/** NFR-3: any write that could not be saved is reported instead of being lost silently. */
export function WriteErrorToast() {
  const { error } = useFeedback();
  useEffect(() => {
    let last = 0;
    const onError = (e: Event) => {
      console.error('write failed', (e as CustomEvent).detail);
      // one toast per burst of failed writes
      if (Date.now() - last < 2000) return;
      last = Date.now();
      error(SAVE_FAILED);
    };
    window.addEventListener(WRITE_ERROR_EVENT, onError);
    return () => window.removeEventListener(WRITE_ERROR_EVENT, onError);
  }, [error]);
  return null;
}
