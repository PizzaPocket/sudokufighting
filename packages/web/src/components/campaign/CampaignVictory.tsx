import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CREDITS, CREDITS_SCROLL_DURATION_MS } from '../../creditsContent';
import { switchToSelectMusic, SELECT_TRACK_INDEX } from '../../audio/audioManager';

type Phase = 'credits' | 'unlocks';

export default function CampaignVictory() {
  const pendingUnlockIds = useGameStore(s => s.pendingUnlockIds);
  const characters = useGameStore(s => s.characters);
  const resetAll = useGameStore(s => s.resetAll);
  const [phase, setPhase] = useState<Phase>('credits');

  useEffect(() => {
    const t = setTimeout(() => setPhase('unlocks'), CREDITS_SCROLL_DURATION_MS + 500);
    return () => clearTimeout(t);
  }, []);

  const unlockChars = pendingUnlockIds
    .map(id => characters.find(c => c.id === id))
    .filter(Boolean) as typeof characters;

  const unlockCount = unlockChars.length;
  const headerText = unlockCount === 0
    ? 'Campaign Complete!'
    : `${unlockCount} New Fighter${unlockCount > 1 ? 's' : ''} Unlocked!`;

  return (
    <div className="campaign-victory-overlay">
      {phase === 'credits' && (
        <div
          className="credits-scroll"
          style={{ animationDuration: `${CREDITS_SCROLL_DURATION_MS}ms` }}
        >
            {CREDITS.map((line, i) => {
            if (line.type === 'logo') return (
              <div key={i} className="credits-logo">
                <img src="/assets/ui/Logo1_Sudoku.svg" alt="Sudoku" />
                <img src="/assets/ui/Logo2_Fighting.svg" alt="Fighting" />
              </div>
            );
            if (line.type === 'spacer') return <div key={i} className="credits-spacer" />;
            if (line.type === 'name') return <div key={i} className="credits-name">{line.text}</div>;
            return <div key={i} className="credits-body">{line.text}</div>;
          })}
        </div>
      )}

      {phase === 'unlocks' && (
        <div className="unlock-screen">
          <div className="unlock-header">{headerText}</div>
          {unlockChars.length > 0 && (
            <div className="unlock-cards">
              {unlockChars.map((char, i) => (
                <div
                  key={char.id}
                  className="unlock-card"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  <img src={char.portraitPath} alt={char.name} />
                  <span className="unlock-card-name">{char.name}</span>
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-alt" onClick={() => { switchToSelectMusic(); useGameStore.setState({ selectedTrackIndex: SELECT_TRACK_INDEX } as never); resetAll(); }}>
            CONTINUE
          </button>
        </div>
      )}
    </div>
  );
}
