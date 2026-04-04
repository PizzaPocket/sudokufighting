import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { FloatingPointsEvent } from '../../store/gameStore';

function FloatingPoint({ event }: { event: FloatingPointsEvent }) {
  const removeFloatingPoints = useGameStore(s => s.removeFloatingPoints);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onEnd = () => removeFloatingPoints(event.id);
    el.addEventListener('animationend', onEnd, { once: true });
    return () => el.removeEventListener('animationend', onEnd);
  }, [event.id, removeFloatingPoints]);

  // Position over the center of the screen — we don't have cell DOM refs here.
  // Use a fixed central position; a proper implementation would pass the cell rect.
  const x = window.innerWidth / 2 + (event.seat === 0 ? -200 : 200);
  const y = window.innerHeight * 0.4;

  return (
    <div
      ref={ref}
      className="floating-points"
      style={{ left: x, top: y }}
    >
      +{event.points}
    </div>
  );
}

export default function FloatingPoints() {
  const events = useGameStore(s => s.floatingPoints);
  return (
    <>
      {events.map(ev => (
        <FloatingPoint key={ev.id} event={ev} />
      ))}
    </>
  );
}
