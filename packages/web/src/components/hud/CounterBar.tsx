import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

const DURATION = 1500;

export default function CounterBar() {
  const active = useGameStore(s => s.counterWindowActive);
  const expiry = useGameStore(s => s.counterWindowExpiry);
  const defenderSeat = useGameStore(s => s.counterWindowDefenderSeat);
  const counterLandedNonce = useGameStore(s => s.counterLandedNonce);

  const fillRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [showCounter, setShowCounter] = useState(false);
  const prevNonce = useRef(counterLandedNonce);

  // Animate fill bar via rAF
  useEffect(() => {
    if (!active || expiry == null) {
      cancelAnimationFrame(rafRef.current);
      if (fillRef.current) fillRef.current.style.transform = 'scaleX(1)';
      return;
    }

    const tick = () => {
      const fraction = Math.max(0, (expiry - Date.now()) / DURATION);
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${fraction})`;
      if (fraction > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, expiry]);

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
  // Defender on left (seat 0): bar anchored to left, drains rightward → empty grows on right, bar tip on left (defender's side)
  // Defender on right (seat 1): bar anchored to right, drains leftward → empty grows on left, bar tip on right (defender's side)
  const transformOrigin = defenderSeat === 0 ? 'left' : 'right';

  return (
    <>
      {active && (
        <div className="counter-bar-wrap">
          <div
            ref={fillRef}
            className="counter-bar-fill"
            style={{ background: fillColor, transformOrigin }}
          />
        </div>
      )}
      {showCounter && (
        <div className="counter-bubble">Counter!</div>
      )}
    </>
  );
}
