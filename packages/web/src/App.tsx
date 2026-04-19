import React, { useEffect, useRef } from 'react';
import { useGameStore } from './store/gameStore';
import { useGameSocket } from './hooks/useGameSocket';
import { useAuthInit } from './auth/useAuthInit';
import SignInSheet from './components/auth/SignInSheet';
import CreateAccountSheet from './components/auth/CreateAccountSheet';
import ForgotPasswordSheet from './components/auth/ForgotPasswordSheet';
import ResetPasswordScreen from './components/auth/ResetPasswordScreen';
import AccountScreen from './components/auth/AccountScreen';
import Scoreboard from './components/overlays/Scoreboard';
import AboutModal from './components/overlays/AboutModal';
import { initAudio, SELECT_TRACK_INDEX, TRACKS, preloadMusicTrack } from './audio/audioManager';
import { getArena } from '@sudoku-fighting/shared';
import SplashScreen from './screens/SplashScreen';
import StartScreen from './screens/StartScreen';
import CharacterSelectScreen from './screens/CharacterSelectScreen';
import LobbyScreen from './screens/LobbyScreen';
import SpLobbyScreen from './screens/SpLobbyScreen';
import CampaignLobbyScreen from './screens/CampaignLobbyScreen';
import DialogueCutscene from './components/campaign/DialogueCutscene';
import GameplayScreen from './screens/GameplayScreen';
import PrivacyScreen from './screens/PrivacyScreen';
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

  const startEntering = useGameStore(s => s.startEntering);
  const transitionToStart = useGameStore(s => s.transitionToStart);
  const prevScreenRef = useRef(currentScreen);

  // Remove the static pre-render cover once React has painted its first frame
  useEffect(() => {
    const cover = document.getElementById('pre-render-cover');
    if (cover) {
      cover.style.opacity = '0';
      setTimeout(() => cover.remove(), 150);
    }
  }, []);

  // Connect WebSocket on mount
  useGameSocket();

  // Restore auth session on load + listen for sign-in/out events
  useAuthInit();

  // Preload arena assets as soon as the background is decided (lobby or game_start),
  // so SVGs are cached before GameplayScreen renders them.
  useEffect(() => {
    if (!backgroundId) return;
    preloadArenaAssets(backgroundId);
    const arena = getArena(backgroundId);
    if (arena) preloadMusicTrack(TRACKS[arena.trackIndex].src);
  }, [backgroundId]);

  // Track previous screen for other uses
  useEffect(() => {
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
    useGameStore.setState({ selectedTrackIndex: SELECT_TRACK_INDEX } as never);
    transitionToStart();
  }

  return (
    <>
      <AppHeader />
      <ContextualMenu />
      {/* Auth sheets — mounted globally, visibility controlled by authStore */}
      <SignInSheet />
      <CreateAccountSheet />
      <ForgotPasswordSheet />
      <ResetPasswordScreen />
      <AccountScreen />
      <Scoreboard />
      <AboutModal />
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
      <PrivacyScreen active={currentScreen === 'privacy'} />
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
            if (line.type === 'copyright') return <div key={i} className="credits-copyright">{line.text}</div>;
            return <div key={i} className="credits-body">{line.text}</div>;
          })}
        </div>
        </div>
      )}
    </>
  );
}
