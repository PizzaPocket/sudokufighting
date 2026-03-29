// Game state management: rooms, players, combat logic
import { v4 as uuidv4 } from 'uuid';
import { generatePuzzle } from './puzzle.js';

// rooms: Map<roomId, Room>
const rooms = new Map();

// matchmaking queue: Array<{ playerId, ws, characterId, name }>
const queue = [];

// shareCodeMap: Map<shareCode, { type: 'queue'|'private', id: playerId|roomId }>
const shareCodeMap = new Map();

function generateShareCode() {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit O/0/I/1 for legibility
  let code;
  do {
    code = Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
  } while (shareCodeMap.has(code));
  return code;
}

// ---------------------------------------------------------------------------
// Room creation & player management
// ---------------------------------------------------------------------------

export function createRoom() {
  const roomId = uuidv4();
  rooms.set(roomId, {
    roomId,
    state: 'waiting', // waiting | in_round | round_end | match_end
    players: [],      // max 2, indexed by seat (0 = left, 1 = right)
    match: {
      roundNumber: 1,
      roundWins: [0, 0],
    },
    round: null,
  });
  return roomId;
}

export function addPlayerToRoom(roomId, playerId, ws, characterId, name) {
  const room = rooms.get(roomId);
  if (!room || room.players.length >= 2) return null;
  const seat = room.players.length;
  room.players.push({ id: playerId, ws, seat, characterId, name, useAlt: false });
  return seat;
}

export function getRoom(roomId) {
  return rooms.get(roomId);
}

export function deleteRoom(roomId) {
  rooms.delete(roomId);
}

export function getRoomCount() {
  return rooms.size;
}

// ---------------------------------------------------------------------------
// Matchmaking queue
// ---------------------------------------------------------------------------

export function enqueue(playerId, ws, characterId, name, preferredArenaId = null) {
  const shareCode = generateShareCode();
  shareCodeMap.set(shareCode, { type: 'queue', id: playerId });
  queue.push({ playerId, ws, characterId, name, preferredArenaId, shareCode });
  return shareCode;
}

export function setQueuedArenaPreference(playerId, arenaId) {
  const entry = queue.find(p => p.playerId === playerId);
  if (entry) entry.preferredArenaId = arenaId;
}

export function tryMatch() {
  if (queue.length < 2) return null;
  const p1 = queue.shift();
  const p2 = queue.shift();
  const roomId = createRoom();
  addPlayerToRoom(roomId, p1.playerId, p1.ws, p1.characterId, p1.name);
  addPlayerToRoom(roomId, p2.playerId, p2.ws, p2.characterId, p2.name);
  // Collect non-null arena preferences from both players
  const prefs = [p1.preferredArenaId, p2.preferredArenaId].filter(Boolean);
  const preferredArenaId = prefs.length ? prefs[Math.floor(Math.random() * prefs.length)] : null;
  return { roomId, p1, p2, preferredArenaId };
}

export function dequeue(playerId) {
  const idx = queue.findIndex(p => p.playerId === playerId);
  if (idx !== -1) {
    const entry = queue.splice(idx, 1)[0];
    if (entry.shareCode) shareCodeMap.delete(entry.shareCode);
  }
}

// ---------------------------------------------------------------------------
// Round lifecycle
// ---------------------------------------------------------------------------

export function startRound(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const puzzles = [generatePuzzle(), generatePuzzle()];

  room.round = {
    puzzles: puzzles.map(({ puzzle, solution }) => ({
      given: puzzle,           // (number|null)[][]
      solution,                // number[][]
      playerGrid: puzzle.map(r => r.map(v => v)), // player's working copy
      correctCount: 0,
    })),
    health: [1800, 1800],
    combo: [0, 0],
    consecutiveCorrect: [0, 0],
    lastCorrectTime: [null, null], // timestamp of last correct cell per player
    score: [0, 0],
    pendingAttacks: [],        // { id, attackerSeat, defenderSeat, type, damage, counterUsed }
    counterWindows: [
      { active: false, expiry: null },
      { active: false, expiry: null },
    ],
  };

  room.state = 'in_round';
  return room.round;
}

export function getRoundPuzzleForPlayer(roomId, seat) {
  const room = rooms.get(roomId);
  return room?.round?.puzzles[seat] ?? null;
}

// ---------------------------------------------------------------------------
// Cell input — core combat logic
// Returns an array of event objects to broadcast
// ---------------------------------------------------------------------------

