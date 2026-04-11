import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { useGameSocket } from './hooks/useGameSocket';
import { playAudioLogoThenSelectMusic, SELECT_TRACK_INDEX } from './audio/audioManager';
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

export default function App() {
  const currentScreen = useGameStore(s => s.currentScreen);
  const testCreditsOpen = useGameStore(s => s.testCreditsOpen);
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
      useGameStore.setState({ selectedTrackIndex: SELECT_TRACK_INDEX } as never);
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
