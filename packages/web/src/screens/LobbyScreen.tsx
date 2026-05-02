import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../auth/authStore';
import { send } from '../hooks/useGameSocket';
import { ARENAS } from '@sudoku-fighting/shared';
import { fadeOutMusic } from '../audio/audioManager';
import ArenaCarousel from '../components/lobby/ArenaCarousel';

interface Props { active: boolean; }

export default function LobbyScreen({ active }: Props) {
  const mySeat = useGameStore(s => s.mySeat);
  const myCharacter = useGameStore(s => s.myCharacter);
  const myName = useGameStore(s => s.myName);
  const myUseAlt = useGameStore(s => s.myUseAlt);
  const characters = useGameStore(s => s.characters);
  const opponentCharacter = useGameStore(s => s.opponentCharacter);
  const opponentUseAlt = useGameStore(s => s.opponentUseAlt);
  const lobbyOpponentReady = useGameStore(s => s.lobbyOpponentReady);
  const shareCode = useGameStore(s => s.shareCode);
  const gameMode = useGameStore(s => s.gameMode);
  const setPreferredArena = useGameStore(s => s.setPreferredArena);
  const lobbyCountdown = useGameStore(s => s.lobbyCountdown);
  const setLobbyCountdown = useGameStore(s => s.setLobbyCountdown);
  const backgroundId = useGameStore(s => s.backgroundId);
  const wsConnected = useGameStore(s => s.wsConnected);

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [arenaIndex, setArenaIndex] = useState(0);
  const canNativeShare =
    typeof navigator !== 'undefined' &&
    !!navigator.share &&
    (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
  const hasSentJoin = useRef(false);
  const screenRef = useRef<HTMLDivElement>(null);

  const isPrivate = gameMode === 'friend';

  const myChar = characters.find(c => c.id === myCharacter);
  const oppChar = characters.find(c => c.id === opponentCharacter);

  // Send join/create once when screen becomes active AND socket is connected.
  // Watching both ensures we don't silently drop the message if the socket
  // connects after the lobby screen activates (e.g. on a slow mobile connection).
  useEffect(() => {
    if (!active || !wsConnected || hasSentJoin.current) return;
    hasSentJoin.current = true;

    const storedName = myName ?? 'Player';
    const charId = myCharacter ?? 'fighter1';

    const userId = useAuthStore.getState().user?.id;
    if (gameMode === 'quick') {
      send('find_match', { characterId: charId, name: storedName, preferredArenaId: useGameStore.getState().preferredArenaId, userId });
    } else if (gameMode === 'friend') {
      // Check if we have a pending join code
      const st = useGameStore.getState() as never as { pendingJoinCode?: string };
      const pending = (st as { pendingJoinCode?: string }).pendingJoinCode;
      if (pending) {
        useGameStore.setState({ pendingJoinCode: null } as never);
        send('join_room', { shareCode: pending, characterId: charId, name: storedName, userId });
      } else {
        send('create_room', { characterId: charId, name: storedName, userId });
        // Send initial arena preference so the server has it before P2 joins
        send('set_arena_preference', { arenaId: ARENAS[arenaIndex].id });
      }
    }
  }, [active, wsConnected]);

  // Reset scroll position to top whenever the screen becomes active
  useEffect(() => {
    if (active) screenRef.current?.scrollTo(0, 0);
  }, [active]);

  // Reset hasSentJoin when screen deactivates OR socket drops while in lobby.
  // If the socket drops, the server deletes the room; re-sending create_room on
  // reconnect gets a fresh share code so the UI shows again.
  useEffect(() => {
    if (!active || !wsConnected) hasSentJoin.current = false;
  }, [active, wsConnected]);

  // Sync arena carousel to the server-chosen arena when countdown starts
  useEffect(() => {
    if (lobbyCountdown === 3 && backgroundId) {
      const idx = ARENAS.findIndex(a => a.id === backgroundId);
      if (idx !== -1) setArenaIndex(idx);
    }
  }, [lobbyCountdown, backgroundId]);

  // Tick the countdown down each second
  useEffect(() => {
    if (lobbyCountdown === null || lobbyCountdown <= 0) return;
    const timer = setTimeout(() => setLobbyCountdown(lobbyCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [lobbyCountdown]);

  // When countdown hits 0, switch to gameplay and fire the pre-round signal.
  // Only fade out music on the first round (currentScreen !== 'gameplay'). For
  // rounds 2+ the fight music is already playing and we don't want to stop it.
  useEffect(() => {
    if (lobbyCountdown === 0) {
      setLobbyCountdown(null);
      if (useGameStore.getState().currentScreen !== 'gameplay') {
        fadeOutMusic(800);
      }
      const { roundNumber, backgroundId: bgId } = useGameStore.getState();
      useGameStore.setState({
        currentScreen: 'gameplay',
        preRoundSignal: bgId
          ? { roundNumber: roundNumber ?? 1, backgroundId: bgId, nonce: Date.now() }
          : null,
      });
    }
  }, [lobbyCountdown]);

  async function handleShareInvite() {
    // On Capacitor iOS the origin is capacitor://localhost (not shareable).
    // Use the production URL so the invite link actually opens in a browser.
    const origin = Capacitor.isNativePlatform() ? 'https://sudokufighting.com' : window.location.origin;
    const url = `${origin}?room=${shareCode}`;
    if (canNativeShare) {
      try {
        await navigator.share({ title: 'Sudoku Fighting', text: 'Come fight me in Sudoku Fighting! Join my room:', url });
      } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  }

  async function handleShareGame() {
    const url = Capacitor.isNativePlatform() ? 'https://sudokufighting.com' : window.location.origin;
    if (canNativeShare) {
      try {
        await navigator.share({ title: 'Sudoku Fighting', text: 'Play Sudoku Fighting — real-time competitive puzzle battles. Challenge a friend:', url });
      } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  }

  // Default to P1 while waiting for seat assignment from server (create_room doesn't
  // immediately send player_joined — it only arrives once both players are in the room)
  const myP1 = mySeat === null ? true : mySeat === 0;

  function getPortrait(char: typeof myChar, useAlt: boolean) {
    if (!char) return '/characters/placeholder_fighter.svg';
    return useAlt && char.altPortraitPath ? char.altPortraitPath : char.portraitPath;
  }

  const p1CharName = (myP1 ? myChar : oppChar)?.name;
  const p2CharName = (!myP1 ? myChar : oppChar)?.name;

  return (
    <div ref={screenRef} id="screen-lobby" className={`screen${active ? ' active' : ''}`}>
      <div className="lobby-players">
        <div id="lobby-p1" className={`lobby-player${myP1 ? ' is-me' : ''}`}>
          <span className="lobby-player-label">P1</span>
          <img
            id="lobby-p1-portrait"
            src={getPortrait(myP1 ? myChar : oppChar, myP1 ? myUseAlt : opponentUseAlt)}
            alt=""
          />
          <span className="lobby-player-name">{p1CharName ?? '—'}</span>
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
          <span className="lobby-player-name">{p2CharName ?? '—'}</span>
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
          <span className="lobby-share-label">
            {copyFeedback ? 'LINK COPIED!' : 'INVITE CODE'}
          </span>
          <div className="lobby-invite-row">
            <span className="lobby-share-code">{shareCode}</span>
            <button className="btn btn-sm btn-secondary" onClick={handleShareInvite}>
              {canNativeShare ? 'INVITE' : 'COPY LINK'}
            </button>
          </div>
        </div>
      ) : !isPrivate ? (
        <div className="lobby-promo">
          <button className="btn btn-sm btn-secondary" onClick={handleShareGame}>
            {canNativeShare ? 'SHARE' : 'SHARE GAME'}
          </button>
          <p className={`lobby-promo-feedback${copyFeedback ? ' visible' : ''}`}>
            Link copied!
          </p>
        </div>
      ) : null}

      <ArenaCarousel
        arenaIndex={arenaIndex}
        onIndexChange={(i) => { setArenaIndex(i); setPreferredArena(ARENAS[i].id); }}
        sendToServer={gameMode === 'quick' || gameMode === 'friend'}
        disabled={lobbyCountdown !== null}
      />

      {lobbyCountdown !== null && lobbyCountdown > 0 && (
        <div className="lobby-countdown">
          <span className="lobby-countdown-number">{lobbyCountdown}</span>
        </div>
      )}
    </div>
  );
}