export function handleCellInput(roomId, playerId, row, col, value, scheduleTimer) {
  const room = rooms.get(roomId);
  if (!room || room.state !== 'in_round') return [];

  const attackerSeat = room.players.findIndex(p => p.id === playerId);
  if (attackerSeat === -1) return [];
  const defenderSeat = 1 - attackerSeat;

  const puzz = room.round.puzzles[attackerSeat];
  const round = room.round;

  // Validate: given cells are blocked unless they've been wiped (playerGrid === null)
  if (puzz.given[row][col] !== null && puzz.playerGrid[row][col] !== null) return [];
  // Cell already correctly filled — ignore entirely (prevents points farming)
  if (puzz.playerGrid[row][col] === puzz.solution[row][col]) return [];
  // Same wrong value already in cell — don't penalise again
  if (puzz.playerGrid[row][col] === value && value !== puzz.solution[row][col]) return [];

  // Check correctness
  const correct = puzz.solution[row][col] === value;

  // Always record what player typed (even if wrong, for UI)
  puzz.playerGrid[row][col] = value;

  const events = [];

  // Broadcast cell update to both players
  events.push({
    type: 'cell_update',
    payload: { seat: attackerSeat, row, col, value, isCorrect: correct },
  });

  if (!correct) {
    // Wrong answer — self-damage, reset streaks
    round.consecutiveCorrect[attackerSeat] = 0;
    round.combo[attackerSeat] = 0;
    const selfDmg = 100; // 5 baseline × 20
    round.health[attackerSeat] = Math.max(0, round.health[attackerSeat] - selfDmg);
    events.push({ type: 'self_damage', payload: { seat: attackerSeat, damage: selfDmg } });
    events.push({ type: 'health_update', payload: { health: [...round.health] } });
    events.push({ type: 'combo_update', payload: { seat: attackerSeat, combo: 0 } });
    return events;
  }

  // Correct answer — calculate multipliers
  const now = Date.now();
  const elapsed = round.lastCorrectTime[attackerSeat] !== null
    ? now - round.lastCorrectTime[attackerSeat]
    : Infinity;
  round.lastCorrectTime[attackerSeat] = now;

  // Speed multiplier: 10x within 2s, 9x within 4s, ..., 1x after 18s
  const speedMult = Math.max(1, 10 - Math.floor(elapsed / 2000));
  // Combo multiplier (accumulates across consecutive correct cells)
  const comboMult = 1 + round.combo[attackerSeat] * 0.1;

  puzz.correctCount++;
  round.consecutiveCorrect[attackerSeat]++;

  // Single-cell attack: base 5 pts, punch or kick every 5th
  const attackType = round.consecutiveCorrect[attackerSeat] % 5 === 0 ? 'kick' : 'punch';
  const cellDamage = Math.round(5 * speedMult * comboMult);
  const cellPoints = cellDamage;
  round.score[attackerSeat] += cellPoints;
  round.combo[attackerSeat]++;

  events.push({ type: 'combo_update', payload: { seat: attackerSeat, combo: round.combo[attackerSeat] } });
  events.push({ type: 'score_update', payload: { seat: attackerSeat, score: round.score[attackerSeat] } });

  // Check completions (row / col / box)
  const completions = [];
  if (isRowComplete(puzz, row))
    completions.push({ kind: 'row', index: row });
  if (isColComplete(puzz, col))
    completions.push({ kind: 'col', index: col });
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  if (isBoxComplete(puzz, boxRow, boxCol))
    completions.push({ kind: 'box', boxRow, boxCol });

  // Pre-compute completion attack type / damage (needed whether or not a counter fires)
  let compAttackType = null;
  let compDamage = 0;
  if (completions.length > 0) {
    const n = completions.length;
    const compBasePts = 25 * n;
    compDamage = Math.round(compBasePts * speedMult * comboMult);
    round.score[attackerSeat] += compDamage;
    compAttackType = n === 1
      ? (completions[0].kind === 'row' ? 'row_special'
        : completions[0].kind === 'col' ? 'column_special'
        : 'subgrid_special')
      : 'subgrid_special';

    events.push({ type: 'score_update', payload: { seat: attackerSeat, score: round.score[attackerSeat] } });

    // Grid wipes fire immediately regardless of counter
    const defPuzz = room.round.puzzles[defenderSeat];
    for (const comp of completions) {
      if (comp.kind === 'row') {
        wipeRow(defPuzz, comp.index);
        events.push({ type: 'row_wiped', payload: { targetSeat: defenderSeat, row: comp.index } });
      } else if (comp.kind === 'col') {
        wipeCol(defPuzz, comp.index);
        events.push({ type: 'column_wiped', payload: { targetSeat: defenderSeat, col: comp.index } });
      } else {
        wipeBox(defPuzz, comp.boxRow, comp.boxCol);
        events.push({ type: 'box_wiped', payload: { targetSeat: defenderSeat, boxRow: comp.boxRow, boxCol: comp.boxCol } });
      }
    }
  }

  // Auto-counter check BEFORE queuing this player's attack.
  // If the player counters, the counter replaces their new attack entirely.
  const myWindow = round.counterWindows[attackerSeat];
  let didCounter = false;
  if (myWindow.active && Date.now() < myWindow.expiry) {
    const counterTarget = round.pendingAttacks.find(
      a => a.defenderSeat === attackerSeat && !a.counterUsed
    );
    if (counterTarget) {
      counterTarget.counterUsed = true;
      myWindow.active = false;
      events.push({ type: 'auto_counter', payload: { attackId: counterTarget.id } });
      didCounter = true;
    }
  }

  // Only queue a new outgoing attack if no counter fired
  if (!didCounter) {
    if (completions.length > 0) {
      const compAttackId = uuidv4();
      round.counterWindows[defenderSeat] = { active: true, expiry: now + 1500, attackId: compAttackId };
      round.pendingAttacks.push({
        id: compAttackId, attackerSeat, defenderSeat,
        type: compAttackType, damage: compDamage, counterUsed: false,
      });
      scheduleTimer(compAttackId, roomId, 1500);
      events.push({
        type: 'attack_incoming',
        payload: { attackerSeat, type: compAttackType, damage: compDamage, attackId: compAttackId, delayMs: 1500 },
      });
      events.push({
        type: 'counter_window_active',
        payload: { defenderSeat, expiresAt: now + 1500, attackId: compAttackId },
      });
    } else {
      const attackId = uuidv4();
      round.counterWindows[defenderSeat] = { active: true, expiry: now + 1500, attackId };
      round.pendingAttacks.push({
        id: attackId, attackerSeat, defenderSeat,
        type: attackType, damage: cellDamage, counterUsed: false,
      });
      scheduleTimer(attackId, roomId, 1500);
      events.push({
        type: 'attack_incoming',
        payload: { attackerSeat, type: attackType, damage: cellDamage, attackId, delayMs: 1500 },
      });
      events.push({
        type: 'counter_window_active',
        payload: { defenderSeat, expiresAt: now + 1500, attackId },
      });
    }
  }

  // Check if puzzle is complete (all cells correct)
  if (isPuzzleComplete(puzz)) {
    events.push({ type: 'puzzle_complete', payload: { seat: attackerSeat } });
  }

  return events;
}

