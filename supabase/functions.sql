-- ============================================================
-- Leaderboard RPC functions for Sudoku Fighting
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Campaign leaderboard — all runs ranked by score ──────────────────────────
-- Every campaign win is an independent entry; the same player can hold
-- multiple spots. Rank 1 is the highest adjusted_score across all runs.
DROP FUNCTION IF EXISTS get_campaign_leaderboard();
CREATE FUNCTION get_campaign_leaderboard()
RETURNS TABLE(username text, score integer, adjusted_score integer, difficulty text)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT p.username, mh.score, mh.adjusted_score, mh.difficulty
  FROM match_history mh
  JOIN profiles p ON p.id = mh.user_id
  WHERE mh.game_mode = 'campaign'
    AND mh.result    = 'win'
  ORDER BY mh.adjusted_score DESC
  LIMIT 50;
$$;
GRANT EXECUTE ON FUNCTION get_campaign_leaderboard() TO anon, authenticated;
