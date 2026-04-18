import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { CAMPAIGN_FIGHTS, ARENAS } from '@sudoku-fighting/shared';
import { fadeOutMusic } from '../audio/audioManager';
import { setupNextFight } from '../ai/useCampaign';
import { startCampaignNextFight } from '../ai/useVsAI';

interface Props { active: boolean; }

export default function CampaignLobbyScreen({ active }: Props) {
  const screenRef = useRef<HTMLDivElement>(null);
  const myCharacter = useGameStore(s => s.myCharacter);
  const characters = useGameStore(s => s.characters);
  const opponentCharacter = useGameStore(s => s.opponentCharacter);
  const opponentName = useGameStore(s => s.opponentName);
  const campaignFightIndex = useGameStore(s => s.campaignFightIndex);

  const myChar = characters.find(c => c.id === myCharacter) ?? null;
  const opponentChar = characters.find(c => c.id === opponentCharacter) ?? null;

  const fight = CAMPAIGN_FIGHTS[campaignFightIndex];
  const arena = ARENAS.find(a => a.id === fight?.arenaId);

  useEffect(() => {
    if (active) screenRef.current?.scrollTo(0, 0);
  }, [active]);

  // Resolve opponent whenever the lobby activates or fight index changes
  useEffect(() => {
    if (!active || !myCharacter || characters.length === 0) return;
    setupNextFight(campaignFightIndex, myCharacter, characters);
  }, [active, myCharacter, characters.length, campaignFightIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart() {
    if (!fight) return;
    fadeOutMusic(800);
    setupNextFight(campaignFightIndex, myCharacter, characters);
    useGameStore.setState({
      mySeat: 0,
      myName: myChar?.name ?? 'Player',
      campaignResult: null,
      currentScreen: 'gameplay',
    } as never);
    startCampaignNextFight();
  }

  return (
    <div ref={screenRef} id="screen-campaign-lobby" className={`screen${active ? ' active' : ''}`}>
      <div className="campaign-lobby-players">
        <div className="lobby-player is-me">
          <img src={myChar?.portraitPath ?? '/characters/placeholder_fighter.svg'} alt="" />
          <span className="lobby-player-name">{myChar?.name ?? '—'}</span>
        </div>

        <span className="lobby-vs">VS</span>

        <div className="lobby-player">
          <img
            className="campaign-opponent-portrait"
            src={opponentChar?.portraitPath ?? '/characters/placeholder_fighter.svg'}
            alt={opponentName ?? 'CPU'}
          />
          <span className="lobby-player-name">{opponentName ?? 'CPU'}</span>
        </div>
      </div>

      <div className="campaign-fight-label">
        FIGHT {campaignFightIndex + 1} — {arena?.name?.toUpperCase() ?? ''}
      </div>

      <button className="btn btn-alt" onClick={handleStart}>
        START!
      </button>
    </div>
  );
}
