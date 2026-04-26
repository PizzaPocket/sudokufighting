import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../auth/authStore';
import {
  loadCampaignLeaderboard,
  type LeaderboardCampaignRow,
} from '../stats/statsService';

const ROWS = 5;

export default function LeaderboardCard() {
  const setScoreboardOpen = useGameStore(s => s.setScoreboardOpen);
  const currentScreen = useGameStore(s => s.currentScreen);
  const profile = useAuthStore(s => s.profile);

  // authVersion increments on INITIAL_SESSION, TOKEN_REFRESHED, and SIGNED_IN.
  // Depending on it means the leaderboard automatically retries after a token
  // refresh — fixing the blank leaderboard on first open after a long break.
  const authVersion = useAuthStore(s => s.authVersion);

  const [campaignRows, setCampaignRows] = useState<LeaderboardCampaignRow[] | null>(null);

  useEffect(() => {
    if (currentScreen !== 'start' || authVersion === 0) return;
    loadCampaignLeaderboard().then(setCampaignRows);
  }, [currentScreen, authVersion]);

  const rows: (LeaderboardCampaignRow | null)[] = Array.from({ length: ROWS }, (_, i) =>
    campaignRows?.[i] ?? null
  );

  return (
    <div className="surface-card leaderboard-card">
      <div className="surface-card-title">Leaderboard</div>

      <div className="scoreboard-list">
        {rows.map((row, i) => {
          const rank  = i + 1;
          const isMe  = row !== null && profile?.username === row.username;
          return (
            <div key={i} className={`scoreboard-row${isMe ? ' is-me' : ''}`}>
              <span className={`scoreboard-rank${rank <= 3 ? ' top3' : ''}`}>{rank}</span>
              {row === null ? (
                <>
                  <span className="scoreboard-username leaderboard-card-placeholder">—</span>
                  <span className="scoreboard-score leaderboard-card-placeholder">—</span>
                </>
              ) : (
                <>
                  <span className="scoreboard-username">{row.username}</span>
                  <span className="scoreboard-meta">
                    <span className={`difficulty-badge ${row.difficulty}`}>
                      {row.difficulty}
                    </span>
                    <span className="scoreboard-score">
                      {row.adjusted_score.toLocaleString()}
                    </span>
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      <button className="leaderboard-card-footer" onClick={() => setScoreboardOpen(true)}>
        <span className="auth-link">View All</span>
      </button>
    </div>
  );
}
