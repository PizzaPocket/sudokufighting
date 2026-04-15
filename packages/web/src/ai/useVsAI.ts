// VS AI — wires packages/shared combat engine + bot scheduler into the React game loop.
// All round state lives here (not in Zustand) so the pure engine functions work without
// touching any DOM or React.

import { useEffect, useRef } from 'react';
import {
  generatePuzzle,
  handleCellInput, applyDamageFromAttack, applyCounterDamage,
  buildCellQueue, scheduleNext,
  STARTING_HEALTH, ATTACK_DELAY_MS, DIFFICULTY_CONFIG,
  CAMPAIGN_FIGHTS, getCampaignFightConfig,
  ROUND_DURATION_MS,
} from '@sudoku-fighting/shared';
import type { RoundState, Difficulty, BotCell, BotSession, DifficultyConfig } from '@sudoku-fighting/shared';
import { injectServerMessage } from '../hooks/useGameSocket';
import { useGameStore } from '../store/gameStore';

// ---------------------------------------------------------------------------
// Module-level callbacks
// ---------------------------------------------------------------------------

export let vsAiPlayerMove: ((row: number, col: number, value: number) => void) | null = null;

let _stopCallback: (() => void) | null = null;

/** Stop the bot immediately — call before dispatching match_end on surrender. */
export function stopVsAI() {
  _stopCallback?.();
}

let _startRoundCallback: ((roundNumber: number) => void) | null = null;

export function startVsAIRound(roundNumber: number) {
  _startRoundCallback?.(roundNumber);
}

let _startCampaignFightCallback: (() => void) | null = null;

