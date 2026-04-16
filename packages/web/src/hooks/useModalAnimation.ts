import { useEffect, useState } from 'react';

const CLOSE_MS = 280;

/**
 * Manages rendered/closing state for modal exit animations.
 * Keeps the DOM element alive for CLOSE_MS after `open` goes false
 * so CSS exit animations can play before unmount.
 */
export function useModalAnimation(open: boolean) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing]   = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
    } else if (rendered) {
      setClosing(true);
      const t = setTimeout(() => {
        setRendered(false);
        setClosing(false);
      }, CLOSE_MS);
      return () => clearTimeout(t);
    }
  }, [open]);

  return { rendered, closing };
}
