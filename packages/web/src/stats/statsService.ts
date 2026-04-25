import { supabase } from '../auth/supabaseClient';
import { useAuthStore } from '../auth/authStore';

// Campaign difficulty multipliers — harder difficulty scores are normalized upward
// so the leaderboard ranks effort fairly across all difficulties.
export const CAMPAIGN_SCORE_MULTIPLIERS: Record<string, number> = {
  easy:    1.0,
  normal:  1.75,
  extreme: 3.0,
};

export interface RecordMatchInput {
  gameMode: string;                       // 'quick' | 'friend' | 'practice' | 'campaign'
  result: 'win' | 'loss' | 'tie';
  characterId: string;
  opponentName: string | null;
  score: number;
  difficulty: string | null;              // only set for campaign
  matchDurationMs: number;
}

export interface MyStats {
  rankedWins: number;                     // Quick Match only
  rankedLosses: number;                   // Quick Match only
  winRate: number | null;                 // null = no ranked games decided yet
  bestWinStreak: number;                  // Quick Match only
  matchesQuick: number;
  matchesCampaign: number;
  matchesPractice: number;
  bestCampaignScore: number | null;       // raw score from best-adjusted run
  bestCampaignDifficulty: string | null;
}

// ── Pending match (retroactive save after guest signs up at game end) ─────────

let pendingMatch: RecordMatchInput | null = null;

export function setPendingMatch(m: RecordMatchInput | null): void {
  pendingMatch = m;
}

/** Returns and clears the pending match so it is only saved once. */
export function consumePendingMatch(): RecordMatchInput | null {
  const m = pendingMatch;
  pendingMatch = null;
  return m;
}

// ── Write ─────────────────────────────────────────────────────────────────────

/** Returns true if the record was saved successfully, false otherwise. */
export async function recordMatch(input: RecordMatchInput): Promise<boolean> {
  const user = useAuthStore.getState().user;
  if (!user) return false;
  // quick and friend matches are written server-side by the backend (service key,
  // bypasses RLS) — skip client-side write to avoid duplicates
  if (input.gameMode === 'quick' || input.gameMode === 'friend') return false;

  const multiplier = input.difficulty
    ? (CAMPAIGN_SCORE_MULTIPLIERS[input.difficulty] ?? 1.0)
    : 1.0;

  const { error } = await supabase.from('match_history').insert({
    user_id:          user.id,
    game_mode:        input.gameMode,
    result:           input.result,
    character_id:     input.characterId,
    opponent_name:    input.opponentName,
    difficulty:       input.difficulty,
    score:            input.score,
    adjusted_score:   Math.round(input.score * multiplier),
    match_duration_ms: input.matchDurationMs,
  });
  if (error) {
    console.error('[recordMatch] insert failed:', error.message, error.code, error.details, error.hint);
    return false;
  }
  return true;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardOnlineRow {
  rank: number;
  username: string;
  wins: number;
}

export interface LeaderboardCampaignRow {
  rank: number;
  username: string;
  score: number;
  adjusted_score: number;
  difficulty: string;
}

export async function loadOnlineLeaderboard(): Promise<LeaderboardOnlineRow[]> {
  const { data } = await supabase.rpc('get_online_leaderboard');
  return (data ?? []).map((row: { username: string; wins: number }, i: number) => ({
    rank: i + 1,
    username: row.username,
    wins: Number(row.wins),
  }));
}

export async function getCampaignRank(adjustedScore: number): Promise<number> {
  // Count unique players whose best campaign run beats our score.
  // Fetching user_ids (not a count) so we can deduplicate — one player
  // with multiple qualifying runs should count once, not once per run.
  const { data } = await supabase
    .from('match_history')
    .select('user_id')
    .eq('game_mode', 'campaign')
    .eq('result', 'win')
    .gt('adjusted_score', adjustedScore);
  const uniquePlayers = new Set((data ?? []).map((r: { user_id: string }) => r.user_id)).size;
  return uniquePlayers + 1;
}

export async function loadCampaignLeaderboard(): Promise<LeaderboardCampaignRow[]> {
  const { data } = await supabase.rpc('get_campaign_leaderboard');
  return (data ?? []).map((row: { username: string; score: number; adjusted_score: number; difficulty: string }, i: number) => ({
    rank: i + 1,
    username: row.username,
    score: row.score,
    adjusted_score: row.adjusted_score,
    difficulty: row.difficulty,
  }));
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function loadMyStats(userId: string): Promise<MyStats> {
  const { data } = await supabase
    .from('match_history')
    .select('game_mode, result, score, adjusted_score, difficulty, match_duration_ms, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const rows = data ?? [];

  // Ranked = Quick Match only. Private Room is social, not competitive.
  const rankedRows   = rows.filter(r => r.game_mode === 'quick');
  const rankedWins   = rankedRows.filter(r => r.result === 'win').length;
  const rankedLosses = rankedRows.filter(r => r.result === 'loss').length;
  const totalDecided = rankedWins + rankedLosses;
  const winRate      = totalDecided > 0 ? Math.round((rankedWins / totalDecided) * 100) : null;

  // Best win streak — ties do not break the streak; ranked only
  let streak = 0;
  let bestWinStreak = 0;
  for (const r of rankedRows) {
    if (r.result === 'win')       { streak++; bestWinStreak = Math.max(bestWinStreak, streak); }
    else if (r.result === 'loss') { streak = 0; }
  }

  // Match counts by mode
  const matchesQuick    = rankedRows.length;
  const matchesCampaign = rows.filter(r => r.game_mode === 'campaign').length;
  const matchesPractice = rows.filter(r => r.game_mode === 'practice').length;

  // Best campaign run: pick the win with the highest adjusted_score
  // (adjusted_score is what the leaderboard ranks by; we surface the raw score
  // + difficulty so the number matches what the user saw on the victory screen)
  const campaignWins = rows.filter(r => r.game_mode === 'campaign' && r.result === 'win');
  const bestRun = campaignWins.reduce((best: typeof rows[0] | null, row) => {
    const rowAdj  = (row.adjusted_score as number) ?? (row.score as number) ?? 0;
    const bestAdj = best ? ((best.adjusted_score as number) ?? (best.score as number) ?? 0) : -1;
    return rowAdj > bestAdj ? row : best;
  }, null);

  return {
    rankedWins,
    rankedLosses,
    winRate,
    bestWinStreak,
    matchesQuick,
    matchesCampaign,
    matchesPractice,
    bestCampaignScore:      bestRun ? (bestRun.score as number)      : null,
    bestCampaignDifficulty: bestRun ? (bestRun.difficulty as string)  : null,
  };
}
