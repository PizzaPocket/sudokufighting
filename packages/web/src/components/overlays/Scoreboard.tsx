import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../auth/authStore';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import {
  loadOnlineLeaderboard,
  loadCampaignLeaderboard,
  CAMPAIGN_SCORE_MULTIPLIERS,
  type LeaderboardOnlineRow,
  type LeaderboardCampaignRow,
} from '../../stats/statsService';

function fmt(n: number): string {
  return n.toLocaleString();
}

export default function Scoreboard() {
  const open = useGameStore(s => s.scoreboardOpen);
  const setScoreboardOpen = useGameStore(s => s.setScoreboardOpen);
  const profile = useAuthStore(s => s.profile);

  const { rendered, closing } = useModalAnimation(open);

  const [tab, setTab] = useState<'online' | 'campaign'>('online');
  const [onlineRows, setOnlineRows] = useState<LeaderboardOnlineRow[] | null>(null);
  const [campaignRows, setCampaignRows] = useState<LeaderboardCampaignRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([loadOnlineLeaderboard(), loadCampaignLeaderboard()]).then(([online, campaign]) => {
      setOnlineRows(online);
      setCampaignRows(campaign);
      setLoading(false);
    });
  }, [open]);

  if (!rendered) return null;

  return (
    <div className="modal-overlay" onPointerDown={() => setScoreboardOpen(false)}>
      <div className={`modal-sheet${closing ? ' closing' : ''}`} onPointerDown={e => e.stopPropagation()}>

        <div className="modal-sheet-header">
          <div className="modal-sheet-back" />
          <span className="modal-sheet-title">LEADERBOARD</span>
          <button
            className="btn-utility header-icon-btn modal-sheet-close"
            onClick={() => setScoreboardOpen(false)}
            aria-label="Close"
          >
            <img src="/assets/ui/icon-close.svg" className="header-icon-img" alt="" />
          </button>
        </div>

        <div className="scoreboard-tabs">
          <button
            className={`scoreboard-tab${tab === 'online' ? ' active' : ''}`}
            onClick={() => setTab('online')}
          >
            ONLINE WINS
          </button>
          <button
            className={`scoreboard-tab${tab === 'campaign' ? ' active' : ''}`}
            onClick={() => setTab('campaign')}
          >
            CAMPAIGN
          </button>
        </div>

        <div className="modal-sheet-body" style={{ padding: 0 }}>
          {loading && <div className="scoreboard-loading">LOADING...</div>}

          {!loading && tab === 'online' && (
            onlineRows && onlineRows.length > 0 ? (
              <div className="scoreboard-list">
                {onlineRows.map(row => {
                  const isMe = profile?.username === row.username;
                  return (
                    <div key={row.rank} className={`scoreboard-row${isMe ? ' is-me' : ''}`}>
                      <span className={`scoreboard-rank${row.rank <= 3 ? ' top3' : ''}`}>
                        {row.rank}
                      </span>
                      <span className="scoreboard-username">{row.username}</span>
                      <span className="scoreboard-score">{fmt(row.wins)} W</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="scoreboard-empty">No online matches yet.<br />Be the first on the board.</div>
            )
          )}

          {!loading && tab === 'campaign' && (
            campaignRows && campaignRows.length > 0 ? (
              <div className="scoreboard-list">
                {campaignRows.map(row => {
                  const isMe = profile?.username === row.username;
                  const multiplier = CAMPAIGN_SCORE_MULTIPLIERS[row.difficulty] ?? 1;
                  return (
                    <div key={row.rank} className={`scoreboard-row${isMe ? ' is-me' : ''}`}>
                      <span className={`scoreboard-rank${row.rank <= 3 ? ' top3' : ''}`}>
                        {row.rank}
                      </span>
                      <span className="scoreboard-username">{row.username}</span>
                      <span className="scoreboard-meta">
                        <span className={`difficulty-badge ${row.difficulty}`}>
                          {row.difficulty}
                        </span>
                        <span className="scoreboard-score">{fmt(row.adjusted_score)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="scoreboard-empty">No campaign wins yet.<br />Clear a campaign to claim the top spot.</div>
            )
          )}
        </div>

      </div>
    </div>
  );
}
