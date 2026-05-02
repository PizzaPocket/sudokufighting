import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import ScoreReveal from './ScoreReveal';
import { send } from '../../hooks/useGameSocket';
import { startVsAIRound, startVsAIMatch } from '../../ai/useVsAI';
import {
  playRoundAnnouncer, playFightAnnouncer,
  playKOAnnouncer, playTKOAnnouncer,
  playVictoryAnnouncer, playDevastationAnnouncer,
  startFightMusic, fadeOutMusic, getSelectedTrackIndex,
  switchToSelectMusic, SELECT_TRACK_INDEX,
} from '../../audio/audioManager';
import { CAMPAIGN_FIGHTS } from '@sudoku-fighting/shared';
import { useAuthStore } from '../../auth/authStore';
import { recordMatch, setPendingMatch, type RecordMatchInput } from '../../stats/statsService';

interface OverlayContent {
  main: string;
  sub: string;
  mainColor: string;
  mainShadow?: string;
  subColor?: string;
  nonce: number;
  isVictory?: boolean;
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
  const rematchPending = useGameStore(s => s.rematchPending);
  const rematchOffered = useGameStore(s => s.rematchOffered);
  const rematchCancelled = useGameStore(s => s.rematchCancelled);
  const gameMode = useGameStore(s => s.gameMode);
  const campaignFightIndex = useGameStore(s => s.campaignFightIndex);
  const isFinalCampaignFight = campaignFightIndex === CAMPAIGN_FIGHTS.length - 1;
  const resetAll = useGameStore(s => s.resetAll);

  const user = useAuthStore(s => s.user);
  const openSignIn = useAuthStore(s => s.openSignIn);

  const isFlawlessVictory = useGameStore(s => s.isFlawlessVictory);
  const rawMatchScore = useGameStore(s => s.rawMatchScore);
  const finalMatchScore = useGameStore(s => s.finalMatchScore);

