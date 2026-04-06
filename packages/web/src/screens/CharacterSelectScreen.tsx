import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Character, Difficulty } from '@sudoku-fighting/shared';
import { buildCampaignStartQueue } from '../ai/useCampaign';

interface Props { active: boolean; }

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'extreme'];

export default function CharacterSelectScreen({ active }: Props) {
  const characters = useGameStore(s => s.characters);
  const unlockedCharacterIds = useGameStore(s => s.unlockedCharacterIds);
  const setCharacters = useGameStore(s => s.setCharacters);
  const selectCharacter = useGameStore(s => s.selectCharacter);
  const setScreen = useGameStore(s => s.setScreen);
  const gameMode = useGameStore(s => s.gameMode);
  const spDifficulty = useGameStore(s => s.spDifficulty);
  const setSpDifficulty = useGameStore(s => s.setSpDifficulty);

  const [selected, setSelected] = useState<string | null>(null);
  const [cardsReady, setCardsReady] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);

  const isCampaign = gameMode === 'campaign';

  // Load characters once
  useEffect(() => {
    if (characters.length > 0) return;
    fetch(`/characters/characters.json?v=${Date.now()}`)
      .then(r => r.json())
      .then((chars: Character[]) => setCharacters(chars))
      .catch(() => {});
  }, [characters.length, setCharacters]);

  // Trigger card-appear animation each time screen becomes active
  useEffect(() => {
    if (!active) { setCardsReady(false); return; }
    setSelected(null);
    const t = setTimeout(() => setCardsReady(true), 50);
    return () => clearTimeout(t);
  }, [active]);

  function handleSelectChar(char: Character) {
    setSelected(char.id);
    selectCharacter(char.id);
    if (isCampaign) return; // Wait for Continue button
    const nextScreen =
      gameMode === 'practice' ? 'practice-lobby' : 'lobby';
    setScreen(nextScreen);
  }

  function handleContinue() {
    if (!selected) return;
    const queue = buildCampaignStartQueue(selected, characters);
    useGameStore.setState({ campaignDialogueQueue: queue } as never);
    setScreen('campaign-dialogue');
  }

  const visibleChars = characters.filter(c => unlockedCharacterIds.includes(c.id));

  return (
    <div
      id="screen-character-select"
      ref={screenRef}
      className={`screen${active ? ' active' : ''}${cardsReady ? ' cards-ready' : ''}${isCampaign ? ' campaign-select' : ''}`}
    >
      <div className="char-select-scroll">
        {isCampaign && (
          <div className="campaign-difficulty-selector">
            <span className="start-mode-label">DIFFICULTY</span>
            <div className="sp-difficulty-btns">
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  className={`btn btn-sm btn-secondary sp-diff-btn${spDifficulty === d ? ' selected' : ''}`}
                  onClick={() => setSpDifficulty(d)}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="subtitle">Choose your fighter</p>
        <div id="character-grid">
          {visibleChars.map((char, i) => (
            <button
              key={char.id}
              className={`character-card card-intro${selected === char.id ? ' selected' : ''}`}
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => handleSelectChar(char)}
            >
              <img src={char.portraitPath} alt={char.name} draggable={false} />
              <span className="char-name">{char.name}</span>
            </button>
          ))}
        </div>

        {isCampaign && (
          <button
            className="btn btn-alt campaign-continue-btn"
            disabled={!selected}
            onClick={handleContinue}
          >
            CONTINUE
          </button>
        )}
      </div>
    </div>
  );
}
