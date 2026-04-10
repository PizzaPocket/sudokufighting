import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { buildCampaignStartQueue } from '../../ai/useCampaign';
import { fadeOutMusic } from '../../audio/audioManager';

export default function CampaignGameOver() {
  const myCharacter = useGameStore(s => s.myCharacter);
  const characters = useGameStore(s => s.characters);
  const p1AnimSignal = useGameStore(s => s.p1AnimSignal);
  const resetAll = useGameStore(s => s.resetAll);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // If the player wasn't truly KO'd (TKO — health never hit 0), trigger the
  // KO animation now so they always collapse at game over.
  useEffect(() => {
    if (p1AnimSignal?.state !== 'ko') {
      useGameStore.setState({ p1AnimSignal: { state: 'ko', nonce: Date.now() } } as never);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTryAgain() {
    if (!myCharacter) return;
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

      {/* Layer 3 — title + buttons sit above the sprite (z-700) */}
      <div className={`gameover-ui${visible ? ' visible' : ''}`}>
        <div className="gameover-title">GAME OVER</div>
        <div className="overlay-btn-row">
          <button className="btn btn-alt" onClick={handleTryAgain}>
            TRY AGAIN
          </button>
          <button className="btn btn-secondary" onClick={() => resetAll()}>
            MAIN MENU
          </button>
        </div>
      </div>
    </>
  );
}
