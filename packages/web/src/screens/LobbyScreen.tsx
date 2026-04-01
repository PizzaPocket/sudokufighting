import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { send } from '../hooks/useGameSocket';
import { ARENAS } from '@sudoku-fighting/shared';
import ArenaCarousel from '../components/lobby/ArenaCarousel';

interface Props { active: boolean; }

export default function LobbyScreen({ active }: Props) {
  const mySeat = useGameStore(s => s.mySeat);
  const myCharacter = useGameStore(s => s.myCharacter);
  const myName = useGameStore(s => s.myName);
  const myUseAlt = useGameStore(s => s.myUseAlt);
  const characters = useGameStore(s => s.characters);
  const opponentName = useGameStore(s => s.opponentName);
  const opponentCharacter = useGameStore(s => s.opponentCharacter);
  const opponentUseAlt = useGameStore(s => s.opponentUseAlt);
  const lobbyOpponentReady = useGameStore(s => s.lobbyOpponentReady);
  const shareCode = useGameStore(s => s.shareCode);
  const gameMode = useGameStore(s => s.gameMode);
  const preferredArenaId = useGameStore(s => s.preferredArenaId);
  const setPreferredArena = useGameStore(s => s.setPreferredArena);
  const spArenaIndex = useGameStore(s => s.spArenaIndex);
  const setSpArenaIndex = useGameStore(s => s.setSpArenaIndex);

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [arenaIndex, setArenaIndex] = useState(0);
  const hasSentJoin = useRef(false);

  const isPrivate = gameMode === 'friend';
  const title = isPrivate ? 'PRIVATE ROOM' : 'MATCHMAKING';

  const myChar = characters.find(c => c.id === myCharacter);
  const oppChar = characters.find(c => c.id === opponentCharacter);

  // Send join/create once when screen becomes active
  useEffect(() => {
    if (!active || hasSentJoin.current) return;
    hasSentJoin.current = true;

    const storedName = myName ?? 'Player';
    const charId = myCharacter ?? 'fighter1';

    if (gameMode === 'quick') {
      send('find_match', { characterId: charId, name: storedName, preferredArenaId: null });
    } else if (gameMode === 'friend') {
      // Check if we have a pending join code
      const st = useGameStore.getState() as never as { pendingJoinCode?: string };
      const pending = (st as { pendingJoinCode?: string }).pendingJoinCode;
      if (pending) {
        useGameStore.setState({ pendingJoinCode: null } as never);
        send('join_room', { shareCode: pending, characterId: charId, name: storedName });
      } else {
        send('create_room', { characterId: charId, name: storedName });
      }
    }
  }, [active]);

  // Reset hasSentJoin on deactivation
  useEffect(() => {
    if (!active) hasSentJoin.current = false;
  }, [active]);

  function handleCopyLink() {
    const url = `${window.location.origin}?room=${shareCode}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }

  const p1Seat = 0;
  const p2Seat = 1;
  // Default to P1 while waiting for seat assignment from server (create_room doesn't
  // immediately send player_joined — it only arrives once both players are in the room)
  const myP1 = mySeat === null ? true : mySeat === 0;

  function getPortrait(char: typeof myChar, useAlt: boolean) {
    if (!char) return '/characters/placeholder_fighter.svg';
    return useAlt && char.altPortraitPath ? char.altPortraitPath : char.portraitPath;
  }

  return (
    <div id="screen-lobby" className={`screen${active ? ' active' : ''}`}>
      <h1 className="lobby-title">{title}</h1>

      <div className="lobby-players">
        <div id="lobby-p1" className={`lobby-player${myP1 ? ' is-me' : ''}`}>
          <span className="lobby-player-label">P1</span>
          <img
            id="lobby-p1-portrait"
            src={getPortrait(myP1 ? myChar : oppChar, myP1 ? myUseAlt : opponentUseAlt)}
            alt=""
          />
          <span>{myP1 ? (myName ?? '—') : (opponentName ?? '—')}</span>
          <span className={`lobby-status ${(myP1 ? true : lobbyOpponentReady) ? 'ready' : 'waiting'}`}>
            {(myP1 ? true : lobbyOpponentReady) ? 'READY' : 'WAITING...'}
          </span>
        </div>

        <span className="lobby-vs">VS</span>

        <div id="lobby-p2" className={`lobby-player${!myP1 ? ' is-me' : ''}`}>
          <span className="lobby-player-label">P2</span>
          <img
            id="lobby-p2-portrait"
            src={getPortrait(!myP1 ? myChar : oppChar, !myP1 ? myUseAlt : opponentUseAlt)}
            alt=""
          />
          <span>{!myP1 ? (myName ?? '—') : (opponentName ?? '—')}</span>
          <span className={`lobby-status ${(!myP1 ? true : lobbyOpponentReady) ? 'ready' : 'waiting'}`}>
            {(!myP1 ? true : lobbyOpponentReady) ? 'READY' : 'WAITING...'}
          </span>
        </div>
      </div>

      {!lobbyOpponentReady && (
        <p className="lobby-hint">Waiting for opponent…</p>
      )}

      {isPrivate && shareCode ? (
        <div className="lobby-share">
          <span className="lobby-share-label">INVITE CODE</span>
          <div className="lobby-invite-row">
            <span className="lobby-share-code">{shareCode}</span>
            <button className="btn btn-sm btn-secondary" onClick={handleCopyLink}>
              COPY LINK
            </button>
          </div>
          <p className={`lobby-copy-confirm${copyFeedback ? ' visible' : ''}`}>
            Link copied!
          </p>
        </div>
      ) : !isPrivate ? (
        <div className="lobby-promo">
          <button className="btn btn-sm btn-secondary" onClick={handleCopyLink}>
            SHARE GAME
          </button>
          <p className={`lobby-promo-feedback${copyFeedback ? ' visible' : ''}`}>
            Link copied!
          </p>
        </div>
      ) : null}

      <ArenaCarousel
        arenaIndex={arenaIndex}
        onIndexChange={(i) => { setArenaIndex(i); setPreferredArena(ARENAS[i].id); }}
        sendToServer={gameMode === 'quick'}
      />
    </div>
  );
}
