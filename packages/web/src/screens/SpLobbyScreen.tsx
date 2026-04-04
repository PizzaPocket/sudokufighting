import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ARENAS } from '@sudoku-fighting/shared';
import type { Character, Difficulty } from '@sudoku-fighting/shared';
import ArenaCarousel from '../components/lobby/ArenaCarousel';

interface Props { active: boolean; }

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'extreme'];

function pickAICharacter(myCharId: string | null, characters: Character[]): Character | null {
  const others = characters.filter(c => c.id !== myCharId);
  const pool = others.length > 0 ? others : characters;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function SpLobbyScreen({ active }: Props) {
  const spDifficulty = useGameStore(s => s.spDifficulty);
  const setSpDifficulty = useGameStore(s => s.setSpDifficulty);
  const spArenaIndex = useGameStore(s => s.spArenaIndex);
  const setSpArenaIndex = useGameStore(s => s.setSpArenaIndex);
  const myCharacter = useGameStore(s => s.myCharacter);
  const characters = useGameStore(s => s.characters);

  const myChar = characters.find(c => c.id === myCharacter) ?? null;

  // Read from store directly in the lazy initializer so first render is correct
  // (SpLobbyScreen is always mounted but hidden; characters are loaded before it activates)
  const [aiChar, setAiChar] = useState<Character | null>(() => {
    const st = useGameStore.getState();
    return pickAICharacter(st.myCharacter, st.characters);
  });

  const prevActiveRef = useRef(false);
  useEffect(() => {
    if (active && !prevActiveRef.current && characters.length > 0) {
      setAiChar(pickAICharacter(myCharacter, characters));
    }
    prevActiveRef.current = active;
  }, [active, myCharacter, characters]);

  function handleStart() {
    const arenaId = ARENAS[spArenaIndex % ARENAS.length].id;
    // Store opponent identity so useVsAI can read it when constructing game_start
    useGameStore.setState({
      opponentCharacter: aiChar?.id ?? 'fighter2',
      opponentName: aiChar?.name ?? 'CPU',
      myName: myChar?.name ?? 'Player',
      backgroundId: arenaId,
      mySeat: 0,
    } as never);
    // useVsAI (mounted in GameplayScreen) will generate puzzles and dispatch game_start
    useGameStore.setState({ currentScreen: 'gameplay' } as never);
  }

  return (
    <div id="screen-sp-lobby" className={`screen${active ? ' active' : ''}`}>
      <div className="lobby-players">
        <div id="sp-lobby-p1" className="lobby-player is-me">
          <img src={myChar?.portraitPath ?? '/characters/placeholder_fighter.svg'} alt="" />
          <span className="lobby-player-name">{myChar?.name ?? '—'}</span>
        </div>

        <span className="lobby-vs">VS</span>

        <div id="sp-lobby-p2" className="lobby-player">
          <img
            id="sp-lobby-p2-portrait"
            src={aiChar?.portraitPath ?? '/characters/placeholder_fighter.svg'}
            alt={aiChar?.name ?? 'CPU'}
          />
          <span className="lobby-player-name">{aiChar?.name ?? 'CPU'}</span>
        </div>
      </div>

      <div className="sp-difficulty">
        <span className="sp-difficulty-label">DIFFICULTY</span>
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

      <ArenaCarousel
        arenaIndex={spArenaIndex}
        onIndexChange={setSpArenaIndex}
        sendToServer={false}
      />

      <button id="btn-sp-start" className="btn btn-alt" onClick={handleStart}>
        START!
      </button>
    </div>
  );
}
