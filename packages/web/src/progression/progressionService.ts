import { supabase } from '../auth/supabaseClient';
import { useAuthStore } from '../auth/authStore';

export interface ProgressionData {
  unlockedCharacterIds: string[];
  campaignClearCount: number;
}

export const BASE_UNLOCKED = ['fighter1', 'fighter2', 'fighter3', 'fighter4'];

/** Load progression from Supabase and hydrate the game store. No-op for guests. */
export async function loadProgressionFromDB(userId: string): Promise<void> {
  // Lazy import avoids a circular dependency (gameStore → progressionService → gameStore)
  const { useGameStore } = await import('../store/gameStore');

  const { data } = await supabase
    .from('progression')
    .select('unlocked_character_ids, campaign_clear_count')
    .eq('user_id', userId)
    .maybeSingle();

  if (data) {
    const merged = [...new Set([...BASE_UNLOCKED, ...(data.unlocked_character_ids as string[])])];
    useGameStore.setState({
      unlockedCharacterIds: merged,
      campaignClearCount: data.campaign_clear_count as number,
    } as never);
  }
}

/** Persist progression to Supabase. Fire-and-forget for guests (no-op). */
export async function saveProgression(data: ProgressionData): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) return;

  await supabase.from('progression').upsert({
    user_id: user.id,
    unlocked_character_ids: data.unlockedCharacterIds,
    campaign_clear_count: data.campaignClearCount,
    updated_at: new Date().toISOString(),
  });
}

/** Fallback for code paths that haven't been migrated — returns in-memory defaults. */
export function loadProgression(): ProgressionData {
  return { unlockedCharacterIds: [...BASE_UNLOCKED], campaignClearCount: 0 };
}
