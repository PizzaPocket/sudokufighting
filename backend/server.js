import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url'; // ci-deploy-test
import { join, dirname } from 'path';
import { ARENAS } from '../packages/shared/dist/arenas.js';
import { supabase } from './supabase.js';
import {
  enqueue, dequeue, tryMatch, setQueuedArenaPreference,
  findRoomByPlayer, getRoom, deleteRoom, getRoomCount,
  startRound, handleCellInput, applyDamageFromAttack, applyCounterDamage,
  endRound, advanceRound, determineRoundWinner, getRoundPuzzleForPlayer,
  createPrivateRoom, joinByShareCode, createSinglePlayerRoom,
} from './game.js';
import { startBotAI, stopBotAI } from './bot.js';

const PORT = process.env.PORT || 8080;

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = join(__dirname, '..', 'frontend');

const app = express();
app.use(express.json());

// CORS headers for cross-domain fetch
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// Serve frontend statically in development
app.use(express.static(FRONTEND_DIR));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: getRoomCount() });
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// pendingTimers: Map<attackId, timeoutHandle>
const pendingTimers = new Map();

// roundTimers: Map<roomId, timeoutHandle>
const roundTimers = new Map();

// Time from game_start dispatch to "FIGHT!" firing: 3s lobby countdown + 2s "ROUND X" overlay
const PRE_FIGHT_DURATION_MS = 5000;

function startRoundTimer(roomId, fightStartTime) {
  clearRoundTimer(roomId);
  const delay = (fightStartTime - Date.now()) + 99000;
  const handle = setTimeout(() => {
    roundTimers.delete(roomId);
    const room = getRoom(roomId);
    if (!room || room.state !== 'in_round') return;
    const winnerSeat = determineRoundWinner(roomId);
    broadcast(room, 'time_up', {});
    triggerRoundEnd(roomId, room, winnerSeat);
  }, delay);
  roundTimers.set(roomId, handle);
}

function clearRoundTimer(roomId) {
  const handle = roundTimers.get(roomId);
  if (handle) { clearTimeout(handle); roundTimers.delete(roomId); }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function send(ws, type, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type, payload }));
}

function broadcast(room, type, payload, excludePlayerId = null) {
  for (const player of room.players) {
    if (player.id !== excludePlayerId) {
      send(player.ws, type, payload);
    }
  }
}

function sendToSeat(room, seat, type, payload) {
  const player = room.players[seat];
  if (player) send(player.ws, type, payload);
}

function scheduleAttackTimer(attackId, roomId, delayMs) {
  const handle = setTimeout(() => {
    pendingTimers.delete(attackId);
    const room = getRoom(roomId);
    if (!room) return;

    const result = applyDamageFromAttack(roomId, attackId);
    if (!result) return; // already handled by counter

    // attack_landed fires at the same time as damage so animations sync
    broadcast(room, 'attack_landed', {
      attackerSeat: result.attackerSeat,
      defenderSeat: result.defenderSeat,
      type: result.attackType,
      damage: result.damage,
    });
    broadcast(room, 'health_update', { health: result.health });
    broadcast(room, 'combo_update', { seat: result.defenderSeat, combo: 0 });

    // Check round end
    checkRoundEnd(roomId, room);
  }, delayMs);
  pendingTimers.set(attackId, handle);
  return handle;
}

function clearAttackTimer(attackId) {
  const handle = pendingTimers.get(attackId);
  if (handle) {
    clearTimeout(handle);
    pendingTimers.delete(attackId);
  }
}

