import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Character } from '@sudoku-fighting/shared';

interface Props { active: boolean; }

export default function CharacterSelectScreen({ active }: Props) {
  const characters = useGameStore(s => s.characters);
  const setCharacters = useGameStore(s => s.setCharacters);
  const selectCharacter = useGameStore(s => s.selectCharacter);
  const setScreen = useGameStore(s => s.setScreen);
  const gameMode = useGameStore(s => s.gameMode);
  const [selected, setSelected] = useState<string | null>(null);
  const [cardsReady, setCardsReady] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);

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
    const nextScreen = gameMode === 'singleplayer' ? 'sp-lobby' : 'lobby';
    setScreen(nextScreen);
  }

  return (
    <div
      id="screen-character-select"
      ref={screenRef}
      className={`screen${active ? ' active' : ''}${cardsReady ? ' cards-ready' : ''}`}
    >
      <div className="char-select-scroll">
        <p className="subtitle">Choose your fighter</p>
        <div id="character-grid">
          {characters.map((char, i) => (
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
      </div>
    </div>
  );
}
