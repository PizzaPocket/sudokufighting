import { useEffect, useState } from 'react';

const CLOSE_MS = 160;
const isMobileSheet = () => window.matchMedia('(max-width: 600px)').matches;

/**
 * Manages rendered/closing state for modal exit animations.
 * On mobile (≤600px) the sheet slides down — keep DOM alive for CLOSE_MS
 * so the CSS exit animation plays before unmount.
 * On wide screen there is no movement, so close is instant.
 */
export function useModalAnimation(open: boolean, instant = false) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing]   = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
    } else if (rendered) {
      if (instant || !isMobileSheet()) {
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
