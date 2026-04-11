import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { FloatingPointsEvent } from '../../store/gameStore';

function getCellPosition(seat: 0 | 1, row?: number, col?: number): { x: number; y: number } {
  if (row != null && col != null) {
    const gridId = seat === 0 ? 'p1-grid' : 'p2-grid';
    const cell = document.querySelector(`#${gridId} [data-row="${row}"][data-col="${col}"]`);
    if (cell) {
      const rect = cell.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }
  // Fallback
  return {
    x: window.innerWidth / 2 + (seat === 0 ? -200 : 200),
    y: window.innerHeight * 0.4,
  };
}

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

  const { x, y } = getCellPosition(event.seat, event.row, event.col);

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
