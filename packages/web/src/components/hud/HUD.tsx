import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import HealthBar from './HealthBar';
import RoundTimer from './RoundTimer';
import ScoreDisplay from './ScoreDisplay';

export default function HUD() {
  const { t } = useTranslation('ui');
  const myName = useGameStore(s => s.myName);
  const opponentName = useGameStore(s => s.opponentName);
  const myCharacter = useGameStore(s => s.myCharacter);
  const opponentCharacter = useGameStore(s => s.opponentCharacter);
  const mySeat = useGameStore(s => s.mySeat);
  const health = useGameStore(s => s.health);
  const combo = useGameStore(s => s.combo);
  const roundNumber = useGameStore(s => s.roundNumber);
  const roundWins = useGameStore(s => s.roundWins);

  const p1CharId = mySeat === 0 ? myCharacter : opponentCharacter;
  const p2CharId = mySeat === 0 ? opponentCharacter : myCharacter;
  const p1RawName = mySeat === 0 ? myName : opponentName;
  const p2RawName = mySeat === 0 ? opponentName : myName;
  const p1Name = p1CharId ? t('characters:' + p1CharId, { defaultValue: p1RawName }) : p1RawName;
  const p2Name = p2CharId ? t('characters:' + p2CharId, { defaultValue: p2RawName }) : p2RawName;

  const roundDots = (wins: number) => '● '.repeat(wins).trim() || '';

  return (
    <div id="hud">
      <div className="hud-name-row">
        <span id="p1-name" className={`hud-name${mySeat === 0 ? ' is-me' : ''}`}>
          <span className="hud-name-text">{p1Name ?? 'P1'}</span>
        </span>
        <span id="round-indicator" className="round-label">ROUND {roundNumber}</span>
        <span id="p2-name" className={`hud-name right${mySeat === 1 ? ' is-me' : ''}`}>
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
          <ScoreDisplay seat={0} id="p1-score" />
          <span className="combo-counter" id="p1-combo">
            {combo[0] > 1 ? `${combo[0]}× COMBO!` : ''}
          </span>
        </div>

        <RoundTimer />

        <div className="hud-sub-right">
          <span className="combo-counter" id="p2-combo">
            {combo[1] > 1 ? `${combo[1]}× COMBO!` : ''}
          </span>
          <ScoreDisplay seat={1} id="p2-score" />
        </div>
      </div>
    </div>
  );
}
