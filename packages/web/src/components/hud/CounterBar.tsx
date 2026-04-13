import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

const DURATION   = 1500;
const DOT_RADIUS = 8;  // half of 16px dot
const BAR_INSET  = 32; // left/right inset of .counter-bar-wrap from its container

export default function CounterBar() {
  const active = useGameStore(s => s.counterWindowActive);
  const expiry = useGameStore(s => s.counterWindowExpiry);
  const defenderSeat = useGameStore(s => s.counterWindowDefenderSeat);
  const counterLandedNonce = useGameStore(s => s.counterLandedNonce);

  const fillRef    = useRef<HTMLDivElement>(null);
  const barWrapRef = useRef<HTMLDivElement>(null);
  const tailDotRef = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number>(0);
  const [showCounter, setShowCounter] = useState(false);
  const prevNonce = useRef(counterLandedNonce);

  // Animate fill bar and tail dot via rAF
  useEffect(() => {
    if (!active || expiry == null) {
      cancelAnimationFrame(rafRef.current);
      if (fillRef.current) fillRef.current.style.transform = 'scaleX(1)';
      return;
    }

    const tick = () => {
      const fraction = Math.max(0, (expiry - Date.now()) / DURATION);
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${fraction})`;
      if (tailDotRef.current && barWrapRef.current) {
        const barW = barWrapRef.current.offsetWidth;
        const offset = `${BAR_INSET + barW * fraction - DOT_RADIUS}px`;
        if (defenderSeat === 0) {
          tailDotRef.current.style.left  = offset;
          tailDotRef.current.style.right = '';
        } else {
          tailDotRef.current.style.right = offset;
          tailDotRef.current.style.left  = '';
        }
      }
      if (fraction > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, expiry, defenderSeat]);

  // "Counter!" bubble when a counter lands
  useEffect(() => {
    if (counterLandedNonce === prevNonce.current) return;
    prevNonce.current = counterLandedNonce;
    setShowCounter(true);
    const t = setTimeout(() => setShowCounter(false), 800);
    return () => clearTimeout(t);
  }, [counterLandedNonce]);

  if (!active && !showCounter) return null;

  // Attacker's color fills the bar; bar drains toward the defender's side
  const attackerSeat = defenderSeat != null ? ((1 - defenderSeat) as 0 | 1) : 0;
  const fillColor = attackerSeat === 0 ? 'var(--p1-color)' : 'var(--p2-color)';
  const transformOrigin = defenderSeat === 0 ? 'left' : 'right';

  // Static target dot — pinned at defender's end of bar (the hit point)
  const targetStyle = {
    background: fillColor,
    left:  defenderSeat === 0 ? `${BAR_INSET - DOT_RADIUS}px` : undefined,
    right: defenderSeat === 1 ? `${BAR_INSET - DOT_RADIUS}px` : undefined,
  };

  return (
    <>
      {active && (
        <>
          <div className="counter-bar-wrap" ref={barWrapRef}>
            <div
              ref={fillRef}
              className="counter-bar-fill"
              style={{ background: fillColor, transformOrigin }}
            />
          </div>
          {/* Moving dot — tracks the depleting tail end of the bar */}
          <div ref={tailDotRef} className="counter-dot" style={{ background: fillColor }} />
          {/* Static dot — pinned at defender's end; tail dot meets it at fraction=0 */}
          <div className="counter-dot" style={targetStyle} />
        </>
      )}
      {showCounter && (
        <div className="counter-bubble">Counter!</div>
      )}
    </>
  );
}