// Shared event dispatcher — used by both cell_input (real player) and bot moves
function processCellEvents(room, events) {
  for (const evt of events) {
    if (evt.type === 'cell_update' || evt.type === 'cursor_update') {
      broadcast(room, evt.type, evt.payload);
    } else if (evt.type === 'attack_incoming') {
      broadcast(room, evt.type, evt.payload);
    } else if (evt.type === 'counter_window_active') {
      broadcast(room, evt.type, evt.payload);
    } else if (evt.type === 'row_wiped' || evt.type === 'column_wiped' || evt.type === 'box_wiped') {
      broadcast(room, evt.type, evt.payload);
    } else if (evt.type === 'health_update') {
      broadcast(room, evt.type, evt.payload);
    } else if (evt.type === 'combo_update' || evt.type === 'score_update') {
      broadcast(room, evt.type, evt.payload);
    } else if (evt.type === 'auto_counter') {
      clearAttackTimer(evt.payload.attackId);
      const cResult = applyCounterDamage(room.roomId, evt.payload.attackId);
      if (cResult) {
        broadcast(room, 'counter_landed', {
          counterSeat: cResult.defenderSeat,
          reducedDamage: cResult.reducedDamage,
          counterDamage: cResult.counterDamage,
          attackType: cResult.attackType,
        });
        broadcast(room, 'health_update', { health: cResult.health });
        broadcast(room, 'combo_update', { seat: cResult.attackerSeat, combo: 0 });
        checkRoundEnd(room.roomId, room);
      }
    } else if (evt.type === 'puzzle_complete') {
      const winnerSeat = determineRoundWinner(room.roomId);
      triggerRoundEnd(room.roomId, room, winnerSeat);
    }
  }
}

// Factory: returns a makeBotMove(botId, row, col, value) callback for use in bot.js
function makeBotMoveProcessor(roomId) {
  return function(botId, row, col, value) {
    const room = getRoom(roomId);
    if (!room || room.state !== 'in_round') return;
    const events = handleCellInput(room.roomId, botId, row, col, value, scheduleAttackTimer);
    processCellEvents(room, events);
    checkRoundEnd(room.roomId, room);
  };
}

function checkRoundEnd(roomId, room) {
  if (!room || room.state !== 'in_round') return;
  const { health } = room.round;
  if (health[0] <= 0 || health[1] <= 0) {
    let winnerSeat = health[0] > health[1] ? 0 : 1;
    if (health[0] <= 0 && health[1] <= 0) winnerSeat = -1;
    triggerRoundEnd(roomId, room, winnerSeat);
  }
}

