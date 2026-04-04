import { useGameStore } from '../../store/gameStore';
import { disconnect, send } from '../../hooks/useGameSocket';

function screenTitle(screen: string, gameMode: string | null): string | null {
  switch (screen) {
    case 'character-select':
      if (gameMode === 'quick')        return 'MATCHMAKING';
      if (gameMode === 'friend')       return 'PRIVATE ROOM';
      if (gameMode === 'singleplayer') return 'VS AI';
      return null;
    case 'lobby':
      return gameMode === 'friend' ? 'PRIVATE ROOM' : 'MATCHMAKING';
    case 'sp-lobby':
      return 'VS AI';
    default:
      return null;
  }
}

export default function AppHeader() {
  const currentScreen = useGameStore(s => s.currentScreen);
  const gameMode = useGameStore(s => s.gameMode);
  const resetAll = useGameStore(s => s.resetAll);
  const setSettingsOpen = useGameStore(s => s.setSettingsOpen);
  const settingsOpen = useGameStore(s => s.settingsOpen);
  const matchOver = useGameStore(s => s.matchOver);

  const isGameplay = currentScreen === 'gameplay';
  const showBack = ['character-select', 'lobby', 'sp-lobby'].includes(currentScreen);
  const title = screenTitle(currentScreen, gameMode);

  function handleBack() {
    if (currentScreen === 'character-select') {
      useGameStore.getState().setScreen('start');
    } else if (currentScreen === 'lobby' || currentScreen === 'sp-lobby') {
      disconnect();
      resetAll();
    }
  }

  function handleSurrender() {
    if (gameMode === 'singleplayer') {
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
    <header className="app-header">
      <div className="header-left">
        {showBack && (
          <button className="btn-utility header-back-btn" onClick={handleBack} aria-label="Back">
            <img src="/assets/ui/chevron-left.svg" className="header-icon-img" alt="" />
            BACK
          </button>
        )}
      </div>

      {title && (
        <div className="header-center">
          <span className="action-bar-title">{title}</span>
        </div>
      )}

      <div className="header-right">
        {isGameplay && (
          <button
            className="btn-utility header-text-btn"
            onClick={handleSurrender}
            disabled={matchOver}
            aria-label="Surrender"
          >
            SURRENDER
          </button>
        )}
        <button
          className="btn-utility header-icon-btn"
          onClick={() => setSettingsOpen(!settingsOpen)}
          aria-label="Settings"
        >
          <img src="/assets/ui/icon-settings.svg" className="header-icon-img" alt="Settings" />
        </button>
      </div>
    </header>
  );
}
