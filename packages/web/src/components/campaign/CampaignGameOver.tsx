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
  const [spriteBottom, setSpriteBottom] = useState(0);

  useEffect(() => {
    const el = document.getElementById('fight-stage');
    if (el) {
      const rect = el.getBoundingClientRect();
      // On native iOS (viewport-fit=cover), window.innerHeight includes the
      // home-indicator safe area. Subtract it so the sprite lands at the same
      // visual position as on mobile web.
      const sab = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--sab')
      ) || 0;
      setSpriteBottom(window.innerHeight - rect.bottom - sab);
    }
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

      {/* Layer 2 — duplicate of the fight-characters row, fixed above the
          backdrop. An invisible spacer occupies p2's slot so p1 stays in the
          same horizontal position it held during the fight. */}
      <div className="gameover-sprite-layer" style={{ bottom: spriteBottom }}>
        <div className="fight-characters">
          <CharacterSprite seat={0} id="p1-char-img-go" wrapId="p1-char-wrap-go" />
          <CharacterSprite seat={1} flipped id="p2-char-img-go" wrapId="p2-char-wrap-go" />
        </div>
      </div>

      {/* Layer 3 — title + buttons above sprite (z-700) */}
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
      </div>
    </>
  );
}
