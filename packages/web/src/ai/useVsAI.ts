// VS AI — wires packages/shared combat engine + bot scheduler into the React game loop.
// All round state lives here (not in Zustand) so the pure engine functions work without
// touching any DOM or React.

import { useEffect, useRef } from 'react';
import {
  generatePuzzle,
  handleCellInput, applyDamageFromAttack,
  buildCellQueue, scheduleNext,
  STARTING_HEALTH, ATTACK_DELAY_MS, DIFFICULTY_CONFIG,
} from '@sudoku-fighting/shared';
import type { RoundState, Difficulty, BotCell, BotSession } from '@sudoku-fighting/shared';
import { injectServerMessage } from '../hooks/useGameSocket';
import { useGameStore } from '../store/gameStore';

// ---------------------------------------------------------------------------
// Module-level callback — SudokuGrid calls this instead of send() in SP mode
// ---------------------------------------------------------------------------

export let vsAiPlayerMove: ((row: number, col: number, value: number) => void) | null = null;

// Called by SpLobbyScreen once, then again each round from startVsAIRound
let _startRoundCallback: ((roundNumber: number) => void) | null = null;

export function startVsAIRound(roundNumber: number) {
  _startRoundCallback?.(roundNumber);
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
  const attackTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const botQueue = useRef<BotCell[]>([]);
  const botSession = useRef<BotSession>({ stopped: true, timeouts: new Set() });
  const localRoundWins = useRef<[number, number]>([0, 0]);

  function clearAllTimers() {
    for (const t of attackTimers.current.values()) clearTimeout(t);
    attackTimers.current.clear();
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
    const t = setTimeout(() => {
      attackTimers.current.delete(attackId);
      const result = applyDamageFromAttack(roundState.current, attackId);
      if (!result) return;
      for (const ev of result.events) injectServerMessage(ev);
      checkRoundEnd();
    }, delay);
    attackTimers.current.set(attackId, t);
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
      if (ev.type === 'puzzle_complete') {
        // Winner is the one who completed their puzzle
        setTimeout(() => dispatchRoundEnd(seat as 0 | 1), 200);
      }
    }
    checkRoundEnd();
  }

  function startRound(roundNumber: number) {
    clearAllTimers();

    const playerPuz = generatePuzzle();
    const aiPuz = generatePuzzle();

    // Build round state
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

    const difficulty = useGameStore.getState().spDifficulty as Difficulty;
    const arenaId = useGameStore.getState().backgroundId ?? 'bg_1';
    const myChar = useGameStore.getState().myCharacter ?? 'fighter1';
    const aiChar = useGameStore.getState().opponentCharacter ?? 'fighter2';
    const myName = useGameStore.getState().myName ?? 'Player';
    const aiName = useGameStore.getState().opponentName ?? 'CPU';

    // Dispatch synthetic game_start
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
        opponentUseAlt: false,
        roundStartTime: Date.now() + 3000, // ROUND X (2s) + FIGHT! (1s)
        backgroundId: arenaId,
      },
    });

    // Start bot
    botSession.current = { stopped: false, timeouts: new Set() };
    botQueue.current = buildCellQueue(rs.puzzles[1], difficulty);

    function replenish(queue: BotCell[]) {
      // Re-add wiped cells (playerGrid changed to null) that aren't in queue yet
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

    // Delay bot start to match the ROUND X → FIGHT! sequence timing (3s)
    const startDelay = 3000;
    const startTimer = setTimeout(() => {
      botSession.current.timeouts.delete(startTimer as unknown as number);
      scheduleNext(botQueue.current, botSession.current, difficulty, (r, c, v) => {
        processMove(1, r, c, v);
      }, replenish);
    }, startDelay);
    botSession.current.timeouts.add(startTimer as unknown as number);
  }

  useEffect(() => {
    if (gameMode !== 'singleplayer' || currentScreen !== 'gameplay') return;

    // Register player move handler
    vsAiPlayerMove = (row, col, value) => processMove(0, row, col, value);

    // Register next-round trigger
    _startRoundCallback = startRound;

    // Start round 1
    localRoundWins.current = [0, 0];
    startRound(1);

    return () => {
      vsAiPlayerMove = null;
      _startRoundCallback = null;
      clearAllTimers();
    };
  }, [gameMode, currentScreen]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a new round starts (roundOver → false from resetForNextRound triggered by game_start),
  // useVsAI handles the next round via the GameOverlay's send('next_round') interception.
  // Nothing else needed here — startVsAIRound() is called from GameOverlay in SP mode.
}
