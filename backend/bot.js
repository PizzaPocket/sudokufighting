// AI bot engine — drives a synthetic player that mimics human sudoku gameplay
import { getRoom, getRoundPuzzleForPlayer } from './game.js';

const DIFFICULTY_CONFIG = {
  easy:   { avgMs: 10000, jitterMs: 4000, errorRate: 0.20, errorDelayMs: 900  },
  medium: { avgMs:  5000, jitterMs: 2000, errorRate: 0.08, errorDelayMs: 700  },
  hard:   { avgMs:  2500, jitterMs: 1000, errorRate: 0.02, errorDelayMs: 450  },
};

// Map<roomId, { timeouts: Set<handle>, stopped: boolean }>
const botSessions = new Map();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function startBotAI(room, difficulty, makeBotMove) {
  const roomId = room.roomId;
  const botId  = room.botId;
  const cfg = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.medium;

  stopBotAI(roomId); // clear any previous session

  const session = { timeouts: new Set(), stopped: false };
  botSessions.set(roomId, session);

  const puzz = getRoundPuzzleForPlayer(roomId, 1);
  if (!puzz) return;

  const queue = buildCellQueue(puzz, difficulty);
  scheduleNext(roomId, botId, queue, cfg, session, makeBotMove);
}

export function stopBotAI(roomId) {
  const session = botSessions.get(roomId);
  if (!session) return;
  session.stopped = true;
  for (const handle of session.timeouts) clearTimeout(handle);
  session.timeouts.clear();
  botSessions.delete(roomId);
}

// ---------------------------------------------------------------------------
// Cell queue construction
// ---------------------------------------------------------------------------

function buildCellQueue(puzz, difficulty) {
  const cells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzz.given[r][c] === null) {
        cells.push({ row: r, col: c, value: puzz.solution[r][c] });
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  if (difficulty === 'easy') return cells;

  // For medium/hard: move cells that complete a row/col/box to the END of the queue
  // so the bot fills them last, triggering the completion special attack.
  return sortForCompletions(cells);
}

function sortForCompletions(cells) {
  // Count how many cells in the queue belong to each row / col / box
  const rowCount = new Array(9).fill(0);
  const colCount = new Array(9).fill(0);
  const boxCount = new Array(9).fill(0);
  for (const cell of cells) {
    rowCount[cell.row]++;
    colCount[cell.col]++;
    boxCount[boxIndex(cell.row, cell.col)]++;
  }

  // Completion cells: the sole remaining cell for a row/col/box → save for last
  const nonComp = [];
  const comp    = [];
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

// ---------------------------------------------------------------------------
// Scheduling loop
// ---------------------------------------------------------------------------

function scheduleNext(roomId, botId, queue, cfg, session, makeBotMove) {
  if (session.stopped || queue.length === 0) return;

  // Check for wiped cells (opponent attacked bot's grid) and re-queue them
  const room = getRoom(roomId);
  if (room?.state === 'in_round') replenishWipedCells(queue, room);

  // For hard difficulty, re-sort remaining queue head to target completions
  if (cfg === DIFFICULTY_CONFIG.hard && queue.length > 1) {
    const reordered = sortForCompletions(queue);
    queue.length = 0;
    queue.push(...reordered);
  }

  const jitter = (Math.random() * 2 - 1) * cfg.jitterMs;
  const delay  = Math.max(500, cfg.avgMs + jitter);

  const handle = setTimeout(() => {
    session.timeouts.delete(handle);
    if (session.stopped) return;

    const room = getRoom(roomId);
    if (!room || room.state !== 'in_round') return;

    const cell = queue.shift();
    if (!cell) return;

    if (Math.random() < cfg.errorRate) {
      // Submit a wrong value first, then correct it after a short delay
      const wrongVal = getWrongValue(cell.value);
      makeBotMove(botId, cell.row, cell.col, wrongVal);

      const fixHandle = setTimeout(() => {
        session.timeouts.delete(fixHandle);
        if (session.stopped) return;
        const room2 = getRoom(roomId);
        if (!room2 || room2.state !== 'in_round') return;
        makeBotMove(botId, cell.row, cell.col, cell.value);
        scheduleNext(roomId, botId, queue, cfg, session, makeBotMove);
      }, cfg.errorDelayMs);
      session.timeouts.add(fixHandle);
    } else {
      makeBotMove(botId, cell.row, cell.col, cell.value);
      scheduleNext(roomId, botId, queue, cfg, session, makeBotMove);
    }
  }, delay);

  session.timeouts.add(handle);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function replenishWipedCells(queue, room) {
  const puzz = room.round?.puzzles[1];
  if (!puzz) return;
  const queuedKeys = new Set(queue.map(c => `${c.row},${c.col}`));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzz.given[r][c] !== null) continue; // given cell
      const key = `${r},${c}`;
      if (queuedKeys.has(key)) continue;       // already in queue
      // Cell needs to be (re)filled
      if (puzz.playerGrid[r][c] !== puzz.solution[r][c]) {
        queue.push({ row: r, col: c, value: puzz.solution[r][c] });
        queuedKeys.add(key);
      }
    }
  }
}

function boxIndex(row, col) {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

function getWrongValue(correctValue) {
  const choices = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(v => v !== correctValue);
  return choices[Math.floor(Math.random() * choices.length)];
}
