import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../auth/authStore';
import {
  loadOnlineLeaderboard,
  loadCampaignLeaderboard,
  type LeaderboardOnlineRow,
  type LeaderboardCampaignRow,
} from '../stats/statsService';

type Row = LeaderboardOnlineRow | LeaderboardCampaignRow;

const ROWS = 5;

export default function LeaderboardCard() {
  const setScoreboardOpen = useGameStore(s => s.setScoreboardOpen);
  const currentScreen = useGameStore(s => s.currentScreen);
  const profile = useAuthStore(s => s.profile);

  // authVersion increments on INITIAL_SESSION, TOKEN_REFRESHED, and SIGNED_IN.
  // Depending on it means the leaderboard automatically retries after a token
  // refresh — fixing the blank leaderboard on first open after a long break.
  const authVersion = useAuthStore(s => s.authVersion);

  const [tab, setTab] = useState<'online' | 'campaign'>('online');
  const [onlineRows, setOnlineRows]     = useState<LeaderboardOnlineRow[] | null>(null);
  const [campaignRows, setCampaignRows] = useState<LeaderboardCampaignRow[] | null>(null);

  useEffect(() => {
    if (currentScreen !== 'start' || authVersion === 0) return;
    Promise.all([loadOnlineLeaderboard(), loadCampaignLeaderboard()]).then(([online, campaign]) => {
      setOnlineRows(online);
      setCampaignRows(campaign);
    });
  }, [currentScreen, authVersion]);

  const rows: (Row | null)[] = Array.from({ length: ROWS }, (_, i) =>
    (tab === 'online' ? onlineRows : campaignRows)?.[i] ?? null
  );

  return (
    <div className="surface-card leaderboard-card">
      <div className="surface-card-title">Leaderboard</div>
      <div className="scoreboard-tabs">
        <button
          className={`scoreboard-tab${tab === 'online' ? ' active' : ''}`}
          onClick={() => setTab('online')}
        >
          RANKED
        </button>
        <button
          className={`scoreboard-tab${tab === 'campaign' ? ' active' : ''}`}
          onClick={() => setTab('campaign')}
        >
          CAMPAIGN
        </button>
      </div>

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
              ) : tab === 'online' ? (
                <>
                  <span className="scoreboard-username">{row.username}</span>
                  <span className="scoreboard-score">{(row as LeaderboardOnlineRow).wins} W</span>
                </>
              ) : (
                <>
                  <span className="scoreboard-username">{row.username}</span>
                  <span className="scoreboard-meta">
                    <span className={`difficulty-badge ${(row as LeaderboardCampaignRow).difficulty}`}>
                      {(row as LeaderboardCampaignRow).difficulty}
                    </span>
                    <span className="scoreboard-score">
                      {(row as LeaderboardCampaignRow).adjusted_score.toLocaleString()}
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
