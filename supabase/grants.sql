-- ============================================================
-- Explicit table grants for Sudoku Fighting
-- Required from October 30 2026 (Supabase enforces this on
-- all existing projects; new projects from May 30 2026).
--
-- Run this in the Supabase SQL editor after rls.sql.
-- ============================================================

-- ── match_history ────────────────────────────────────────────
-- anon: public leaderboard reads (getCampaignRank, public leaderboard read policy)
-- authenticated: own match reads (loadMyStats) + practice/campaign inserts
-- service_role: backend writes quick/friend results server-side (bypasses RLS)
GRANT SELECT                       ON public.match_history TO anon;
GRANT SELECT, INSERT               ON public.match_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_history TO service_role;

-- ── profiles ─────────────────────────────────────────────────
-- anon: leaderboard username lookups
-- authenticated: own profile read + update; insert on signup
-- service_role: backend createProfile server-side
GRANT SELECT                         ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE         ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- ── progression ──────────────────────────────────────────────
-- authenticated: load + upsert own progression (no guest access needed)
-- service_role: in case backend ever needs to touch progression
GRANT SELECT, INSERT, UPDATE         ON public.progression TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progression TO service_role;
