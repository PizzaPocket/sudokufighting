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
  onlineWins: number;
  onlineLosses: number;
  winRate: number | null;                 // null = no online games played yet
  bestWinStreak: number;
  matchesOnline: number;
  matchesCampaign: number;
  matchesPractice: number;
  highestScore: number | null;
  fastestWinMs: number | null;
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

export async function recordMatch(input: RecordMatchInput): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) return;
  // quick and friend matches are written server-side by the backend (service key,
  // bypasses RLS) — skip client-side write to avoid duplicates
  if (input.gameMode === 'quick' || input.gameMode === 'friend') return;

  const multiplier = input.difficulty
    ? (CAMPAIGN_SCORE_MULTIPLIERS[input.difficulty] ?? 1.0)
    : 1.0;

  await supabase.from('match_history').insert({
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
  const { count } = await supabase
    .from('match_history')
    .select('id', { count: 'exact', head: true })
    .eq('game_mode', 'campaign')
    .eq('result', 'win')
    .gt('adjusted_score', adjustedScore);
  return (count ?? 0) + 1;
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
    .select('game_mode, result, score, match_duration_ms, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const rows = data ?? [];

  // Online = ranked modes (quick matchmaking + private friend rooms)
  const onlineRows = rows.filter(r => r.game_mode === 'quick' || r.game_mode === 'friend');
  const onlineWins   = onlineRows.filter(r => r.result === 'win').length;
  const onlineLosses = onlineRows.filter(r => r.result === 'loss').length;
  const totalDecided = onlineWins + onlineLosses;
  const winRate = totalDecided > 0 ? Math.round((onlineWins / totalDecided) * 100) : null;

  // Best win streak — ties do not break the streak
  let streak = 0;
  let bestWinStreak = 0;
  for (const r of onlineRows) {
    if (r.result === 'win')       { streak++; bestWinStreak = Math.max(bestWinStreak, streak); }
    else if (r.result === 'loss') { streak = 0; }
  }

  // Match counts by mode
  const matchesOnline   = onlineRows.length;
  const matchesCampaign = rows.filter(r => r.game_mode === 'campaign').length;
  const matchesPractice = rows.filter(r => r.game_mode === 'practice').length;

  // Personal bests across all modes
  const scores = rows.map(r => r.score as number).filter(s => s > 0);
  const highestScore = scores.length > 0 ? Math.max(...scores) : null;

  const winDurations = rows
    .filter(r => r.result === 'win' && r.match_duration_ms != null)
    .map(r => r.match_duration_ms as number);
  const fastestWinMs = winDurations.length > 0 ? Math.min(...winDurations) : null;

  return {
    onlineWins,
    onlineLosses,
    winRate,
    bestWinStreak,
    matchesOnline,
    matchesCampaign,
    matchesPractice,
    highestScore,
    fastestWinMs,
  };
}
