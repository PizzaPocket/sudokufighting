import type { PuzzleState, Difficulty } from '../types/game.js';
export interface BotCell {
    row: number;
    col: number;
    value: number;
}
export interface BotSession {
    stopped: boolean;
    timeouts: Set<number>;
}
export declare function buildCellQueue(puzz: PuzzleState, difficulty: Difficulty): BotCell[];
export declare function sortForCompletions(cells: BotCell[]): BotCell[];
export declare function scheduleNext(queue: BotCell[], session: BotSession, difficulty: Difficulty, makeBotMove: (row: number, col: number, value: number) => void, 
/** Optional: called each tick to replenish wiped cells */
replenish?: (queue: BotCell[]) => void): void;
//# sourceMappingURL=scheduler.d.ts.map