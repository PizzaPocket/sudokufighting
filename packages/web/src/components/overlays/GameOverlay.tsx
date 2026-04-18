import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { send } from '../../hooks/useGameSocket';
import { startVsAIRound } from '../../ai/useVsAI';
import {
  playRoundAnnouncer, playFightAnnouncer,
  playKOAnnouncer, playTKOAnnouncer,
  playVictoryAnnouncer, playDevastationAnnouncer,
  startFightMusic, fadeOutMusic, getSelectedTrackIndex,
  switchToSelectMusic, SELECT_TRACK_INDEX,
} from '../../audio/audioManager';
import { useAuthStore } from '../../auth/authStore';
import { recordMatch, setPendingMatch, type RecordMatchInput } from '../../stats/statsService';

interface OverlayContent {
  main: string;
  sub: string;
  mainColor: string;
  mainShadow?: string;
  subColor?: string;
  nonce: number;
}

function charName(charId: string | null, characters: Array<{ id: string; name: string }>) {
  return characters.find(c => c.id === charId)?.name ?? null;
}

export default function GameOverlay() {
  const preRoundSignal = useGameStore(s => s.preRoundSignal);
  const roundOver = useGameStore(s => s.roundOver);
  const matchOver = useGameStore(s => s.matchOver);
  const mySeat = useGameStore(s => s.mySeat);
  const matchWinnerSeat = useGameStore(s => s.matchWinnerSeat);
  const opponentDisconnected = useGameStore(s => s.opponentDisconnected);
  const gameMode = useGameStore(s => s.gameMode);
  const resetAll = useGameStore(s => s.resetAll);

  const user = useAuthStore(s => s.user);
  const openSignIn = useAuthStore(s => s.openSignIn);

  const [overlay, setOverlay] = useState<OverlayContent | null>(null);
  const [showButtons, setShowButtons] = useState(false);
  const [hidden, setHidden] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mainRef = useRef<HTMLDivElement>(null);
  // Wall-clock time when round 1 started — used to compute match duration
  const matchStartTimeRef = useRef<number | null>(null);

  function clearTimers() {
    timers.current.forEach(t => clearTimeout(t));
    timers.current = [];
  }

  function addTimer(fn: () => void, ms: number) {
    timers.current.push(setTimeout(fn, ms));
  }

  // Cancel pending timers on unmount so stale startVsAIRound calls
  // from a previous fight don't fire into the next fight's state.
  useEffect(() => () => clearTimers(), []);

  function showOverlay(content: OverlayContent) {
    setOverlay(content);
    setHidden(false);
    if (mainRef.current) {
      mainRef.current.style.animation = 'none';
      void mainRef.current.offsetWidth;
      mainRef.current.style.animation = '';
    }
  }

  function hideOverlay() {
    setHidden(true);
  }

  // Pre-round sequence: ROUND X (2s) → FIGHT! (1s) → hide
  const preRoundNonce = preRoundSignal?.nonce;
  useEffect(() => {
    if (!preRoundSignal) return;
    clearTimers();
    setShowButtons(false);

    const { roundNumber, backgroundId } = preRoundSignal;
    if (roundNumber === 1) matchStartTimeRef.current = Date.now();
    playRoundAnnouncer(roundNumber);
    showOverlay({
      main: `ROUND ${roundNumber}`,
      sub: '',
      mainColor: 'var(--accent)',
      nonce: preRoundSignal.nonce,
    });

    addTimer(() => {
      playFightAnnouncer();
      if (roundNumber === 1) {
        startFightMusic(backgroundId);
        useGameStore.setState({ selectedTrackIndex: getSelectedTrackIndex() } as never);
      }
      showOverlay({
        main: 'FIGHT!',
        sub: '',
        mainColor: '#dc2626',
        mainShadow: '4px 5px 0 #FF8B16',
        nonce: preRoundSignal.nonce + 0.5,
      });
      addTimer(() => hideOverlay(), 1000);
    }, 2000);
  }, [preRoundNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // Round-end overlay: KO / TKO / TIE
  useEffect(() => {
    if (!roundOver || matchOver) return;
    clearTimers();

    addTimer(() => {
      const st = useGameStore.getState();
      const winner = st.roundWinnerSeat ?? -1;

      if (winner === -1) {
        showOverlay({ main: 'TIE', sub: "IT'S A TIE", mainColor: '#8B49FF', nonce: Date.now() });
      } else {
        const isTrueKO = st.health[(1 - winner) as 0|1] <= 0;
        const winnerCharId = winner === st.mySeat ? st.myCharacter : st.opponentCharacter;
        const wName = charName(winnerCharId, st.characters) ?? (winner === st.mySeat ? st.myName : st.opponentName) ?? 'Player';
        if (isTrueKO) playKOAnnouncer(); else playTKOAnnouncer();
        showOverlay({ main: isTrueKO ? 'KO' : 'TKO', sub: wName.toUpperCase() + ' WINS!', mainColor: '#F00013', nonce: Date.now() });
      }

      addTimer(() => {
        if (useGameStore.getState().matchOver) return;
        hideOverlay();
        const cur = useGameStore.getState();
        if (cur.gameMode === 'practice' || cur.gameMode === 'campaign') {
          startVsAIRound(cur.roundNumber + 1);
        } else {
          send('next_round', {});
        }
      }, 2500);
    }, 400);
  }, [roundOver]); // eslint-disable-line react-hooks/exhaustive-deps

  // Match-end overlay: VICTORY / DEVASTATION
  useEffect(() => {
    if (!matchOver || matchWinnerSeat === null) return;
    clearTimers();
    setShowButtons(false);

    addTimer(() => {
      const st = useGameStore.getState();
      const isTie = matchWinnerSeat === -1;
      const isWinner = !isTie && matchWinnerSeat === mySeat;
      const result: 'win' | 'loss' | 'tie' = isTie ? 'tie' : isWinner ? 'win' : 'loss';

      // Record match stats (fire-and-forget).
      // Campaign runs are recorded once at full campaign victory in useCampaign.ts.
      if (st.mySeat !== null && st.myCharacter && st.gameMode !== 'campaign') {
        const matchInput: RecordMatchInput = {
          gameMode:      st.gameMode ?? 'quick',
          result,
          characterId:   st.myCharacter,
          opponentName:  st.opponentName,
          score:         st.score[st.mySeat],
          difficulty:    null,
          matchDurationMs: matchStartTimeRef.current ? Date.now() - matchStartTimeRef.current : 0,
        };
        if (useAuthStore.getState().user) {
          recordMatch(matchInput);
        } else {
          setPendingMatch(matchInput);
        }
      }

      if (isTie) {
        showOverlay({ main: 'TIE', sub: "IT'S A TIE", mainColor: '#8B49FF', nonce: Date.now() });
        setShowButtons(true);
        return;
      }

      const winnerCharId = matchWinnerSeat === st.mySeat ? st.myCharacter : st.opponentCharacter;
      const winnerName = charName(winnerCharId, st.characters) ?? st.matchWinnerName ?? 'Unknown';
      const winnerDisplayName = opponentDisconnected
        ? 'OPPONENT DISCONNECTED'
        : winnerName.toUpperCase() + ' WINS!';

      if (isWinner) {
        playVictoryAnnouncer();
        showOverlay({
          main: 'VICTORY!',
          sub: winnerDisplayName,
          mainColor: '#FF8B16',
          mainShadow: '4px 5px 0 #8B49FF',
          subColor: '#FFCA00',
          nonce: Date.now(),
        });
      } else {
        if (!opponentDisconnected) playDevastationAnnouncer();
        showOverlay({
          main: 'DEVASTATION!',
          sub: winnerDisplayName,
          mainColor: '#F00013',
          mainShadow: '4px 5px 0 #FF8B16',
          nonce: Date.now(),
        });
      }
      // Campaign: show CONTINUE button on win, auto-hide on loss (useCampaign shows game over)
      if (useGameStore.getState().gameMode === 'campaign') {
        if (isWinner) {
          setShowButtons(true); // CONTINUE rendered below
        } else {
          addTimer(() => hideOverlay(), 2000);
        }
        return;
      }

      setShowButtons(true);
    }, 400);
  }, [matchOver]); // eslint-disable-line react-hooks/exhaustive-deps

  if (hidden || !overlay) return null;

  return (
    <div className={`game-overlay${hidden ? ' hidden' : ''}`}>
      <div
        ref={mainRef}
        id="game-overlay-main"
        className="overlay-main"
        style={{ color: overlay.mainColor, textShadow: overlay.mainShadow }}
      >
        {overlay.main}
      </div>
      {overlay.sub && (
        <div className="overlay-sub" style={overlay.subColor ? { color: overlay.subColor } : undefined}>
          {overlay.sub}
        </div>
      )}
      {showButtons && (
        <div className="overlay-btn-row">
          {gameMode === 'campaign' && (
            <button
              className="btn"
              onClick={() => {
                setShowButtons(false);
                setHidden(true);
                fadeOutMusic(600);
                setTimeout(() => {
                  useGameStore.setState({ currentScreen: 'campaign-dialogue' } as never);
                }, 600);
              }}
            >
              CONTINUE
            </button>
          )}
          {gameMode === 'practice' && (
            <button
              className="btn"
              onClick={() => {
                useGameStore.setState({ matchOver: false, matchWinnerSeat: null, roundWins: [0, 0] } as never);
                startVsAIRound(1);
                setShowButtons(false);
                setHidden(true);
              }}
            >
              PLAY AGAIN
            </button>
          )}
          {gameMode !== 'campaign' && (
            <button
              className={gameMode === 'practice' ? 'btn btn-secondary' : 'btn'}
              onClick={() => {
                switchToSelectMusic();
                useGameStore.setState({ selectedTrackIndex: SELECT_TRACK_INDEX } as never);
                resetAll();
              }}
            >
              {gameMode === 'practice' ? 'LEAVE' : 'BACK TO MENU'}
            </button>
          )}
          {!user && (
            <button className="btn btn-alt" onClick={openSignIn}>
              SIGN IN / CREATE ACCOUNT
            </button>
          )}
        </div>
      )}
    </div>
  );
}
