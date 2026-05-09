import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../auth/authStore';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import {
  loadCampaignLeaderboard,
  type LeaderboardCampaignRow,
} from '../../stats/statsService';

function fmt(n: number): string {
  return n.toLocaleString();
}

export default function Scoreboard() {
  const { t } = useTranslation('ui');
  const open = useGameStore(s => s.scoreboardOpen);
  const setScoreboardOpen = useGameStore(s => s.setScoreboardOpen);
  const profile = useAuthStore(s => s.profile);

  function handleClose() { setScoreboardOpen(false); }
  const { rendered, closing } = useModalAnimation(open);

  const [campaignRows, setCampaignRows] = useState<LeaderboardCampaignRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadCampaignLeaderboard().then(rows => {
      setCampaignRows(rows);
      setLoading(false);
    });
  }, [open]);

  if (!rendered) return null;

  return (
    <div className="modal-overlay" onPointerDown={handleClose}>
      <div className={`modal-sheet${closing ? ' closing' : ''}`} onPointerDown={e => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <div className="modal-sheet-back" />
          <span className="modal-sheet-title">{t('leaderboard.title')}</span>
          <button
            className="btn-utility header-icon-btn modal-sheet-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <img src="/assets/ui/icon-close.svg" className="header-icon-img" alt="" />
          </button>
        </div>

        <div className="modal-sheet-body" style={{ padding: 0 }}>
          {loading && <div className="scoreboard-loading">{t('common.loading')}</div>}

          {!loading && (
            campaignRows && campaignRows.length > 0 ? (
              <div className="scoreboard-list">
                {campaignRows.map(row => {
                  const isMe = profile?.username === row.username;
                  return (
                    <div key={row.rank} className={`scoreboard-row${isMe ? ' is-me' : ''}`}>
                      <span className={`scoreboard-rank${row.rank <= 3 ? ' top3' : ''}`}>
                        {row.rank}
                      </span>
                      <span className="scoreboard-username">{row.username}</span>
                      <span className="scoreboard-meta">
                        <span className={`difficulty-badge ${row.difficulty}`}>
                          {t('char_select.' + row.difficulty)}
                        </span>
                        <span className="scoreboard-score">{fmt(row.adjusted_score)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="scoreboard-empty" style={{ whiteSpace: 'pre-line' }}>{t('leaderboard.empty')}</div>
            )
          )}
        </div>

      </div>
    </div>
  );
}
