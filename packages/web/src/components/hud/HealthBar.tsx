import React from 'react';
import { STARTING_HEALTH } from '@sudoku-fighting/shared';

interface Props {
  hp: number;
  side: 'left' | 'right';
  id: string;
}

export default function HealthBar({ hp, side, id }: Props) {
  const pct = Math.max(0, Math.min(100, (hp / STARTING_HEALTH) * 100));
  const cls = pct <= 20 ? 'low' : pct <= 60 ? 'mid' : '';

  return (
    <div className={`hud-bar-track ${side}`}>
      <div
        id={id}
        className={`hud-bar${cls ? ' ' + cls : ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
