export { ANIMATION_CONFIG } from './types/character.js';
// Constants
export * from './constants.js';
// Arenas
export { ARENAS, getArena } from './arenas.js';
// Puzzle
export { generatePuzzle } from './puzzle/generate.js';
export { isValid, fillGrid, countSolutions, shuffle } from './puzzle/solve.js';
export { isRowComplete, isColComplete, isBoxComplete, isPuzzleComplete } from './puzzle/validate.js';
// Combat
export { speedMultiplier, comboMultiplier, cellDamage, completionDamage } from './combat/damage.js';
export { wipeRow, wipeCol, wipeBox } from './combat/wipe.js';
export { handleCellInput, applyDamageFromAttack, applyCounterDamage } from './combat/engine.js';
// AI
export { buildCellQueue, sortForCompletions, scheduleNext, DIFFICULTY_CONFIG } from './ai/index.js';
