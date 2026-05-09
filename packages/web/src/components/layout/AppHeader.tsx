import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { disconnect, send } from '../../hooks/useGameSocket';
import { stopVsAI } from '../../ai/useVsAI';
import { useAuthStore } from '../../auth/authStore';

export default function AppHeader() {
  const { t } = useTranslation('ui');
  const currentScreen = useGameStore(s => s.currentScreen);
  const prevScreen = useGameStore(s => s.prevScreen);
  const gameMode = useGameStore(s => s.gameMode);
  const resetAll = useGameStore(s => s.resetAll);
  const setSettingsOpen = useGameStore(s => s.setSettingsOpen);
  const settingsOpen = useGameStore(s => s.settingsOpen);
  const matchOver = useGameStore(s => s.matchOver);
  const isPaused = useGameStore(s => s.isPaused);
  const setIsPaused = useGameStore(s => s.setIsPaused);

  const user = useAuthStore(s => s.user);
  const openSignIn = useAuthStore(s => s.openSignIn);
  const openAccount = useAuthStore(s => s.openAccount);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const isGameplay = currentScreen === 'gameplay';
  const isAiMode = gameMode === 'practice' || gameMode === 'campaign';
  const showBack = ['character-select', 'lobby', 'practice-lobby', 'campaign-lobby', 'privacy'].includes(currentScreen);

  const title = useMemo(() => {
    switch (currentScreen) {
      case 'character-select':
        if (gameMode === 'quick')    return t('header.matchmaking');
        if (gameMode === 'friend')   return t('header.private_room');
        if (gameMode === 'practice') return t('start.practice');
        if (gameMode === 'campaign') return t('start.campaign');
        return null;
      case 'lobby':
        return gameMode === 'friend' ? t('header.private_room') : t('header.matchmaking');
      case 'practice-lobby':
        return t('start.practice');
      case 'campaign-lobby':
        return t('start.campaign');
      default:
        return null;
    }
  }, [currentScreen, gameMode, t]);

  const surrenderLabel = gameMode === 'campaign' ? t('header.quit') : t('header.surrender');
  const confirmTitle   = gameMode === 'campaign' ? t('header.quit_confirm') : t('header.surrender_confirm');

  function handleBack() {
    if (currentScreen === 'character-select') {
      useGameStore.getState().setScreen('start');
    } else if (currentScreen === 'privacy') {
      useGameStore.getState().setScreen(prevScreen ?? 'start');
    } else if (currentScreen === 'lobby' || currentScreen === 'practice-lobby' || currentScreen === 'campaign-lobby') {
      disconnect();
      resetAll();
    }
  }

  function executeSurrender() {
    setConfirmOpen(false);
    setIsPaused(false);
    if (gameMode === 'practice' || gameMode === 'campaign') {
      stopVsAI();
      const st = useGameStore.getState();
      const aiSeat = (1 - (st.mySeat ?? 0)) as 0 | 1;
      st.applyServerMessage({
        type: 'match_end',
        payload: { winnerSeat: aiSeat, winnerName: st.opponentName ?? 'CPU' },
      });
    } else {
      send('surrender', {});
    }
  }

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          {showBack && (
            <button className="btn-utility header-back-btn" onClick={handleBack} aria-label="Back">
              <img src="/assets/ui/chevron-left.svg" className="header-icon-img" alt="" />
              {t('common.back')}
            </button>
          )}
        </div>

        {title && (
          <div className="header-center">
            <span className="action-bar-title">{title}</span>
          </div>
        )}

        <div className="header-right">
          {isGameplay && isAiMode && !matchOver && (
            <button
              className="btn-utility header-icon-btn"
              onClick={() => setIsPaused(!isPaused)}
              aria-label={isPaused ? 'Resume' : 'Pause'}
            >
              <img
                src={isPaused ? '/assets/ui/icon-play.svg' : '/assets/ui/icon-pause.svg'}
                className="header-icon-img"
                alt=""
              />
            </button>
          )}
          {isGameplay && (
            <button
              className="btn-utility header-text-btn"
              onClick={() => setConfirmOpen(true)}
              disabled={matchOver}
              aria-label={surrenderLabel}
            >
              {surrenderLabel}
            </button>
          )}
          {/* Auth entry point — hidden during gameplay to avoid distraction */}
          {!isGameplay && (
            user ? (
              <button
                className="btn-utility header-icon-btn"
                onClick={openAccount}
                aria-label="My account"
              >
                <img src="/assets/ui/icon-user.svg" className="header-icon-img" alt="" />
              </button>
            ) : (
              <button
                className="btn-utility header-text-btn"
                onClick={openSignIn}
                aria-label="Sign in"
              >
                {t('auth.sign_in_title')}
              </button>
            )
          )}
          <button
            className="btn-utility header-icon-btn header-settings-btn"
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-label="Settings"
          >
            <img src="/assets/ui/icon-settings.svg" className="header-icon-img" alt="Settings" />
          </button>
        </div>
      </header>

      {confirmOpen && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <span className="dialog-title">{confirmTitle}</span>
            <div className="confirm-dialog-btns">
              <button className="btn btn-secondary" onClick={() => setConfirmOpen(false)}>
                {t('common.cancel')}
              </button>
              <button className="btn" onClick={executeSurrender}>
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
