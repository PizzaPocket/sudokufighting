import type { AttackType } from './game.js';

// ── Client → Server ──────────────────────────────────────────────────────────

export type ClientMessage =
  | { type: 'find_match';           payload: { characterId: string; name: string; preferredArenaId: string | null } }
  | { type: 'create_room';          payload: { characterId: string; name: string } }
  | { type: 'join_room';            payload: { shareCode: string; characterId: string; name: string } }
  | { type: 'start_singleplayer';   payload: { characterId: string; name: string; difficulty: 'easy' | 'normal' | 'extreme'; aiCharacterId: string; aiName: string; preferredArenaId: string | null } }
  | { type: 'set_arena_preference'; payload: { arenaId: string } }
  | { type: 'cell_input';           payload: { row: number; col: number; value: number } }
  | { type: 'cursor_move';          payload: { row: number; col: number } }
  | { type: 'surrender';            payload: Record<string, never> }
  | { type: 'next_round';           payload: Record<string, never> };

// ── Server → Client ──────────────────────────────────────────────────────────

export type ServerMessage =
  | { type: 'connected';              payload: { playerId: string } }
  | { type: 'waiting_for_opponent';   payload: { shareCode: string } }
  | { type: 'room_assigned';          payload: { roomId: string } }
  | { type: 'room_created';           payload: { roomId: string; shareCode: string } }
  | { type: 'room_not_found';         payload: Record<string, never> }
  | { type: 'room_full';              payload: Record<string, never> }
  | { type: 'player_joined';          payload: { playerId: string; seat: 0 | 1; name: string; characterId: string; useAlt: boolean } }
  | { type: 'opponent_joined';        payload: { name: string; characterId: string; useAlt: boolean; seat: 0 | 1 } }
  | { type: 'opponent_left_lobby';    payload: Record<string, never> }
  | { type: 'game_start';             payload: { roundNumber: number; puzzle: (number | null)[][]; solution: number[][]; opponentGivens: (number | null)[][]; opponentName: string; opponentCharacter: string; mySeat: 0 | 1; myUseAlt: boolean; opponentUseAlt: boolean; roundStartTime: number; backgroundId: string } }
  | { type: 'cell_update';            payload: { seat: 0 | 1; row: number; col: number; value: number; isCorrect: boolean } }
  | { type: 'cursor_update';          payload: { seat: 0 | 1; row: number; col: number } }
  | { type: 'attack_incoming';        payload: { attackerSeat: 0 | 1; type: AttackType; damage: number; attackId: string; delayMs: number } }
  | { type: 'counter_window_active';  payload: { defenderSeat: 0 | 1; expiresAt: number; attackId: string } }
  | { type: 'attack_landed';          payload: { attackerSeat: 0 | 1; defenderSeat: 0 | 1; type: AttackType; damage: number } }
  | { type: 'counter_landed';         payload: { counterSeat: 0 | 1; reducedDamage: number; counterDamage: number; attackType: AttackType } }
  | { type: 'auto_counter';           payload: { attackId: string } }
  | { type: 'health_update';          payload: { health: [number, number] } }
  | { type: 'combo_update';           payload: { seat: 0 | 1; combo: number } }
  | { type: 'score_update';           payload: { seat: 0 | 1; score: number } }
  | { type: 'self_damage';            payload: { seat: 0 | 1; damage: number } }
  | { type: 'row_wiped';              payload: { targetSeat: 0 | 1; row: number } }
  | { type: 'column_wiped';           payload: { targetSeat: 0 | 1; col: number } }
  | { type: 'box_wiped';              payload: { targetSeat: 0 | 1; boxRow: number; boxCol: number } }
  | { type: 'puzzle_complete';        payload: { seat: 0 | 1 } }
  | { type: 'time_up';                payload: Record<string, never> }
  | { type: 'round_end';              payload: { winnerSeat: 0 | 1 | -1; roundWins: [number, number]; roundNumber: number } }
  | { type: 'match_end';              payload: { winnerSeat: 0 | 1 | -1; winnerName: string } }
  | { type: 'opponent_disconnected';  payload: { seat: 0 | 1 } };

export type { AttackType };