// Write match results for both players to Supabase (multiplayer only).
// Uses the service-role key so it bypasses RLS — server is authoritative.
async function recordMultiplayerMatch(room, matchWinnerSeat) {
  if (!supabase || room.isSinglePlayer) return;

  const durationMs = room.match.startTime ? Date.now() - room.match.startTime : 0;
  const rows = [];

  for (const player of room.players) {
    if (!player.userId) continue; // guest — no record
    const opponentSeat = 1 - player.seat;
    const opponent = room.players[opponentSeat];
    const result = matchWinnerSeat === -1 ? 'tie'
      : matchWinnerSeat === player.seat ? 'win'
      : 'loss';

    rows.push({
      user_id:           player.userId,
      game_mode:         room.gameMode ?? 'quick',
      result,
      character_id:      player.characterId,
      opponent_name:     opponent?.name ?? null,
      score:             room.match.scores[player.seat] ?? 0,
      adjusted_score:    room.match.scores[player.seat] ?? 0,
      match_duration_ms: durationMs,
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('match_history').insert(rows);
    if (error) console.error('[supabase] match_history insert error:', error.message);
  }
}

function triggerRoundEnd(roomId, room, winnerSeat) {
  clearRoundTimer(roomId);
  // Clear all pending timers for this room
  for (const attack of (room.round?.pendingAttacks ?? [])) {
    clearAttackTimer(attack.id);
  }
  // Stop bot AI for this round (restarted per-round in next_round handler)
  if (room.isSinglePlayer) stopBotAI(roomId);

  // Accumulate this round's scores into the match total before endRound clears round state
  if (room.round?.score) {
    room.match.scores[0] += room.round.score[0];
    room.match.scores[1] += room.round.score[1];
  }

  const result = endRound(roomId, winnerSeat);
  if (!result) return;

  broadcast(room, 'round_end', {
    winnerSeat,
    roundWins: result.roundWins,
    roundNumber: room.match.roundNumber,
  });

  if (result.matchOver) {
    const mw = result.matchWinnerSeat;
    const winner = mw !== -1 ? room.players[mw] : null;
    broadcast(room, 'match_end', {
      winnerSeat: mw,
      winnerName: winner?.name ?? 'Unknown',
    });
    recordMultiplayerMatch(room, mw); // fire-and-forget
  }
}

// ---------------------------------------------------------------------------
// WebSocket connection handler
// ---------------------------------------------------------------------------

wss.on('connection', (ws) => {
  const playerId = uuidv4();
  ws.playerId = playerId;

  send(ws, 'connected', { playerId });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const { type, payload = {} } = msg;

    switch (type) {
      case 'find_match': {
        const { characterId = 'fighter1', name = 'Player', preferredArenaId = null, userId = null } = payload;
        // Clean up any finished room this player is still attached to.
        // The singleton WS never closes between matches, so ws.on('close') won't
        // fire to do this — purge it here before re-queuing.
        const staleRoom = findRoomByPlayer(playerId);
        if (staleRoom && (staleRoom.state === 'match_end' || staleRoom.state === 'rematch_pending')) {
          deleteRoom(staleRoom.roomId);
        }
        // Remove any existing queue entry for this player (e.g. re-entering after back-navigate)
        dequeue(playerId);
        const shareCode = enqueue(playerId, ws, characterId, name, preferredArenaId, userId);
        const matched = tryMatch();
        if (matched) {
          const room = getRoom(matched.roomId);
          room.preferredArenaId = matched.preferredArenaId;
          // Mirror match: seat 1 gets the alt costume
          if (room.players[0].characterId === room.players[1].characterId) {
            room.players[1].useAlt = true;
          }
          // Notify both players
          for (const player of room.players) {
            send(player.ws, 'room_assigned', { roomId: matched.roomId });
            send(player.ws, 'player_joined', {
              playerId: player.id,
              seat: player.seat,
              name: player.name,
              characterId: player.characterId,
              useAlt: player.useAlt,
            });
          }
          // Notify each player of their opponent
          send(room.players[0].ws, 'opponent_joined', {
            name: room.players[1].name,
            characterId: room.players[1].characterId,
            useAlt: room.players[1].useAlt,
            seat: 1,
          });
          send(room.players[1].ws, 'opponent_joined', {
            name: room.players[0].name,
            characterId: room.players[0].characterId,
            useAlt: room.players[0].useAlt,
            seat: 0,
          });
          // Start round 1
          startGameRound(matched.roomId, room);
        } else {
          send(ws, 'waiting_for_opponent', { shareCode });
        }
        break;
      }

      case 'create_room': {
        const { characterId = 'fighter1', name = 'Player', userId = null } = payload;
        dequeue(playerId);
        const { roomId, shareCode: roomShareCode } = createPrivateRoom(playerId, ws, characterId, name, userId);
        send(ws, 'room_created', { roomId, shareCode: roomShareCode });
        break;
      }

      case 'join_room': {
        const { shareCode: joinCode, characterId = 'fighter1', name = 'Player', userId = null } = payload;
        dequeue(playerId);
        if (!joinCode) { send(ws, 'room_not_found', {}); break; }
        const result = joinByShareCode(joinCode.toUpperCase(), playerId, ws, characterId, name, userId);
        if (result.error === 'not_found') { send(ws, 'room_not_found', {}); break; }
        if (result.error === 'full')      { send(ws, 'room_full', {}); break; }
        const room = result.room;
        if (result.host?.preferredArenaId) room.preferredArenaId = result.host.preferredArenaId;
        for (const player of room.players) {
          send(player.ws, 'room_assigned', { roomId: room.roomId });
          send(player.ws, 'player_joined', {
            playerId: player.id, seat: player.seat,
            name: player.name, characterId: player.characterId, useAlt: player.useAlt,
            shareCode: joinCode.toUpperCase(),
          });
        }
        send(room.players[0].ws, 'opponent_joined', {
          name: room.players[1].name, characterId: room.players[1].characterId,
          useAlt: room.players[1].useAlt, seat: 1,
        });
        send(room.players[1].ws, 'opponent_joined', {
          name: room.players[0].name, characterId: room.players[0].characterId,
          useAlt: room.players[0].useAlt, seat: 0,
        });
        startGameRound(room.roomId, room);
        break;
      }

      case 'start_singleplayer': {
        const { characterId = 'fighter1', name = 'Player', difficulty = 'medium',
                aiCharacterId = 'fighter2', aiName = 'AI', preferredArenaId = null } = payload;
        const { roomId: spRoomId, room: spRoom } = createSinglePlayerRoom(
          playerId, ws, characterId, name, aiCharacterId, aiName
        );
        spRoom.preferredArenaId = ARENAS.find(a => a.id === preferredArenaId) ? preferredArenaId : null;
        spRoom.botDifficulty = difficulty;

        // Notify the real player (bot has null ws — send() silently skips it)
        send(ws, 'room_assigned', { roomId: spRoomId });
        send(ws, 'player_joined', {
          playerId, seat: 0,
          name, characterId, useAlt: spRoom.players[0].useAlt,
        });
        send(ws, 'opponent_joined', {
          name: aiName, characterId: aiCharacterId,
          useAlt: spRoom.players[1].useAlt, seat: 1,
        });

        startGameRound(spRoomId, spRoom);
        startBotAI(spRoom, difficulty, makeBotMoveProcessor(spRoomId));
        break;
      }

      case 'set_arena_preference': {
        const { arenaId } = payload;
        if (ARENAS.find(a => a.id === arenaId)) {
          setQueuedArenaPreference(playerId, arenaId);
          // Also update a private room while the host is waiting for an opponent
          const room = findRoomByPlayer(playerId);
          if (room && room.state === 'waiting_private') room.preferredArenaId = arenaId;
        }
        break;
      }

      case 'cell_input': {
        const room = findRoomByPlayer(playerId);
        if (!room) return;
        const { row, col, value } = payload;
        if (row == null || col == null || value == null) return;

        const events = handleCellInput(room.roomId, playerId, row, col, value, scheduleAttackTimer);
        processCellEvents(room, events);
        checkRoundEnd(room.roomId, room);
        break;
      }

      case 'cursor_move': {
        const room = findRoomByPlayer(playerId);
        if (!room) return;
        const seat = room.players.findIndex(p => p.id === playerId);
        const { row, col } = payload;
        broadcast(room, 'cursor_update', { seat, row, col }, playerId);
        break;
      }

      case 'surrender': {
        const room = findRoomByPlayer(playerId);
        if (!room || room.state !== 'in_round') break;
        const loserSeat = room.players.findIndex(p => p.id === playerId);
        const winnerSeat = 1 - loserSeat;
        clearRoundTimer(room.roomId);
        for (const attack of (room.round?.pendingAttacks ?? [])) clearAttackTimer(attack.id);
        if (room.isSinglePlayer) stopBotAI(room.roomId);
        if (room.round?.score) {
          room.match.scores[0] += room.round.score[0];
          room.match.scores[1] += room.round.score[1];
        }
        room.state = 'match_end';
        const winner = room.players[winnerSeat];
        broadcast(room, 'match_end', {
          winnerSeat,
          winnerName: winner?.name ?? 'Unknown',
        });
        recordMultiplayerMatch(room, winnerSeat); // fire-and-forget
        break;
      }

      case 'next_round': {
        // Client signals ready for next round (both must signal)
        const room = findRoomByPlayer(playerId);
        if (!room || room.state !== 'round_end') return;
        const player = room.players.find(p => p.id === playerId);
        if (player) player.readyForNext = true;
        // Bot is always immediately ready
        if (room.isSinglePlayer) {
          const bot = room.players.find(p => p.id === room.botId);
          if (bot) bot.readyForNext = true;
        }
        const allReady = room.players.length === 2 && room.players.every(p => p.readyForNext);
        if (allReady) {
          room.players.forEach(p => delete p.readyForNext);
          advanceRound(room.roomId);
          startGameRound(room.roomId, room);
          if (room.isSinglePlayer) {
            startBotAI(room, room.botDifficulty, makeBotMoveProcessor(room.roomId));
          }
        }
        break;
      }

      case 'rematch_vote': {
        const room = findRoomByPlayer(playerId);
        if (!room || (room.state !== 'match_end' && room.state !== 'rematch_pending')) break;
        const player = room.players.find(p => p.id === playerId);
        if (!player) break;
        player.wantsRematch = true;
        room.state = 'rematch_pending';
        // Notify the other player that their opponent wants a rematch
        const other = room.players.find(p => p.id !== playerId);
        if (other?.ws) send(other.ws, 'rematch_offered', {});
        // If both players have voted, start a fresh match
        if (room.players.length === 2 && room.players.every(p => p.wantsRematch)) {
          room.players.forEach(p => delete p.wantsRematch);
          room.match.roundNumber = 1;
          room.match.roundWins = [0, 0];
          room.match.scores = [0, 0];
          room.match.startTime = null;
          room.round = null;
          broadcast(room, 'rematch_start', {});
          startGameRound(room.roomId, room);
        }
        break;
      }

      case 'rematch_cancel': {
        const room = findRoomByPlayer(playerId);
        if (!room || (room.state !== 'match_end' && room.state !== 'rematch_pending')) break;
        if (room.state === 'rematch_pending') {
          const player = room.players.find(p => p.id === playerId);
          if (player) delete player.wantsRematch;
          room.state = 'match_end';
        }
        // Notify the other player regardless — covers both "leave while vote in flight"
        // and "leave before any vote was cast" (opponent's REMATCH button should disappear)
        const other = room.players.find(p => p.id !== playerId);
        if (other?.ws) send(other.ws, 'rematch_cancelled', { reason: 'opponent_left' });
        break;
      }

      default:
        break;
    }
  });

  ws.on('close', () => {
    dequeue(playerId);
    const room = findRoomByPlayer(playerId);

    // Single-player: just clean up quietly
    if (room && room.isSinglePlayer) {
      stopBotAI(room.roomId);
      clearRoundTimer(room.roomId);
      for (const attack of (room.round?.pendingAttacks ?? [])) clearAttackTimer(attack.id);
      deleteRoom(room.roomId);
      return;
    }

    // Player disconnects from a private room still waiting for a second player
    if (room && room.state === 'waiting_private') {
      const other = room.players.find(p => p.id !== playerId);
      if (other) send(other.ws, 'opponent_left_lobby', {});
      deleteRoom(room.roomId);
      return;
    }

    if (room && (room.state === 'match_end' || room.state === 'rematch_pending')) {
      const other = room.players.find(p => p.id !== playerId);
      if (other?.ws && room.state === 'rematch_pending') {
        send(other.ws, 'rematch_cancelled', { reason: 'opponent_left' });
      }
      deleteRoom(room.roomId);
      return;
    }

    if (room && (room.state === 'in_round' || room.state === 'round_end')) {
      const loserSeat = room.players.findIndex(p => p.id === playerId);
      const winnerSeat = 1 - loserSeat;
      clearRoundTimer(room.roomId);
      // Clear timers
      for (const attack of (room.round?.pendingAttacks ?? [])) {
        clearAttackTimer(attack.id);
      }
      broadcast(room, 'opponent_disconnected', { seat: loserSeat });
      if (room.round?.score) {
        room.match.scores[0] += room.round.score[0];
        room.match.scores[1] += room.round.score[1];
      }
      endRound(room.roomId, winnerSeat);
      broadcast(room, 'match_end', {
        winnerSeat,
        winnerName: room.players[winnerSeat]?.name ?? 'Unknown',
        reason: 'disconnect',
      });
      recordMultiplayerMatch(room, winnerSeat); // fire-and-forget
      deleteRoom(room.roomId);
    }
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
  });
});