// Counter attempt is now automatic (triggered by correct cell during window).
// No explicit counter_attempt / markCounterEligible needed.

export function applyDamageFromAttack(roomId, attackId) {
  const room = rooms.get(roomId);
  if (!room || room.state !== 'in_round') return null;

  const idx = room.round.pendingAttacks.findIndex(a => a.id === attackId);
  if (idx === -1) return null;

  const attack = room.round.pendingAttacks.splice(idx, 1)[0];
  if (attack.counterUsed) return null; // already handled

  const round = room.round;
  round.health[attack.defenderSeat] = Math.max(0, round.health[attack.defenderSeat] - attack.damage);
  // Applying damage resets defender combo
  round.combo[attack.defenderSeat] = 0;
  round.counterWindows[attack.defenderSeat].active = false;

  return {
    health: [...round.health],
    defenderSeat: attack.defenderSeat,
    attackerSeat: attack.attackerSeat,
    attackType: attack.type,
    damage: attack.damage,
  };
}

export function applyCounterDamage(roomId, attackId) {
  const room = rooms.get(roomId);
  if (!room || room.state !== 'in_round') return null;

  const idx = room.round.pendingAttacks.findIndex(a => a.id === attackId);
  if (idx === -1) return null;

  const attack = room.round.pendingAttacks.splice(idx, 1)[0];
  const round = room.round;

  // Defender takes 50% damage
  const reducedDamage = Math.ceil(attack.damage * 0.5);
  round.health[attack.defenderSeat] = Math.max(0, round.health[attack.defenderSeat] - reducedDamage);
  // Attacker takes counter-damage (flat penalty)
  const counterDamage = 60;
  round.health[attack.attackerSeat] = Math.max(0, round.health[attack.attackerSeat] - counterDamage);
  // Defender's combo preserved (they countered); attacker combo resets
  round.combo[attack.attackerSeat] = 0;
  round.counterWindows[attack.defenderSeat].active = false;

  return {
    health: [...round.health],
    defenderSeat: attack.defenderSeat,
    attackerSeat: attack.attackerSeat,
    reducedDamage,
    counterDamage,
  };
}

// ---------------------------------------------------------------------------
// Round end
// ---------------------------------------------------------------------------