  const [overlay, setOverlay] = useState<OverlayContent | null>(null);
  const [showButtons, setShowButtons] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [campaignExiting, setCampaignExiting] = useState(false);
  const [scoreGlowing, setScoreGlowing] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mainRef = useRef<HTMLDivElement>(null);
  // Wall-clock time when round 1 started — used to compute match duration
  const matchStartTimeRef = useRef<number | null>(null);
  // Snapshot of isFinalCampaignFight at match-end time. useCampaign immediately
  // advances campaignFightIndex to nextIndex on a non-final win, so by the time
  // the buttons render isFinalCampaignFight is already true for the penultimate fight.
  const matchEndWasFinalFight = useRef(false);
  // Track previous matchOver to detect rematch_start (matchOver flips true → false)
  const prevMatchOverRef = useRef(false);

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
    setCampaignExiting(false);
    setScoreGlowing(false);
    if (mainRef.current) {
      mainRef.current.style.animation = 'none';
      void mainRef.current.offsetWidth;
      mainRef.current.style.animation = '';
    }
  }

  function hideOverlay() {
    setHidden(true);
  }

  // When rematch_start is processed, resetForRematch() sets matchOver false while
  // we're still on the overlay. Hide buttons immediately so they don't flash before
  // the incoming game_start triggers the pre-round sequence.
  useEffect(() => {
    if (prevMatchOverRef.current && !matchOver) {
      setShowButtons(false);
    }
    prevMatchOverRef.current = matchOver;
  }, [matchOver]);

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
        showOverlay({ main: isTrueKO ? 'KO' : 'TKO', sub: wName + ' WINS!', mainColor: '#F00013', nonce: Date.now() });
      }

      addTimer(() => {
        const cur = useGameStore.getState();
        // Guard: stop if match is already over (match_end arrived) OR
        // a player already has 2 round wins (defensive in case match_end is delayed).
        if (cur.matchOver || cur.roundWins[0] >= 2 || cur.roundWins[1] >= 2) return;
        hideOverlay();
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
    matchEndWasFinalFight.current = isFinalCampaignFight;

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
        : winnerName + ' WINS!';

      if (isWinner) {
        playVictoryAnnouncer();
        const flawless = useGameStore.getState().isFlawlessVictory;
        const isCampaignFinal = st.gameMode === 'campaign' && isFinalCampaignFight;
        showOverlay({
          main: 'VICTORY!',
          // Campaign final: sub stays empty — overlay exits into credits cinematic
          // and any lingering text would float over the credits scroll.
          sub: isCampaignFinal ? '' : (flawless ? 'Flawless Victory' : winnerDisplayName),
          mainColor: '#FF8B16',
          mainShadow: '4px 5px 0 #8B49FF',
          subColor: flawless ? '#FFD700' : '#FFCA00',
          nonce: Date.now(),
          isVictory: true,
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
      // Campaign: never show manual CTAs — game advances automatically.
      // Final fight win gets the credits cinematic; everything else auto-hides.
      if (useGameStore.getState().gameMode === 'campaign') {
        if (matchEndWasFinalFight.current && isWinner) {
          addTimer(() => setCampaignExiting(true), 2000);
          addTimer(() => hideOverlay(), 9200);
        } else if (!isWinner) {
          // Loss — CampaignGameOver overlay takes over, hide this overlay
          addTimer(() => hideOverlay(), 2000);
        } else {
          // Non-final win — show CONTINUE CTA
          setShowButtons(true);
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
        className={`overlay-main${campaignExiting ? ' campaign-exit' : ''}`}
        style={{ color: overlay.mainColor, textShadow: overlay.mainShadow }}
      >
        {overlay.main}
      </div>
      {overlay.isVictory && !matchEndWasFinalFight.current && !opponentDisconnected ? (
        // Victory: single line combining label + animated score, all in overlay-sub typography.
        // Campaign final fight excluded — score lives in the credits cinematic instead.
        // white-space: nowrap prevents "Flawless: 8,873 PTS" from breaking across lines.
        <div
          className={`overlay-sub${scoreGlowing ? ' overlay-sub--glow' : ''}`}
          style={{ color: '#FFD700', whiteSpace: 'nowrap' }}
        >
          {isFlawlessVictory && 'Flawless: '}
          <ScoreReveal
            rawScore={rawMatchScore}
            finalScore={finalMatchScore}
            isFlawless={isFlawlessVictory}
            onGlow={() => setScoreGlowing(true)}
          />
        </div>
      ) : (overlay.sub ? (
        <div className="overlay-sub" style={overlay.subColor ? { color: overlay.subColor } : undefined}>
          {overlay.sub}
        </div>
      ) : null)}
      {showButtons && (
        <div className="overlay-btn-row">
          {(gameMode === 'quick' || gameMode === 'friend') && rematchCancelled && !opponentDisconnected && (
            <div className="overlay-status">Opponent left</div>
          )}
          {(gameMode === 'quick' || gameMode === 'friend') && rematchOffered && !rematchPending && !rematchCancelled && (
            <div className="overlay-status">Opponent wants a rematch</div>
          )}
          {gameMode === 'campaign' && !matchEndWasFinalFight.current && (
            <button
              className="btn"
              onClick={() => {
                setShowButtons(false);
                setHidden(true);
                fadeOutMusic(600);
                setTimeout(() => {
                  useGameStore.setState({ campaignResult: null, currentScreen: 'campaign-dialogue' } as never);
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
                startVsAIMatch();
                setShowButtons(false);
                setHidden(true);
              }}
            >
              PLAY AGAIN
            </button>
          )}
          {(gameMode === 'quick' || gameMode === 'friend') && !opponentDisconnected && !rematchCancelled && (
            <button
              className="btn"
              disabled={rematchPending}
              onClick={() => {
                useGameStore.setState({ rematchPending: true } as never);
                send('rematch_vote', {});
              }}
            >
              {rematchPending ? 'WAITING…' : 'REMATCH'}
            </button>
          )}
          {gameMode !== 'campaign' && (
            <button
              className={
                (gameMode === 'practice')
                  ? 'btn btn-secondary'
                  : (opponentDisconnected || rematchCancelled)
                    ? 'btn'
                    : 'btn btn-secondary'
              }
              onClick={() => {
                if (gameMode === 'quick' || gameMode === 'friend') send('rematch_cancel', {});
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
