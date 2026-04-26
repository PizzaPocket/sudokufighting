import { useEffect } from 'react';
import { CAMPAIGN_FIGHTS, ARENAS, resolveNextFight, getMatchDialogue, MASTER_CHOW_INTRO } from '@sudoku-fighting/shared';
import type { Character, DialogueEntry } from '@sudoku-fighting/shared';
import { useGameStore } from '../store/gameStore';
import { saveProgression } from '../progression/progressionService';
import { fadeOutMusic } from '../audio/audioManager';
import { preloadArenaAssets } from '../utils/preloadAssets';
import { recordMatch, getCampaignRank } from '../stats/statsService';
import { useAuthStore } from '../auth/authStore';
import { supabase } from '../auth/supabaseClient';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function setupNextFight(
  fightIndex: number,
  myCharacter: string | null,
  characters: Character[]
) {
  const fight = CAMPAIGN_FIGHTS[fightIndex];
  if (!fight) return;

  const resolved = resolveNextFight(fightIndex, myCharacter, characters);
  if (!resolved) return;

  useGameStore.setState({
    opponentCharacter: resolved.opponentCharId,
    opponentName: resolved.opponentName,
    opponentUseAlt: resolved.useAlt,
    backgroundId: fight.arenaId,
  } as never);
}

/**
 * Build the full dialogue queue for starting campaign from fight 0:
 * Master Chow intro + first opponent monologue.
 */
export function buildCampaignStartQueue(
  myCharacterId: string,
  characters: Character[],
): DialogueEntry[] {
  const queue: DialogueEntry[] = [];

  const masterChowLines = MASTER_CHOW_INTRO[myCharacterId];
  if (masterChowLines) {
    queue.push({
      speakerName: 'Master Chow',
      portraitPath: '/characters/portrait_master_chow.png',
      lines: masterChowLines,
      backgroundSrc: null,
    });
  }

  const entry = buildOpponentDialogueEntry(0, myCharacterId, characters);
  if (entry) queue.push(entry);

  return queue;
}

/** Build the opponent monologue entry for fight at fightIndex (no store mutation). */
export function buildOpponentDialogueEntry(
  fightIndex: number,
  myCharacterId: string | null,
  characters: Character[],
): DialogueEntry | null {
  const fight = CAMPAIGN_FIGHTS[fightIndex];
  if (!fight) return null;

  const resolved = resolveNextFight(fightIndex, myCharacterId, characters);
  if (!resolved) return null;

  const matchDialogue = getMatchDialogue(myCharacterId ?? '', resolved.opponentCharId);
  if (!matchDialogue) return null;

  const opponentChar = characters.find(c => c.id === resolved.opponentCharId);
  const arena = ARENAS.find(a => a.id === resolved.arenaId);
  const backgroundSrc = arena?.dialogueBg ?? arena?.background ?? null;

  return {
    speakerName: matchDialogue.speaker,
    portraitPath: opponentChar?.portraitPath ?? '/characters/placeholder_fighter.svg',
    lines: matchDialogue.lines,
    backgroundSrc,
  };
}

function calculateUnlocks(
  unlockedCharacterIds: string[],
  myCharacter: string | null,
  characters: Character[]
): string[] {
  const newIds: string[] = [];

  // Always unlock fighter5 on first campaign clear
  if (!unlockedCharacterIds.includes('fighter5')) {
    newIds.push('fighter5');
  }

  // Unlock the player's alt character
  const myChar = characters.find(c => c.id === myCharacter);
  if (myChar?.altId && !unlockedCharacterIds.includes(myChar.altId)) {
    newIds.push(myChar.altId);
  }

  return newIds;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCampaign() {
  const matchOver = useGameStore(s => s.matchOver);
  const matchWinnerSeat = useGameStore(s => s.matchWinnerSeat);
  const gameMode = useGameStore(s => s.gameMode);

  useEffect(() => {
    if (gameMode !== 'campaign' || !matchOver) return;

    const st = useGameStore.getState();
    const playerWon = matchWinnerSeat === 0;
    const fightIndex = st.campaignFightIndex;

    if (!playerWon) {
      fadeOutMusic(1500);
      useGameStore.setState({ campaignResult: 'gameover' } as never);
      return;
    }

    if (fightIndex >= CAMPAIGN_FIGHTS.length - 1) {
      // Final fight — victory
      const newUnlocks = calculateUnlocks(st.unlockedCharacterIds, st.myCharacter, st.characters);
      const merged = [...new Set([...st.unlockedCharacterIds, ...newUnlocks])];

      // finalMatchScore already includes the real-time difficulty multiplier
      // and the flawless ×2 bonus (computed in match_end store handler).
      const campaignTotal = st.campaignTotalScore + st.finalMatchScore;

      useGameStore.setState({
        campaignResult: 'victory',
        unlockedCharacterIds: merged,
        pendingUnlockIds: newUnlocks,
        campaignClearCount: st.campaignClearCount + 1,
        campaignFinalScore: campaignTotal,
        campaignTotalScore: campaignTotal,
        campaignFinalRank: null,
      } as never);
      // Run saves sequentially — concurrent supabase.from() calls both trigger
      // getSession() at the same time, which deadlocks with the lock bypass.
      void (async () => {
        // Refresh the session before writing — access token may have expired during
        // a long campaign run. getSession() triggers a token refresh if needed and
        // updates the store so recordMatch can use a valid user.
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) useAuthStore.getState().setUser(session.user);
        } catch (e) {
          console.error('[campaign victory] session refresh failed:', e);
        }

        await saveProgression({ unlockedCharacterIds: merged, campaignClearCount: st.campaignClearCount + 1 });
        if (st.myCharacter && useAuthStore.getState().user) {
          try {
            const saved = await recordMatch({
              gameMode: 'campaign',
              result: 'win',
              characterId: st.myCharacter,
              opponentName: null,
              score: campaignTotal,
              difficulty: st.spDifficulty,
              matchDurationMs: 0,
            });
            if (saved) {
              const rank = await getCampaignRank(campaignTotal);
              useGameStore.setState({ campaignFinalRank: rank } as never);
              // Leaderboard may have already loaded while victory screen was showing.
              // Bump authVersion so LeaderboardCard re-fetches with the new entry.
              useAuthStore.getState().bumpAuthVersion();
            }
          } catch (e) {
            console.error('[campaign victory] save failed:', e);
          }
        }
      })();
    } else {
      // Non-final win — pre-build next opponent's dialogue queue.
      // Do NOT call setupNextFight here (would flicker background/opponent while
      // the victory screen is still showing). setupNextFight is called in
      // DialogueCutscene right before transitioning to gameplay.
      const nextIndex = fightIndex + 1;
      // Preload next arena's assets while the dialogue cutscene plays
      preloadArenaAssets(CAMPAIGN_FIGHTS[nextIndex].arenaId);
      const entry = buildOpponentDialogueEntry(nextIndex, st.myCharacter, st.characters);
      const queue: DialogueEntry[] = entry ? [entry] : [];

      useGameStore.setState({
        campaignFightIndex: nextIndex,
        campaignDialogueQueue: queue,
        campaignResult: 'continue',
        campaignTotalScore: st.campaignTotalScore + st.finalMatchScore,
      } as never);
    }
  }, [matchOver, matchWinnerSeat, gameMode]); // eslint-disable-line react-hooks/exhaustive-deps
}
