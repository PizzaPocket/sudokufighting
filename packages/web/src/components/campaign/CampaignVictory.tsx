import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { CREDITS, CREDITS_SCROLL_DURATION_MS } from '../../creditsContent';
import { useAuthStore } from '../../auth/authStore';
import { switchToSelectMusic, SELECT_TRACK_INDEX } from '../../audio/audioManager';

// win animation: 2 frames × 300ms = 600ms/loop. Let it run ~4 loops before freezing.
const WIN_LOOPS_BEFORE_FREEZE = 4;
const WIN_LOOP_DURATION_MS = 2 * 300; // frames × frameDuration

type Phase = 'credits' | 'unlocks';

export default function CampaignVictory() {
  const { t } = useTranslation('ui');
  const pendingUnlockIds = useGameStore(s => s.pendingUnlockIds);
  const characters = useGameStore(s => s.characters);
  const resetAll = useGameStore(s => s.resetAll);
  const mySeat = useGameStore(s => s.mySeat);
  const setCreditsActive = useGameStore(s => s.setCreditsActive);
  const campaignFinalScore = useGameStore(s => s.campaignFinalScore);
  const campaignFinalRank = useGameStore(s => s.campaignFinalRank);
  const username = useAuthStore(s => s.profile?.username ?? null);
  const [phase, setPhase] = useState<Phase>('credits');

  useEffect(() => {
    // Fade out puzzle panels immediately as credits roll
    setCreditsActive(true);

    // After a few victory loops, freeze the player's character on win frame 2
    const freezeDelay = WIN_LOOPS_BEFORE_FREEZE * WIN_LOOP_DURATION_MS;
    const freezeTimer = setTimeout(() => {
      const animKey = mySeat === 0 ? 'p1AnimSignal' : 'p2AnimSignal';
      useGameStore.setState({ [animKey]: { state: 'win_freeze', nonce: Date.now() } });
    }, freezeDelay);

    const phaseTimer = setTimeout(() => setPhase('unlocks'), CREDITS_SCROLL_DURATION_MS + 500);

    return () => {
      clearTimeout(freezeTimer);
      clearTimeout(phaseTimer);
      setCreditsActive(false);
    };
  }, []);

  const unlockChars = pendingUnlockIds
    .map(id => characters.find(c => c.id === id))
    .filter(Boolean) as typeof characters;

  const unlockCount = unlockChars.length;
  const headerText = unlockCount === 0
    ? t('campaign_victory.complete')
    : t('campaign_victory.fighters_unlocked', { count: unlockCount });

  return (
    <div className="campaign-victory-overlay">
      {phase === 'credits' && (
        <div
          className="credits-scroll"
          style={{ animationDuration: `${CREDITS_SCROLL_DURATION_MS}ms` }}
        >
          {campaignFinalScore !== null && (
            <div className="credits-score-card">
              <div className="credits-score-label">{t('campaign_victory.your_best_run')}</div>
              <div className="credits-score-value">
                {campaignFinalScore.toLocaleString()} {t('common.pts')}
              </div>
              {campaignFinalRank !== null && campaignFinalRank <= 10 && (
                <div className="credits-score-rank">
                  <span className="credits-score-rank-callout">{t('campaign_victory.leaderboard_rank', { rank: campaignFinalRank })}</span>
                  {username && <span className="credits-score-rank-name">{username}</span>}
                </div>
              )}
            </div>
          )}
          <div className="credits-spacer" />
            {CREDITS.map((line, i) => {
            if (line.type === 'logo') return (
              <div key={i} className="credits-logo">
                <img src="/assets/ui/Logo1_Sudoku.svg" alt="Sudoku" />
                <img src="/assets/ui/Logo2_Fighting.svg" alt="Fighting" />
              </div>
            );
            if (line.type === 'spacer') return <div key={i} className="credits-spacer" />;
            if (line.type === 'name') return <div key={i} className="credits-name">{line.i18nKey ? t(line.i18nKey) : line.text}</div>;
            if (line.type === 'copyright') return <div key={i} className="credits-copyright">{line.text}</div>;
            return <div key={i} className="credits-body">{line.i18nKey ? t(line.i18nKey) : line.text}</div>;
          })}
        </div>
      )}

      {phase === 'unlocks' && (
        <div className="unlock-screen">
          <div className="unlock-header">{headerText}</div>
          {unlockChars.length > 0 && (
            <div className="unlock-cards">
              {unlockChars.map((char, i) => (
                <div
                  key={char.id}
                  className="unlock-card character-card"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  <img src={char.portraitPath} alt={char.name} draggable={false} />
                  <span className="char-name">{t('characters:' + char.id, { defaultValue: char.name })}</span>
                </div>
              ))}
            </div>
          )}
          <button className="btn" onClick={() => { switchToSelectMusic(); useGameStore.setState({ selectedTrackIndex: SELECT_TRACK_INDEX } as never); resetAll(); }}>
            {t('campaign_victory.continue')}
          </button>
        </div>
      )}
    </div>
  );
}
