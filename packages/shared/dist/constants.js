// Game constants — single source of truth for both client and server logic
export const STARTING_HEALTH = 1800;
export const WRONG_GUESS_DAMAGE = 400;
export const COUNTER_DAMAGE_REDUCTION = 0.5; // defender takes 50% of attack
export const COUNTER_DAMAGE_TO_ATTACKER = 60; // flat penalty on attacker
export const BASE_CELL_DAMAGE = 5;
export const COMPLETION_BASE = 25;
export const MAX_SPEED_MULTIPLIER = 10;
export const SPEED_DECAY_MS = 2000; // speed drops 1 per this interval
export const ROUND_DURATION_MS = 99000;
export const ATTACK_DELAY_MS = 1500;
export const COUNTER_WINDOW_MS = 1500;
export const HEALTH_UPDATE_DELAY_LIGHT = 150; // ms after attack_landed (punch)
export const HEALTH_UPDATE_DELAY_HEAVY = 300; // ms after attack_landed (kick/special)
