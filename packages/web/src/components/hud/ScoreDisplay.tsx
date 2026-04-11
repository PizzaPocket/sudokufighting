import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

interface Props {
  seat: 0 | 1;
  id: string;
}

export default function ScoreDisplay({ seat, id }: Props) {
  const score = useGameStore(s => s.score[seat]);
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef(0);
  const displayedRef = useRef(0);

  useEffect(() => {
    targetRef.current = score;
    if (rafRef.current) return;

    function animate() {
      const diff = targetRef.current - displayedRef.current;
      if (Math.abs(diff) < 1) {
        displayedRef.current = targetRef.current;
        setDisplayed(targetRef.current);
        rafRef.current = null;
        return;
      }
      const next = Math.round(displayedRef.current + diff * 0.07);
      displayedRef.current = next;
      setDisplayed(next);
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [score]);

  return (
    <span className="hud-score" id={id}>
      {displayed} PTS
    </span>
  );
}
