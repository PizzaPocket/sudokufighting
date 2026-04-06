import { DIFFICULTY_CONFIG } from './ai/difficulty.js';
export const CAMPAIGN_FIGHTS = [
    { fightIndex: 0, opponentCharacterId: 'fighter1', arenaId: 'bg_1', difficultyScale: 0.85 },
    { fightIndex: 1, opponentCharacterId: 'fighter2', arenaId: 'bg_2', difficultyScale: 1.0 },
    { fightIndex: 2, opponentCharacterId: 'fighter3', arenaId: 'bg_3', difficultyScale: 1.1 },
    { fightIndex: 3, opponentCharacterId: 'fighter4', arenaId: 'bg_4', difficultyScale: 1.15 },
    { fightIndex: 4, opponentCharacterId: 'fighter5', arenaId: 'bg_5', difficultyScale: 1.2 },
];
/**
 * Resolve which opponent character + name to use for a given fight index,
 * accounting for mirror-match alt swapping. Does NOT write to any store.
 */
export function resolveNextFight(fightIndex, myCharacterId, characters) {
    const fight = CAMPAIGN_FIGHTS[fightIndex];
    if (!fight)
        return null;
    const opponent = characters.find(c => c.id === fight.opponentCharacterId) ?? null;
    const isMirror = myCharacterId === fight.opponentCharacterId ||
        (opponent?.altId != null && myCharacterId === opponent.altId);
    const opponentCharId = isMirror && opponent?.altId ? opponent.altId : fight.opponentCharacterId;
    const opponentName = isMirror && opponent?.altName ? opponent.altName : (opponent?.name ?? 'CPU');
    return { opponentCharId, opponentName, useAlt: isMirror, arenaId: fight.arenaId };
}
/** Scale AI timing/error rate per fight. Player's wrongGuessDamage is unchanged. */
export function getCampaignFightConfig(baseDifficulty, fightIndex) {
    const base = DIFFICULTY_CONFIG[baseDifficulty];
    const scale = CAMPAIGN_FIGHTS[fightIndex]?.difficultyScale ?? 1.0;
    return {
        avgMs: Math.round(base.avgMs / scale),
        jitterMs: base.jitterMs,
        errorRate: Math.min(base.errorRate / scale, 0.40),
        errorDelayMs: Math.round(base.errorDelayMs / scale),
        wrongGuessDamage: base.wrongGuessDamage, // unchanged — difficulty scaling only affects AI speed
    };
}
