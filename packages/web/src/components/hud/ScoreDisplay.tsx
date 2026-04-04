import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

interface Props {
  seat: 0 | 1;
  id: string;
}

export default function ScoreDisplay({ seat, id }: Props) {
  const score = useGameStore(s => s.score[seat]);
  const [displayed, setDisplayed] = useState(0);
  const raf = useRef<number | null>(null);
  const target = useRef(0);

  useEffect(() => {
    target.current = score;
    if (raf.current) return;

    function animate() {
      const diff = target.current - displayed;
      if (Math.abs(diff) < 1) {
        setDisplayed(target.current);
        raf.current = null;
        return;
      }
      setDisplayed(d => Math.round(d + diff * 0.2));
      raf.current = requestAnimationFrame(animate);
    }

    raf.current = requestAnimationFrame(animate);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [score]);

  return (
    <span className="hud-score" id={id}>
      {displayed} PTS
    </span>
  );
}
