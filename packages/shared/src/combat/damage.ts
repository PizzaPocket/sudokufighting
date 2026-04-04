import { MAX_SPEED_MULTIPLIER, SPEED_DECAY_MS } from '../constants.js';

export function speedMultiplier(elapsedMs: number): number {
  return Math.max(1, MAX_SPEED_MULTIPLIER - Math.floor(elapsedMs / SPEED_DECAY_MS));
}

export function comboMultiplier(combo: number): number {
  return 1 + combo * 0.1;
}

export function cellDamage(speedMult: number, comboMult: number): number {
  return Math.round(5 * speedMult * comboMult);
}

export function completionDamage(n: number, speedMult: number, comboMult: number): number {
  return Math.round(25 * n * speedMult * comboMult);
}
