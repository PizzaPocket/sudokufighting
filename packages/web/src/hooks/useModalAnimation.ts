import { useEffect, useState } from 'react';

const CLOSE_MS = 160;
const isMobileSheet = () => window.matchMedia('(max-width: 600px)').matches;

/**
 * Manages rendered/closing state for modal sheet animations.
 *
 * Closing behaviour:
 *  - Mobile (≤600px), normal close: sheet slides down over CLOSE_MS, then unmounts.
 *  - Wide screen, normal close: instant unmount — no slide animation exists.
 *  - Sheet-to-sheet navigation: always instant regardless of screen size.
 *    Pass `instant = true` (via the authStore `switching` flag) so the outgoing
 *    sheet unmounts immediately and the incoming one appears without any gap or
 *    overlapping animation. This is the contract for all inter-sheet transitions.
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
