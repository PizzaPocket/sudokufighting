import React, { useEffect, useRef, useState } from 'react';
import { ROUND_DURATION_MS } from '@sudoku-fighting/shared';
import { useGameStore } from '../../store/gameStore';

export default function RoundTimer() {
  const roundStartTime = useGameStore(s => s.roundStartTime);
  const roundOver = useGameStore(s => s.roundOver);
  const isPaused = useGameStore(s => s.isPaused);
  const totalPausedMs = useGameStore(s => s.totalPausedMs);
  const [seconds, setSeconds] = useState(99);

  useEffect(() => {
    if (!roundStartTime || roundOver || isPaused) return;

    const pausedMs = totalPausedMs; // capture at effect start; stable during this interval
    const interval = setInterval(() => {
      const elapsed = Date.now() - roundStartTime - pausedMs;
      const remaining = Math.max(0, Math.ceil((ROUND_DURATION_MS - elapsed) / 1000));
      setSeconds(remaining);
    }, 250);

    return () => clearInterval(interval);
  }, [roundStartTime, roundOver, isPaused, totalPausedMs]);

  // Reset display on new round
  useEffect(() => {
    if (roundStartTime) setSeconds(99);
  }, [roundStartTime]);

  const urgent = seconds <= 10;

  return (
    <div id="round-timer" className={`round-timer${urgent ? ' urgent' : ''}`}>
      {String(seconds).padStart(2, '0')}
    </div>
  );
}