export function startCampaignNextFight() {
  _startCampaignFightCallback?.();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEmptyRoundState(): RoundState {
  return {
    puzzles: [
      { given: [], solution: [], playerGrid: [], correctCount: 0 },
      { given: [], solution: [], playerGrid: [], correctCount: 0 },
    ],
    health: [STARTING_HEALTH, STARTING_HEALTH],
    combo: [0, 0],
    consecutiveCorrect: [0, 0],
    lastCorrectTime: [null, null],
    score: [0, 0],
    pendingAttacks: [],
    counterWindows: [
      { active: false, expiry: null },
      { active: false, expiry: null },
    ],
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVsAI() {
  const gameMode = useGameStore(s => s.gameMode);
  const currentScreen = useGameStore(s => s.currentScreen);

  const roundState = useRef<RoundState>(makeEmptyRoundState());
  const attackTimers = useRef<Map<string, { handle: ReturnType<typeof setTimeout>; fireAt: number }>>(new Map());
  const pausedAttacks = useRef<Map<string, number>>(new Map()); // attackId → remaining ms
  const botQueue = useRef<BotCell[]>([]);
  const botSession = useRef<BotSession>({ stopped: true, timeouts: new Set() });
  const localRoundWins = useRef<[number, number]>([0, 0]);
  const replenishRef = useRef<((q: BotCell[]) => void) | null>(null);
  const campaignCfgRef = useRef<DifficultyConfig | null>(null);

  function clearAllTimers() {
    for (const { handle } of attackTimers.current.values()) clearTimeout(handle);
    attackTimers.current.clear();
    pausedAttacks.current.clear();
    for (const t of botSession.current.timeouts) clearTimeout(t);
    botSession.current.stopped = true;
    botSession.current.timeouts.clear();
  }

  function dispatchRoundEnd(winnerSeat: 0 | 1 | -1) {
    clearAllTimers();
    if (winnerSeat !== -1) {
      localRoundWins.current[winnerSeat]++;
    }
    const roundWins: [number, number] = [...localRoundWins.current] as [number, number];

    injectServerMessage({ type: 'round_end', payload: { winnerSeat, roundWins, roundNumber: useGameStore.getState().roundNumber } });

    if (localRoundWins.current[0] >= 2 || localRoundWins.current[1] >= 2) {
      const matchWinner = localRoundWins.current[0] >= 2 ? 0 : 1;
      const winnerName = matchWinner === 0
        ? (useGameStore.getState().myName ?? 'Player')
        : (useGameStore.getState().opponentName ?? 'CPU');
      setTimeout(() => {
        injectServerMessage({ type: 'match_end', payload: { winnerSeat: matchWinner as 0|1, winnerName } });
      }, 200);
    }
  }

  function checkRoundEnd() {
    const h = roundState.current.health;
    if (h[0] <= 0 || h[1] <= 0) {
      const winner: 0 | 1 | -1 = h[0] <= 0 && h[1] <= 0 ? -1 : h[0] <= 0 ? 1 : 0;
      dispatchRoundEnd(winner);
      return true;
    }
    return false;
  }

  function scheduleAttack(attackId: string, delay: number) {
    const fireAt = Date.now() + delay;
    const handle = setTimeout(() => {
      attackTimers.current.delete(attackId);
      const result = applyDamageFromAttack(roundState.current, attackId);
      if (!result) return;
      for (const ev of result.events) injectServerMessage(ev);
      checkRoundEnd();
    }, delay);
    attackTimers.current.set(attackId, { handle, fireAt });
  }

  function processMove(seat: 0 | 1, row: number, col: number, value: number) {
    const difficulty = useGameStore.getState().spDifficulty as Difficulty;
    const wrongGuessDamage = DIFFICULTY_CONFIG[difficulty]?.wrongGuessDamage;
    const events = handleCellInput(roundState.current, seat, row, col, value, wrongGuessDamage);
    for (const ev of events) {
      injectServerMessage(ev);
      if (ev.type === 'attack_incoming') {
        scheduleAttack(ev.payload.attackId, ev.payload.delayMs);
      }
      if (ev.type === 'auto_counter') {
        const t = attackTimers.current.get(ev.payload.attackId);
        if (t) { clearTimeout(t.handle); attackTimers.current.delete(ev.payload.attackId); }
        const result = applyCounterDamage(roundState.current, ev.payload.attackId);
        if (result) { for (const counterEv of result.events) injectServerMessage(counterEv); }
      }
      if (ev.type === 'puzzle_complete') {
        setTimeout(() => dispatchRoundEnd(seat as 0 | 1), 200);
      }
    }
    checkRoundEnd();
  }

  function startRound(roundNumber: number) {
    clearAllTimers();

    const playerPuz = generatePuzzle();
    const aiPuz = generatePuzzle();

    const rs = makeEmptyRoundState();
    rs.puzzles[0] = {
      given: playerPuz.puzzle.map(r => [...r]),
      solution: playerPuz.solution.map(r => [...r]),
      playerGrid: playerPuz.puzzle.map(r => r.map(v => v)),
      correctCount: 0,
    };
    rs.puzzles[1] = {
      given: aiPuz.puzzle.map(r => [...r]),
      solution: aiPuz.solution.map(r => [...r]),
      playerGrid: aiPuz.puzzle.map(r => r.map(v => v)),
      correctCount: 0,
    };
    roundState.current = rs;

    const st = useGameStore.getState();
    const difficulty = st.spDifficulty as Difficulty;
    const gMode = st.gameMode;
    const arenaId = st.backgroundId ?? 'bg_1';
    const myChar = st.myCharacter ?? 'fighter1';
    const aiChar = st.opponentCharacter ?? 'fighter2';
    const myName = st.myName ?? 'Player';
    const aiName = st.opponentName ?? 'CPU';
    const opponentUseAlt = st.opponentUseAlt ?? false;

    // Per-fight config in campaign mode
    const cfg = (gMode === 'campaign')
      ? getCampaignFightConfig(difficulty, st.campaignFightIndex)
      : null;
    campaignCfgRef.current = cfg;

    injectServerMessage({
      type: 'game_start',
      payload: {
        roundNumber,
        puzzle: playerPuz.puzzle,
        solution: playerPuz.solution,
        opponentGivens: aiPuz.puzzle,
        opponentName: aiName,
        opponentCharacter: aiChar,
        mySeat: 0,
        myUseAlt: false,
        opponentUseAlt,
        roundStartTime: Date.now() + 3000,
        backgroundId: arenaId,
      },
    });

    botSession.current = { stopped: false, timeouts: new Set() };
    botQueue.current = buildCellQueue(rs.puzzles[1], difficulty);

    function replenish(queue: BotCell[]) {
      const inQueue = new Set(queue.map(c => `${c.row}-${c.col}`));
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (rs.puzzles[1].playerGrid[r][c] === null && !inQueue.has(`${r}-${c}`)) {
            const val = rs.puzzles[1].solution[r][c];
            if (val != null) {
              queue.unshift({ row: r, col: c, value: val as number });
              inQueue.add(`${r}-${c}`);
            }
          }
        }
      }
    }

    replenishRef.current = replenish;

    const startDelay = 3000;
    const startTimer = setTimeout(() => {
      botSession.current.timeouts.delete(startTimer as unknown as number);
      scheduleNext(botQueue.current, botSession.current, difficulty, (r, c, v) => {
        processMove(1, r, c, v);
      }, replenish, campaignCfgRef.current ?? undefined);
    }, startDelay);
    botSession.current.timeouts.add(startTimer as unknown as number);

    const roundTimer = setTimeout(() => {
      botSession.current.timeouts.delete(roundTimer as unknown as number);
      const h = roundState.current.health;
      const winner: 0 | 1 | -1 = h[0] > h[1] ? 0 : h[1] > h[0] ? 1 : -1;
      dispatchRoundEnd(winner);
    }, startDelay + ROUND_DURATION_MS);
    botSession.current.timeouts.add(roundTimer as unknown as number);
  }

  useEffect(() => {
    if ((gameMode !== 'practice' && gameMode !== 'campaign') || currentScreen !== 'gameplay') return;

    vsAiPlayerMove = (row, col, value) => processMove(0, row, col, value);
    _stopCallback = clearAllTimers;
    _startRoundCallback = startRound;
    _startCampaignFightCallback = () => {
      localRoundWins.current = [0, 0];
      clearAllTimers();
      startRound(1);
    };

    localRoundWins.current = [0, 0];
    startRound(1);

    return () => {
      vsAiPlayerMove = null;
      _stopCallback = null;
      _startRoundCallback = null;
      _startCampaignFightCallback = null;
      clearAllTimers();
    };
  }, [gameMode, currentScreen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to isPaused — pause/resume bot
  useEffect(() => {
    if ((gameMode !== 'practice' && gameMode !== 'campaign') || currentScreen !== 'gameplay') return;

    let prevPaused = useGameStore.getState().isPaused;
    const unsub = useGameStore.subscribe((s) => {
      const isPaused = s.isPaused;
      if (isPaused === prevPaused) return;
      prevPaused = isPaused;
      if (isPaused) {
        // Save remaining time for each in-flight attack so they can be
        // rescheduled on resume rather than lost entirely.
        const now = Date.now();
        for (const [id, { handle, fireAt }] of attackTimers.current) {
          clearTimeout(handle);
          pausedAttacks.current.set(id, Math.max(0, fireAt - now));
        }
        attackTimers.current.clear();
        for (const t of botSession.current.timeouts) clearTimeout(t);
        botSession.current.stopped = true;
        botSession.current.timeouts.clear();
      } else {
        // Reschedule attacks that were in-flight when paused.
        for (const [id, remaining] of pausedAttacks.current) {
          scheduleAttack(id, remaining);
        }
        pausedAttacks.current.clear();
        // Resume bot move generation.
        botSession.current = { stopped: false, timeouts: new Set() };
        const difficulty = useGameStore.getState().spDifficulty as Difficulty;
        scheduleNext(botQueue.current, botSession.current, difficulty, (r, c, v) => {
          processMove(1, r, c, v);
        }, replenishRef.current ?? undefined, campaignCfgRef.current ?? undefined);
      }
    });
    return unsub;
  }, [gameMode, currentScreen]); // eslint-disable-line react-hooks/exhaustive-deps
}