export function endRound(roomId, winnerSeat) {
  const room = rooms.get(roomId);
  if (!room) return null;

  if (winnerSeat !== -1) {
    room.match.roundWins[winnerSeat]++;
  }
  room.state = 'round_end';

  // Clear any pending timers refs (caller is responsible for clearTimeout)
  if (room.round) {
    room.round.pendingAttacks = [];
    room.round.counterWindows = [
      { active: false, expiry: null },
      { active: false, expiry: null },
    ];
  }

  const wonByTwoRounds = winnerSeat !== -1 && room.match.roundWins[winnerSeat] >= 2;
  const maxRoundsPlayed = room.match.roundNumber >= 3;
  const matchOver = wonByTwoRounds || maxRoundsPlayed;
  if (matchOver) room.state = 'match_end';

  // Determine match winner: compare round wins; -1 if equal (tie)
  let matchWinnerSeat = -1;
  if (matchOver) {
    const [w0, w1] = room.match.roundWins;
    if (w0 > w1) matchWinnerSeat = 0;
    else if (w1 > w0) matchWinnerSeat = 1;
    else matchWinnerSeat = -1;
  }

  return {
    roundWins: [...room.match.roundWins],
    matchOver,
    matchWinnerSeat,
  };
}

export function advanceRound(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.match.roundNumber++;
  room.round = null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRowComplete(puzz, row) {
  return puzz.playerGrid[row].every((v, c) =>
    v !== null && v !== 0 && v === puzz.solution[row][c]
  );
}

function isColComplete(puzz, col) {
  return puzz.playerGrid.every((r, ri) =>
    r[col] !== null && r[col] !== 0 && r[col] === puzz.solution[ri][col]
  );
}

function isBoxComplete(puzz, boxRow, boxCol) {
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (puzz.playerGrid[r][c] !== puzz.solution[r][c]) return false;
    }
  }
  return true;
}

function isPuzzleComplete(puzz) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzz.playerGrid[r][c] !== puzz.solution[r][c]) return false;
    }
  }
  return true;
}

function wipeRow(puzz, row) {
  for (let c = 0; c < 9; c++) {
    puzz.playerGrid[row][c] = null;
  }
}

function wipeCol(puzz, col) {
  for (let r = 0; r < 9; r++) {
    puzz.playerGrid[r][col] = null;
  }
}

function wipeBox(puzz, boxRow, boxCol) {
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      puzz.playerGrid[r][c] = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Private rooms (Play with a Friend)
// ---------------------------------------------------------------------------

export function createPrivateRoom(playerId, ws, characterId, name) {
  const roomId = createRoom();
  addPlayerToRoom(roomId, playerId, ws, characterId, name);
  const shareCode = generateShareCode();
  shareCodeMap.set(shareCode, { type: 'private', id: roomId });
  const room = rooms.get(roomId);
  room.shareCode = shareCode;
  room.state = 'waiting_private';
  return { roomId, shareCode };
}

export function joinByShareCode(shareCode, playerId, ws, characterId, name) {
  const entry = shareCodeMap.get(shareCode);
  if (!entry) return { error: 'not_found' };

  if (entry.type === 'private') {
    const room = rooms.get(entry.id);
    if (!room) return { error: 'not_found' };
    if (room.players.length >= 2) return { error: 'full' };
    addPlayerToRoom(entry.id, playerId, ws, characterId, name);
    if (room.players[0].characterId === room.players[1].characterId) room.players[1].useAlt = true;
    shareCodeMap.delete(shareCode);
    room.shareCode = null;
    return { type: 'joined_private', roomId: entry.id, room };
  }

  if (entry.type === 'queue') {
    const idx = queue.findIndex(p => p.playerId === entry.id);
    if (idx === -1) return { error: 'not_found' };
    const host = queue.splice(idx, 1)[0];
    if (host.shareCode) shareCodeMap.delete(host.shareCode);
    const roomId = createRoom();
    addPlayerToRoom(roomId, host.playerId, host.ws, host.characterId, host.name);
    addPlayerToRoom(roomId, playerId, ws, characterId, name);
    const room = rooms.get(roomId);
    if (room.players[0].characterId === room.players[1].characterId) room.players[1].useAlt = true;
    return { type: 'joined_queue', roomId, room, host };
  }

  return { error: 'not_found' };
}

// Find a room by player id
export function findRoomByPlayer(playerId) {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.id === playerId)) return room;
  }
  return null;
}

export function determineRoundWinner(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.round) return null;
  const [hp0, hp1] = room.round.health;
  if (hp0 <= 0 && hp1 <= 0) return -1; // draw
  if (hp0 <= 0) return 1;
  if (hp1 <= 0) return 0;
  // Puzzle complete scenario: higher HP wins
  if (hp0 > hp1) return 0;
  if (hp1 > hp0) return 1;
  return -1; // draw
}
