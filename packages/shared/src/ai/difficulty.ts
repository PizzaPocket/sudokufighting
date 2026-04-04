import type { Difficulty } from '../types/game.js';

export interface DifficultyConfig {
  avgMs: number;
  jitterMs: number;
  errorRate: number;
  errorDelayMs: number;
  wrongGuessDamage: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy:    { avgMs: 10000, jitterMs: 4000, errorRate: 0.20, errorDelayMs: 900, wrongGuessDamage: 200 },
  normal:  { avgMs:  5000, jitterMs: 2000, errorRate: 0.08, errorDelayMs: 700, wrongGuessDamage: 320 },
  extreme: { avgMs:  2500, jitterMs: 1000, errorRate: 0.02, errorDelayMs: 450, wrongGuessDamage: 400 },
};