// ---------------------------------------------------------------------------
// Start a game round
// ---------------------------------------------------------------------------

function startGameRound(roomId, room) {
  const round = startRound(roomId);
  if (!round) return;

  // Pick background once per match; keep it for all subsequent rounds
  if (!room.backgroundId) {
    const validPref = ARENAS.find(a => a.id === room.preferredArenaId);
    room.backgroundId = validPref
      ? validPref.id
      : ARENAS[Math.floor(Math.random() * ARENAS.length)].id;
  }

  const fightStartTime = Date.now() + PRE_FIGHT_DURATION_MS;
  startRoundTimer(roomId, fightStartTime);

  for (const player of room.players) {
    const puzz = getRoundPuzzleForPlayer(roomId, player.seat);
    const opponent = room.players[1 - player.seat];
    const oppPuzz = getRoundPuzzleForPlayer(roomId, 1 - player.seat);
    send(player.ws, 'game_start', {
      roundNumber: room.match.roundNumber,
      puzzle: puzz.given,
      solution: puzz.solution,
      opponentGivens: oppPuzz.given,
      opponentName: opponent?.name,
      opponentCharacter: opponent?.characterId,
      mySeat: player.seat,
      myUseAlt: player.useAlt,
      opponentUseAlt: opponent.useAlt,
      fightStartTime,
      backgroundId: room.backgroundId,
    });
  }
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.log(`Sudoku Street Fight backend running on port ${PORT}`);
});
