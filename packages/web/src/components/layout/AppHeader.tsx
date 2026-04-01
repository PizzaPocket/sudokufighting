import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { disconnect } from '../../hooks/useGameSocket';

export default function AppHeader() {
  const currentScreen = useGameStore(s => s.currentScreen);
  const setScreen = useGameStore(s => s.setScreen);
  const resetAll = useGameStore(s => s.resetAll);
  const setSettingsOpen = useGameStore(s => s.setSettingsOpen);
  const settingsOpen = useGameStore(s => s.settingsOpen);

  const showBack = ['character-select', 'lobby', 'sp-lobby'].includes(currentScreen);
  const showSettings = currentScreen !== 'gameplay';

  function handleBack() {
    if (currentScreen === 'character-select') {
      setScreen('start');
    } else if (currentScreen === 'lobby' || currentScreen === 'sp-lobby') {
      disconnect();
      resetAll();
      setScreen('start');
    }
  }

  return (
    <header className="app-header">
      <div className="header-left">
        {showBack && (
          <button
            className="btn-utility header-icon-btn"
            onClick={handleBack}
            aria-label="Back"
          >
            ←
          </button>
        )}
      </div>
      <div className="header-right">
        {showSettings && (
          <button
            className="btn-utility header-icon-btn"
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-label="Settings"
          >
            ⚙
          </button>
        )}
      </div>
    </header>
  );
}
