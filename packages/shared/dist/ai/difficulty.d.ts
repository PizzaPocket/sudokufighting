import type { Difficulty } from '../types/game.js';
export interface DifficultyConfig {
    avgMs: number;
    jitterMs: number;
    errorRate: number;
    errorDelayMs: number;
    wrongGuessDamage: number;
}
export declare const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig>;
//# sourceMappingURL=difficulty.d.ts.map