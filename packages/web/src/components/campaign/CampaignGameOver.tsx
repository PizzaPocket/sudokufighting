import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { buildCampaignStartQueue } from '../../ai/useCampaign';
import { fadeOutMusic } from '../../audio/audioManager';

export default function CampaignGameOver() {
  const myCharacter = useGameStore(s => s.myCharacter);
  const myUseAlt = useGameStore(s => s.myUseAlt);
  const characters = useGameStore(s => s.characters);
  const resetAll = useGameStore(s => s.resetAll);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  function resolveCharId() {
    if (!myCharacter) return null;
    if (!myUseAlt) return myCharacter;
    const char = characters.find(c => c.id === myCharacter);
    return char?.altId ?? myCharacter;
  }

  const resolvedCharId = resolveCharId();

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
    <div className={`campaign-gameover-overlay${visible ? ' visible' : ''}`}>
      {resolvedCharId && (
        <img
          className="gameover-character"
          src={`/characters/${resolvedCharId}/ko_frame2.svg`}
          alt=""
        />
      )}
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
  );
}
