import type { Difficulty } from './types/game.js';
import type { Character } from './types/character.js';
import type { DifficultyConfig } from './ai/difficulty.js';
export interface CampaignFight {
    fightIndex: number;
    opponentCharacterId: string;
    arenaId: string;
    difficultyScale: number;
}
export declare const CAMPAIGN_FIGHTS: CampaignFight[];
export interface ResolvedFight {
    opponentCharId: string;
    opponentName: string;
    useAlt: boolean;
    arenaId: string;
}
/**
 * Resolve which opponent character + name to use for a given fight index,
 * accounting for mirror-match alt swapping. Does NOT write to any store.
 */
export declare function resolveNextFight(fightIndex: number, myCharacterId: string | null, characters: Character[]): ResolvedFight | null;
/** Scale AI timing/error rate per fight. Player's wrongGuessDamage is unchanged. */
export declare function getCampaignFightConfig(baseDifficulty: Difficulty, fightIndex: number): DifficultyConfig;
//# sourceMappingURL=campaign.d.ts.map