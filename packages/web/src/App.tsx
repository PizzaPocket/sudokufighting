import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { useGameSocket } from './hooks/useGameSocket';
import { playAudioLogoThenSelectMusic } from './audio/audioManager';
import StartScreen from './screens/StartScreen';
import CharacterSelectScreen from './screens/CharacterSelectScreen';
import LobbyScreen from './screens/LobbyScreen';
import SpLobbyScreen from './screens/SpLobbyScreen';
import GameplayScreen from './screens/GameplayScreen';
import AppHeader from './components/layout/AppHeader';
import ContextualMenu from './components/layout/ContextualMenu';

export default function App() {
  const currentScreen = useGameStore(s => s.currentScreen);
  const setInitialInteractionDone = useGameStore(s => s.setInitialInteractionDone);
  const initialInteractionDone = useGameStore(s => s.initialInteractionDone);

  // Connect WebSocket on mount
  useGameSocket();

  // One-time first-interaction handler for audio unlock
  useEffect(() => {
    if (initialInteractionDone) return;
    const handler = () => {
      setInitialInteractionDone();
      playAudioLogoThenSelectMusic();
      document.removeEventListener('pointerdown', handler, { capture: true });
    };
    document.addEventListener('pointerdown', handler, { capture: true });
    return () => document.removeEventListener('pointerdown', handler, { capture: true });
  }, [initialInteractionDone, setInitialInteractionDone]);

  return (
    <>
      <AppHeader />
      <ContextualMenu />
      <StartScreen active={currentScreen === 'start'} />
      <CharacterSelectScreen active={currentScreen === 'character-select'} />
      <LobbyScreen active={currentScreen === 'lobby'} />
      <SpLobbyScreen active={currentScreen === 'sp-lobby'} />
      <GameplayScreen active={currentScreen === 'gameplay'} />
    </>
  );
}
