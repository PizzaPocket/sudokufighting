// Types
export type { Character, AnimationState, AnimationConfig } from './types/character.js';
export { ANIMATION_CONFIG } from './types/character.js';
export type { Arena, ArenaOverlay } from './types/arena.js';
export type { AttackType, RoundState, PuzzleState, CounterWindow, PendingAttack, Difficulty, Grid, SolutionGrid } from './types/game.js';
export type { ServerMessage, ClientMessage } from './types/socket-events.js';

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
export type { BotCell, BotSession, DifficultyConfig } from './ai/index.js';

// Campaign
export { CAMPAIGN_FIGHTS, getCampaignFightConfig, resolveNextFight } from './campaign.js';
export type { CampaignFight, ResolvedFight } from './campaign.js';

// Dialogue
export { MASTER_CHOW_INTRO, MATCH_DIALOGUE, getMatchDialogue } from './dialogue.js';
export type { DialogueEntry } from './dialogue.js';
