-- ============================================================
-- Leaderboard RPC functions for Sudoku Fighting
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Ranked (Quick Match) leaderboard — wins only, no private rooms ────────────
-- One row per player, sorted by win count.
DROP FUNCTION IF EXISTS get_online_leaderboard();
CREATE FUNCTION get_online_leaderboard()
RETURNS TABLE(username text, wins bigint)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT p.username, COUNT(*)::bigint AS wins
  FROM match_history m
  JOIN profiles p ON p.id = m.user_id
  WHERE m.game_mode = 'quick'
    AND m.result    = 'win'
  GROUP BY p.id, p.username
  ORDER BY wins DESC
  LIMIT 50;
$$;
GRANT EXECUTE ON FUNCTION get_online_leaderboard() TO anon, authenticated;

-- ── Campaign leaderboard — best single run per player ────────────────────────
-- DISTINCT ON picks the highest adjusted_score row per user, then we sort
-- globally so rank 1 is the highest score across all players.
DROP FUNCTION IF EXISTS get_campaign_leaderboard();
CREATE FUNCTION get_campaign_leaderboard()
RETURNS TABLE(username text, score integer, adjusted_score integer, difficulty text)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT p.username, sub.score, sub.adjusted_score, sub.difficulty
  FROM (
    SELECT DISTINCT ON (user_id)
      user_id, score, adjusted_score, difficulty
    FROM match_history
    WHERE game_mode = 'campaign'
      AND result    = 'win'
    ORDER BY user_id, adjusted_score DESC
  ) sub
  JOIN profiles p ON p.id = sub.user_id
  ORDER BY sub.adjusted_score DESC
  LIMIT 50;
$$;
GRANT EXECUTE ON FUNCTION get_campaign_leaderboard() TO anon, authenticated;
