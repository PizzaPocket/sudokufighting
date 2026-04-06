import type { RoundState, AttackType } from '../types/game.js';
import type { ServerMessage } from '../types/socket-events.js';
/**
 * Process a cell input from one player.
 * Returns an array of ServerMessage events (same shape as server broadcasts).
 * The caller must:
 *   1. Dispatch events into the game state immediately.
 *   2. For attack_incoming events: schedule a setTimeout(ATTACK_DELAY_MS) that
 *      calls applyDamageFromAttack() and dispatches the resulting events.
 */
export declare function handleCellInput(round: RoundState, attackerSeat: 0 | 1, row: number, col: number, value: number, wrongGuessDamage?: number): ServerMessage[];
export declare function applyDamageFromAttack(round: RoundState, attackId: string): {
    events: ServerMessage[];
    attackType: AttackType;
    attackerSeat: 0 | 1;
    defenderSeat: 0 | 1;
} | null;
export declare function applyCounterDamage(round: RoundState, attackId: string): {
    events: ServerMessage[];
    counterSeat: 0 | 1;
} | null;
//# sourceMappingURL=engine.d.ts.map