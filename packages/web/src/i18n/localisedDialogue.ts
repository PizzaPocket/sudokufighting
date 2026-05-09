import i18next from 'i18next';
import { MASTER_CHOW_INTRO, MATCH_DIALOGUE } from '@sudoku-fighting/shared';

/**
 * Returns Master Chow's intro lines for the given player character, translated
 * to the current locale. Falls back to the English strings from dialogue.ts.
 */
export function getLocalisedChowIntro(charId: string): string[] {
  const fallback = MASTER_CHOW_INTRO[charId] ?? [];
  return fallback.map((_, idx) => {
    const key = `dialogue:chow_intro.${charId}.${idx}`;
    const val = i18next.t(key);
    return val !== key ? val : fallback[idx];
  });
}

/**
 * Returns the localised speaker name and dialogue lines for a match-up.
 * Speaker name is resolved from the characters namespace using opponentCharId.
 * Falls back to English strings from dialogue.ts.
 */
export function getLocalisedMatchDialogue(
  playerCharId: string,
  opponentCharId: string,
): { speaker: string; lines: string[] } | null {
  const fallback = MATCH_DIALOGUE[playerCharId]?.[opponentCharId] ?? null;
  if (!fallback) return null;

  const speakerKey = `characters:${opponentCharId}`;
  const speaker = i18next.t(speakerKey, { defaultValue: fallback.speaker });

  const lines = fallback.lines.map((_, idx) => {
    const key = `dialogue:match.${playerCharId}.${opponentCharId}.lines.${idx}`;
    const val = i18next.t(key);
    return val !== key ? val : fallback.lines[idx];
  });

  return { speaker, lines };
}
