import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { useGameSocket } from './hooks/useGameSocket';
import { initAudio, SELECT_TRACK_INDEX } from './audio/audioManager';
import SplashScreen from './screens/SplashScreen';
import StartScreen from './screens/StartScreen';
import CharacterSelectScreen from './screens/CharacterSelectScreen';
import LobbyScreen from './screens/LobbyScreen';
import SpLobbyScreen from './screens/SpLobbyScreen';
import CampaignLobbyScreen from './screens/CampaignLobbyScreen';
import DialogueCutscene from './components/campaign/DialogueCutscene';
import GameplayScreen from './screens/GameplayScreen';
import AppHeader from './components/layout/AppHeader';
import ContextualMenu from './components/layout/ContextualMenu';
import { CREDITS, CREDITS_SCROLL_DURATION_MS } from './creditsContent';
import { preloadArenaAssets } from './utils/preloadAssets';

export default function App() {
  const currentScreen = useGameStore(s => s.currentScreen);
  const backgroundId  = useGameStore(s => s.backgroundId);
  const testCreditsOpen = useGameStore(s => s.testCreditsOpen);
  const setInitialInteractionDone = useGameStore(s => s.setInitialInteractionDone);
  const initialInteractionDone = useGameStore(s => s.initialInteractionDone);

  // Whether the start screen should play its entrance animation (only on first
  // load from the splash screen, not when returning from gameplay).
  const [startEntering, setStartEntering] = useState(false);
  const prevScreenRef = useRef(currentScreen);

  // Connect WebSocket on mount
  useGameSocket();

  // Preload arena assets as soon as the background is decided (lobby or game_start),
  // so SVGs are cached before GameplayScreen renders them.
  useEffect(() => {
    if (backgroundId) preloadArenaAssets(backgroundId);
  }, [backgroundId]);

  // Detect splash → start transition to trigger entrance animation
  useEffect(() => {
    if (currentScreen === 'start' && prevScreenRef.current === 'splash') {
      setStartEntering(true);
      const t = setTimeout(() => setStartEntering(false), 2000);
      return () => clearTimeout(t);
    }
    prevScreenRef.current = currentScreen;
  }, [currentScreen]);

  // Room-code path: no splash screen. Register a one-time gesture handler to
  // silently init audio on the start screen. (No logo, no music until gameplay.)
  useEffect(() => {
    if (currentScreen !== 'start' || initialInteractionDone) return;
    const handler = () => {
      initAudio();
      setInitialInteractionDone();
      useGameStore.setState({ selectedTrackIndex: SELECT_TRACK_INDEX } as never);
      document.removeEventListener('pointerdown', handler, { capture: true });
    };
    document.addEventListener('pointerdown', handler, { capture: true });
    return () => document.removeEventListener('pointerdown', handler, { capture: true });
  }, [currentScreen, initialInteractionDone, setInitialInteractionDone]);

  function handleSplashComplete() {
    useGameStore.setState({ currentScreen: 'start', selectedTrackIndex: SELECT_TRACK_INDEX } as never);
  }

  return (
    <>
      <AppHeader />
      <ContextualMenu />
      {currentScreen === 'splash' && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}
      <StartScreen active={currentScreen === 'start'} entering={startEntering} />
      <CharacterSelectScreen active={currentScreen === 'character-select'} />
      <LobbyScreen active={currentScreen === 'lobby'} />
      <SpLobbyScreen active={currentScreen === 'practice-lobby'} />
      <CampaignLobbyScreen active={currentScreen === 'campaign-lobby'} />
      <DialogueCutscene active={currentScreen === 'campaign-dialogue'} />
      <GameplayScreen active={currentScreen === 'gameplay'} />
      {testCreditsOpen && (
        <div className="credits-overlay">
        <div
          className="credits-scroll"
          style={{ animationDuration: `${CREDITS_SCROLL_DURATION_MS}ms` }}
          onAnimationEnd={() => useGameStore.setState({ testCreditsOpen: false })}
        >
          {CREDITS.map((line, i) => {
            if (line.type === 'logo') return (
              <div key={i} className="credits-logo">
                <img src="/assets/ui/Logo1_Sudoku.svg" alt="Sudoku" />
                <img src="/assets/ui/Logo2_Fighting.svg" alt="Fighting" />
              </div>
            );
            if (line.type === 'spacer') return <div key={i} className="credits-spacer" />;
            if (line.type === 'name') return <div key={i} className="credits-name">{line.text}</div>;
            return <div key={i} className="credits-body">{line.text}</div>;
          })}
        </div>
        </div>
      )}
    </>
  );
}
