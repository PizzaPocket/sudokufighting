// AI scheduler — ported from backend/bot.js with server dependencies removed.
// The caller provides getRoundState() and makeBotMove() callbacks instead.

import type { PuzzleState, Difficulty } from '../types/game.js';
import { DIFFICULTY_CONFIG, type DifficultyConfig } from './difficulty.js';

export interface BotCell {
  row: number;
  col: number;
  value: number;
}

export interface BotSession {
  stopped: boolean;
  timeouts: Set<number>;
}

export function buildCellQueue(puzz: PuzzleState, difficulty: Difficulty): BotCell[] {
  const cells: BotCell[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzz.given[r][c] === null) {
        cells.push({ row: r, col: c, value: puzz.solution[r][c] as number });
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  if (difficulty === 'easy') return cells;
  return sortForCompletions(cells);
}

export function sortForCompletions(cells: BotCell[]): BotCell[] {
  const rowCount = new Array(9).fill(0);
  const colCount = new Array(9).fill(0);
  const boxCount = new Array(9).fill(0);
  for (const cell of cells) {
    rowCount[cell.row]++;
    colCount[cell.col]++;
    boxCount[boxIndex(cell.row, cell.col)]++;
  }

  const nonComp: BotCell[] = [];
  const comp: BotCell[] = [];
  for (const cell of cells) {
    if (
      rowCount[cell.row] === 1 ||
      colCount[cell.col] === 1 ||
      boxCount[boxIndex(cell.row, cell.col)] === 1
    ) {
      comp.push(cell);
    } else {
      nonComp.push(cell);
    }
  }
  return [...nonComp, ...comp];
}

export function scheduleNext(
  queue: BotCell[],
  session: BotSession,
  difficulty: Difficulty,
  makeBotMove: (row: number, col: number, value: number) => void,
  /** Optional: called each tick to replenish wiped cells */
  replenish?: (queue: BotCell[]) => void
): void {
  if (session.stopped || queue.length === 0) return;

  const cfg: DifficultyConfig = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.medium;

  if (replenish) replenish(queue);

  if (difficulty === 'hard' && queue.length > 1) {
    const reordered = sortForCompletions(queue);
    queue.length = 0;
    queue.push(...reordered);
  }

  const jitter = (Math.random() * 2 - 1) * cfg.jitterMs;
  const delay = Math.max(500, cfg.avgMs + jitter);

  const handle = setTimeout(() => {
    session.timeouts.delete(handle);
    if (session.stopped) return;

    const cell = queue.shift();
    if (!cell) return;

    if (Math.random() < cfg.errorRate) {
      const wrongVal = getWrongValue(cell.value);
      makeBotMove(cell.row, cell.col, wrongVal);

      const fixHandle = setTimeout(() => {
        session.timeouts.delete(fixHandle);
        if (session.stopped) return;
        makeBotMove(cell.row, cell.col, cell.value);
        scheduleNext(queue, session, difficulty, makeBotMove, replenish);
      }, cfg.errorDelayMs);
      session.timeouts.add(fixHandle);
    } else {
      makeBotMove(cell.row, cell.col, cell.value);
      scheduleNext(queue, session, difficulty, makeBotMove, replenish);
    }
  }, delay);

  session.timeouts.add(handle);
}

function boxIndex(row: number, col: number): number {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

function getWrongValue(correctValue: number): number {
  const choices = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(v => v !== correctValue);
  return choices[Math.floor(Math.random() * choices.length)];
}
