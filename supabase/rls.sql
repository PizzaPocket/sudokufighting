-- ============================================================
-- Row Level Security policies for Sudoku Fighting
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── match_history ────────────────────────────────────────────

ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- Users can read their own match history (for AccountScreen stats)
DROP POLICY IF EXISTS "users can read own matches" ON match_history;
CREATE POLICY "users can read own matches"
  ON match_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Leaderboard reads are public (needed for Scoreboard without login)
DROP POLICY IF EXISTS "public leaderboard read" ON match_history;
CREATE POLICY "public leaderboard read"
  ON match_history FOR SELECT
  TO anon
  USING (true);

-- Users can only insert practice/campaign rows — quick and friend matches
-- are written server-side by the Node.js backend using the service-role key,
-- which bypasses RLS entirely. Blocking these here prevents fabricated wins.
DROP POLICY IF EXISTS "users can record own unranked matches" ON match_history;
CREATE POLICY "users can record own unranked matches"
  ON match_history FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND game_mode NOT IN ('quick', 'friend')
  );

-- No client-side UPDATE or DELETE ever
DROP POLICY IF EXISTS "no client update" ON match_history;
DROP POLICY IF EXISTS "no client delete" ON match_history;

-- ── profiles ─────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles (for leaderboard username lookups)
DROP POLICY IF EXISTS "public profile read" ON profiles;
CREATE POLICY "public profile read"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Users can only update their own profile
DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auth trigger handles INSERT (createProfile called server-side in authService)
DROP POLICY IF EXISTS "users can insert own profile" ON profiles;
CREATE POLICY "users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ── progression ──────────────────────────────────────────────

ALTER TABLE progression ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own progression" ON progression;
CREATE POLICY "users can read own progression"
  ON progression FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can upsert own progression" ON progression;
CREATE POLICY "users can upsert own progression"
  ON progression FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own progression"
  ON progression FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
