import React, { useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { getArena } from '@sudoku-fighting/shared';
import { send } from '../hooks/useGameSocket';
import { useVsAI } from '../ai/useVsAI';
import HUD from '../components/hud/HUD';
import FightStage from '../components/character/FightStage';
import SudokuGrid from '../components/grid/SudokuGrid';
import MobileNumpad from '../components/grid/MobileNumpad';
import AttackFlash from '../components/overlays/AttackFlash';
import FloatingPoints from '../components/overlays/FloatingPoints';
import GameOverlay from '../components/overlays/GameOverlay';
import ArenaBackground from '../components/arena/ArenaBackground';
import Birds from '../components/arena/Birds';
import Clouds from '../components/arena/Clouds';

interface Props {
  active: boolean;
}

export default function GameplayScreen({ active }: Props) {
  const mySeat = useGameStore(s => s.mySeat);
  const backgroundId = useGameStore(s => s.backgroundId);
  const matchOver = useGameStore(s => s.matchOver);
  const gameMode = useGameStore(s => s.gameMode);

  const screenRef = useRef<HTMLDivElement>(null);
  useVsAI();

  const arena = backgroundId ? getArena(backgroundId) : null;
  const isParadiso = arena?.id === 'bg_2';

  // p1 grid = seat 0, p2 grid = seat 1 (always)
  const p1GridId = 'p1-grid';
  const p2GridId = 'p2-grid';
  const p1PanelClass = `player-panel${mySeat === 0 ? ' is-me' : ''}`;
  const p2PanelClass = `player-panel${mySeat === 1 ? ' is-me' : ''}`;

  const bgStyle = arena?.background
    ? { backgroundImage: `url(${arena.background})` }
    : undefined;

  if (!active) return null;

  return (
    <div
      id="screen-gameplay"
      ref={screenRef}
      className="screen active"
      style={bgStyle}
    >
      {/* Arena background layers (sun, ground, overlays) */}
      <ArenaBackground />

      {/* Paradiso animated elements */}
      {isParadiso && <Birds containerRef={screenRef as React.RefObject<HTMLElement>} />}
      {isParadiso && <Clouds containerRef={screenRef as React.RefObject<HTMLElement>} />}

      {/* Action bar (settings + surrender) */}
      <div className="action-bar">
        {!matchOver && (
          <button
            id="btn-surrender"
            className="btn btn-secondary"
            onClick={() => {
              if (gameMode === 'singleplayer') {
                const { mySeat: seat } = useGameStore.getState();
                const aiSeat = (1 - (seat ?? 0)) as 0 | 1;
                useGameStore.getState().applyServerMessage({
                  type: 'match_end',
                  payload: {
                    winnerSeat: aiSeat,
                    winnerName: useGameStore.getState().opponentName ?? 'CPU',
                  },
                });
              } else {
                send('surrender', {});
              }
            }}
          >
            SURRENDER
          </button>
        )}
      </div>

      {/* HUD */}
      <HUD />

      {/* Arena: two player panels + fight stage */}
      <div id="arena">
        {/* P1 panel */}
        <div id="p1-panel" className={p1PanelClass}>
          <SudokuGrid gridSeat={0} id={p1GridId} />
        </div>

        {/* Fight stage (center column) */}
        <FightStage />

        {/* P2 panel */}
        <div id="p2-panel" className={p2PanelClass}>
          <SudokuGrid gridSeat={1} id={p2GridId} />
        </div>
      </div>

      {/* Mobile numpad (visible on pointer:coarse devices) */}
      <MobileNumpad />

      {/* Overlays */}
      <AttackFlash />
      <FloatingPoints />
      <GameOverlay />
    </div>
  );
}
