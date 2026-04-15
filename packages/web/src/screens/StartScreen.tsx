import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';


interface Props { active: boolean; entering?: boolean; }

export default function StartScreen({ active, entering }: Props) {
  const setScreen = useGameStore(s => s.setScreen);
  const setGameMode = useGameStore(s => s.setGameMode);
  const lobbyJoinError = useGameStore(s => s.lobbyJoinError);
  const setScoreboardOpen = useGameStore(s => s.setScoreboardOpen);

  const joinCodeRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Pre-fill room code from ?room=CODE URL param on first mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code && joinCodeRef.current) {
      joinCodeRef.current.value = code.toUpperCase();
    }
  }, []);

  const errorMsg = localError ?? lobbyJoinError;

  function goToCharacterSelect(mode: 'quick' | 'friend' | 'practice' | 'campaign') {
    setGameMode(mode);
    useGameStore.setState({ lobbyJoinError: null });
    setLocalError(null);
    setScreen('character-select');
  }

  function handleJoinRoom() {
    const code = joinCodeRef.current?.value.trim().toUpperCase() ?? '';
    if (code.length < 4) {
      setLocalError('Enter a valid room code.');
      return;
    }
    setLocalError(null);
    useGameStore.setState({ lobbyJoinError: null, pendingJoinCode: code } as never);
    goToCharacterSelect('friend');
  }

  return (
    <div id="screen-start" className={`screen${active ? ' active' : ''}${entering ? ' entering' : ''}`}>
      <div className="start-bg" />
      <div className="start-logo-container">
        <img
          className="start-logo-top"
          src="/assets/ui/Logo1_Sudoku.svg"
          alt="Sudoku"
        />
        <img
          className="start-logo-bottom"
          src="/assets/ui/Logo2_Fighting.svg"
          alt="Fighting"
        />
      </div>

      <div className="start-actions">
        <div className="start-section">
          <span className="start-mode-label">2 PLAYER ONLINE</span>
          <span className="start-action-hint">Enter matchmaking queue</span>
          <button className="btn" onClick={() => goToCharacterSelect('quick')}>
            QUICK PLAY
          </button>
          <span className="start-action-hint">Play with a friend</span>
          <button className="btn btn-secondary" onClick={() => goToCharacterSelect('friend')}>
            CREATE ROOM
          </button>
          <div className="combo-input">
            <input
              ref={joinCodeRef}
              className="combo-text"
              type="text"
              maxLength={8}
              placeholder="Room code"
              onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
            />
            <button id="btn-join-room" onClick={handleJoinRoom}>JOIN</button>
          </div>
        </div>

        <div className="start-divider" />

        <div className="start-section">
          <span className="start-mode-label">SINGLE PLAYER</span>
          <button className="btn btn-alt" onClick={() => goToCharacterSelect('campaign')}>
            CAMPAIGN
          </button>
          <button className="btn btn-secondary" onClick={() => goToCharacterSelect('practice')}>
            PRACTICE
          </button>
          <button className="btn btn-secondary" onClick={() => setScoreboardOpen(true)}>
            LEADERBOARD
          </button>
        </div>

        <p className={`start-error${errorMsg ? ' visible' : ''}`}>{errorMsg ?? '\u00A0'}</p>
      </div>
    </div>
  );
}
