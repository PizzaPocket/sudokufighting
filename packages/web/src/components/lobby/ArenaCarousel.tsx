import React from 'react';
import { ARENAS } from '@sudoku-fighting/shared';
import { send } from '../../hooks/useGameSocket';

interface Props {
  arenaIndex: number;
  onIndexChange: (i: number) => void;
  sendToServer?: boolean;
}

export default function ArenaCarousel({ arenaIndex, onIndexChange, sendToServer }: Props) {
  const arena = ARENAS[arenaIndex % ARENAS.length];

  function prev() {
    const next = ((arenaIndex - 1) + ARENAS.length) % ARENAS.length;
    onIndexChange(next);
    if (sendToServer) send('set_arena_preference', { arenaId: ARENAS[next].id });
  }

  function next() {
    const n = (arenaIndex + 1) % ARENAS.length;
    onIndexChange(n);
    if (sendToServer) send('set_arena_preference', { arenaId: ARENAS[n].id });
  }

  return (
    <div className="lobby-arena-picker">
      <span className="settings-label" style={{ color: '#ffffff' }}>ARENA</span>
      <div className="track-carousel">
        <button className="btn-utility carousel-btn" onClick={prev}>‹</button>
        <span className="track-title">{arena.name}</span>
        <button className="btn-utility carousel-btn" onClick={next}>›</button>
      </div>
    </div>
  );
}
