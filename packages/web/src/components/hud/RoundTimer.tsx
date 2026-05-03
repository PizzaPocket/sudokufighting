import React, { useEffect, useState } from 'react';
import { ROUND_DURATION_MS } from '@sudoku-fighting/shared';
import { useGameStore } from '../../store/gameStore';

export default function RoundTimer() {
  const fightStartTime = useGameStore(s => s.fightStartTime);
  const roundOver = useGameStore(s => s.roundOver);
  const isPaused = useGameStore(s => s.isPaused);
  const totalPausedMs = useGameStore(s => s.totalPausedMs);
  const [seconds, setSeconds] = useState(99);

  useEffect(() => {
    if (!fightStartTime || roundOver || isPaused) return;

    const pausedMs = totalPausedMs;
    const interval = setInterval(() => {
      const elapsed = Date.now() - fightStartTime - pausedMs;
      if (elapsed < 0) { setSeconds(99); return; }
      setSeconds(Math.max(0, Math.ceil((ROUND_DURATION_MS - elapsed) / 1000)));
    }, 250);

    return () => clearInterval(interval);
  }, [fightStartTime, roundOver, isPaused, totalPausedMs]);

  // Reset display on new round
  useEffect(() => { setSeconds(99); }, [fightStartTime]);

  // Force 00 when round ends — resolves race between display interval and round_end dispatch
  useEffect(() => { if (roundOver) setSeconds(0); }, [roundOver]);

  const urgent = seconds <= 10 && !roundOver;

  return (
    <div id="round-timer" className={`round-timer${urgent ? ' urgent' : ''}`}>
      {String(seconds).padStart(2, '0')}
    </div>
  );
}
