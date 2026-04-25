import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { buildCampaignStartQueue } from '../../ai/useCampaign';
import { fadeOutMusic, switchToSelectMusic, SELECT_TRACK_INDEX } from '../../audio/audioManager';
import { preloadArenaAssets } from '../../utils/preloadAssets';
import { CAMPAIGN_FIGHTS } from '@sudoku-fighting/shared';
import CharacterSprite from '../character/CharacterSprite';

export default function CampaignGameOver() {
  const myCharacter = useGameStore(s => s.myCharacter);
  const characters = useGameStore(s => s.characters);
  const p1AnimSignal = useGameStore(s => s.p1AnimSignal);
  const resetAll = useGameStore(s => s.resetAll);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setVisible(true);
      if (p1AnimSignal?.state !== 'ko') {
        useGameStore.setState({ p1AnimSignal: { state: 'ko', nonce: Date.now() } } as never);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTryAgain() {
    if (!myCharacter) return;
    preloadArenaAssets(CAMPAIGN_FIGHTS[0].arenaId);
    const queue = buildCampaignStartQueue(myCharacter, characters);
    fadeOutMusic(400);
    useGameStore.setState({
      campaignFightIndex: 0,
      campaignResult: null,
      campaignDialogueQueue: queue,
      currentScreen: 'campaign-dialogue',
    } as never);
  }

  return (
    <>
      {/* Layer 1 — black backdrop fades to full opacity (z-500) */}
      <div className={`gameover-backdrop${visible ? ' visible' : ''}`} />

      {/* Layer 2 — UI + sprite in vertical flow (z-700) */}
      <div className={`gameover-ui${visible ? ' visible' : ''}`}>
        <div className="gameover-title">GAME OVER</div>
        <div className="overlay-btn-row">
          <button className="btn" onClick={handleTryAgain}>
            TRY AGAIN
          </button>
          <button className="btn btn-secondary" onClick={() => {
            switchToSelectMusic();
            useGameStore.setState({ selectedTrackIndex: SELECT_TRACK_INDEX } as never);
            resetAll();
          }}>
            MAIN MENU
          </button>
        </div>
        <div className="gameover-fighter">
          <CharacterSprite seat={0} id="p1-char-img-go" wrapId="p1-char-wrap-go" showMistakeEffect={false} />
        </div>
      </div>
    </>
  );
}
