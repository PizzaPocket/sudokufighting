import { useCallback, useEffect, useRef, useState } from 'react';

const DISMISS_PX  = 100;   // drag distance to trigger dismiss
const DISMISS_VEL = 0.5;   // px/ms — fast flick also dismisses

/**
 * Adds swipe-down-to-dismiss to a mobile bottom sheet.
 *
 * Returns:
 *  - sheetRef   — attach to the .modal-sheet element
 *  - handleProps — spread onto the .modal-sheet-handle drag-handle element
 *  - swipeOut   — pass as the `instant` arg to useModalAnimation so the sheet
 *                  unmounts immediately after the swipe animation finishes
 *                  (prevents the normal slide-down from playing on top)
 */
export function useSwipeToDismiss(onClose: () => void) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [swipeOut, setSwipeOut] = useState(false);
  const drag = useRef({ startY: 0, startTime: 0, active: false });

  useEffect(() => {
    if (swipeOut) onClose();
  }, [swipeOut, onClose]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!window.matchMedia('(max-width: 600px)').matches) return;
    drag.current = { startY: e.touches[0].clientY, startTime: Date.now(), active: true };
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!drag.current.active) return;
    const dy = e.touches[0].clientY - drag.current.startY;
    if (dy <= 0) return;
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    const dy  = e.changedTouches[0].clientY - drag.current.startY;
    const vel = dy / (Date.now() - drag.current.startTime);
    const el  = sheetRef.current;

    if (dy > DISMISS_PX || vel > DISMISS_VEL) {
      if (el) {
        el.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 1, 1)';
        el.style.transform  = 'translateY(110%)';
        el.addEventListener('transitionend', () => setSwipeOut(true), { once: true });
      } else {
        setSwipeOut(true);
      }
    } else {
      if (el) {
        el.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        el.style.transform  = '';
        el.addEventListener('transitionend', () => { el.style.transition = ''; }, { once: true });
      }
    }
  }, []);

  return {
    sheetRef,
    swipeOut,
    handleProps: { onTouchStart, onTouchMove, onTouchEnd } as React.HTMLAttributes<HTMLDivElement>,
  };
}
