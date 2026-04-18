import { useEffect, useState } from 'react';

const CLOSE_MS = 160;

/**
 * Manages rendered/closing state for modal exit animations.
 * Keeps the DOM element alive for CLOSE_MS after `open` goes false
 * so CSS exit animations can play before unmount.
 */
export function useModalAnimation(open: boolean, instant = false) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing]   = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
    } else if (rendered) {
      if (instant) {
        setRendered(false);
        setClosing(false);
      } else {
        setClosing(true);
        const t = setTimeout(() => {
          setRendered(false);
          setClosing(false);
        }, CLOSE_MS);
        return () => clearTimeout(t);
      }
    }
  }, [open, instant]);

  return { rendered, closing };
}
