import React, { useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { getArena } from '@sudoku-fighting/shared';
import { useVsAI } from '../ai/useVsAI';
import { useCampaign } from '../ai/useCampaign';
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
import CampaignGameOver from '../components/campaign/CampaignGameOver';
import CampaignVictory from '../components/campaign/CampaignVictory';

interface Props {
  active: boolean;
}

export default function GameplayScreen({ active }: Props) {
  const mySeat = useGameStore(s => s.mySeat);
  const backgroundId = useGameStore(s => s.backgroundId);
  const gameMode = useGameStore(s => s.gameMode);
  const campaignResult = useGameStore(s => s.campaignResult);
  const isPaused = useGameStore(s => s.isPaused);
  const setIsPaused = useGameStore(s => s.setIsPaused);

  const screenRef = useRef<HTMLDivElement>(null);
  useVsAI();
  useCampaign();

  const arena = backgroundId ? getArena(backgroundId) : null;
  const isParadiso = arena?.id === 'bg_2';

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

      {/* HUD */}
      <HUD />

      {/* Arena: two player panels + fight stage */}
      <div id="arena">
        <div id="p1-panel" className={p1PanelClass}>
          <SudokuGrid gridSeat={0} id={p1GridId} />
          {mySeat === 0 && <MobileNumpad />}
        </div>

        <FightStage />

        <div id="p2-panel" className={p2PanelClass}>
          <SudokuGrid gridSeat={1} id={p2GridId} />
          {mySeat === 1 && <MobileNumpad />}
        </div>
      </div>

      {/* Overlays */}
      <AttackFlash />
      <FloatingPoints />
      <GameOverlay />

      {/* Pause overlay */}
      {isPaused && (gameMode === 'practice' || gameMode === 'campaign') && (
        <div className="pause-overlay">
          <div className="pause-dialog">
            <span className="pause-title">PAUSED</span>
            <button className="btn" onClick={() => setIsPaused(false)}>RESUME</button>
          </div>
        </div>
      )}

      {/* Campaign overlays */}
      {gameMode === 'campaign' && campaignResult === 'gameover' && <CampaignGameOver />}
      {gameMode === 'campaign' && campaignResult === 'victory' && <CampaignVictory />}
    </div>
  );
}
