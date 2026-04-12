import React from 'react';
import { useGameStore } from '../../store/gameStore';
import HealthBar from './HealthBar';
import RoundTimer from './RoundTimer';
import ScoreDisplay from './ScoreDisplay';

export default function HUD() {
  const myName = useGameStore(s => s.myName);
  const opponentName = useGameStore(s => s.opponentName);
  const mySeat = useGameStore(s => s.mySeat);
  const health = useGameStore(s => s.health);
  const combo = useGameStore(s => s.combo);
  const roundNumber = useGameStore(s => s.roundNumber);
  const roundWins = useGameStore(s => s.roundWins);

  const p1Name = mySeat === 0 ? myName : opponentName;
  const p2Name = mySeat === 0 ? opponentName : myName;

  const roundDots = (wins: number) => '● '.repeat(wins).trim() || '';

  return (
    <div id="hud">
      <div className="hud-name-row">
        <span id="p1-name" className="hud-name">
          <span className="hud-name-text">{p1Name ?? 'P1'}</span>
          {mySeat === 0 && <span className="hud-me-arrow hud-me-arrow-p1">&#9668;</span>}
        </span>
        <span id="round-indicator" className="round-label">ROUND {roundNumber}</span>
        <span id="p2-name" className="hud-name right">
          {mySeat === 1 && <span className="hud-me-arrow hud-me-arrow-p2">&#9658;</span>}
          <span className="hud-name-text">{p2Name ?? 'P2'}</span>
        </span>
      </div>

      <div className="hud-bar-row">
        <HealthBar hp={health[0]} side="left" id="p1-health-bar" />
        <div className="ko-block">KO</div>
        <HealthBar hp={health[1]} side="right" id="p2-health-bar" />
      </div>

      <div className="hud-sub-row">
        <div className="hud-sub-left">
          <ScoreDisplay seat={mySeat === 0 ? 0 : 1} id="p1-score" />
          <span className="combo-counter" id="p1-combo">
            {combo[0] > 1 ? `${combo[0]}× COMBO!` : ''}
          </span>
        </div>

        <RoundTimer />

        <div className="hud-sub-right">
          <span className="combo-counter" id="p2-combo">
            {combo[1] > 1 ? `${combo[1]}× COMBO!` : ''}
          </span>
          <ScoreDisplay seat={mySeat === 0 ? 1 : 0} id="p2-score" />
        </div>
      </div>
    </div>
  );
}
