export type Difficulty = 'easy' | 'medium' | 'hard';
export type Grid = (number | null)[][];
export type SolutionGrid = number[][];
export interface PuzzleState {
    given: Grid;
    solution: SolutionGrid;
    playerGrid: Grid;
    correctCount: number;
}
export interface CounterWindow {
    active: boolean;
    expiry: number | null;
    attackId?: string;
}
export interface PendingAttack {
    id: string;
    attackerSeat: 0 | 1;
    defenderSeat: 0 | 1;
    type: AttackType;
    damage: number;
    counterUsed: boolean;
}
export type AttackType = 'punch' | 'kick' | 'row_special' | 'column_special' | 'subgrid_special';
export interface RoundState {
    puzzles: [PuzzleState, PuzzleState];
    health: [number, number];
    combo: [number, number];
    consecutiveCorrect: [number, number];
    lastCorrectTime: [number | null, number | null];
    score: [number, number];
    pendingAttacks: PendingAttack[];
    counterWindows: [CounterWindow, CounterWindow];
}
//# sourceMappingURL=game.d.ts.map