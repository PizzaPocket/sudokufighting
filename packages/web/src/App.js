import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { useGameSocket } from './hooks/useGameSocket';
import { playAudioLogoThenSelectMusic } from './audio/audioManager';
import StartScreen from './screens/StartScreen';
import CharacterSelectScreen from './screens/CharacterSelectScreen';
import LobbyScreen from './screens/LobbyScreen';
import SpLobbyScreen from './screens/SpLobbyScreen';
import GameplayScreen from './screens/GameplayScreen';
import AppHeader from './components/layout/AppHeader';
import SettingsPanel from './components/layout/SettingsPanel';
export default function App() {
    const currentScreen = useGameStore(s => s.currentScreen);
    const setInitialInteractionDone = useGameStore(s => s.setInitialInteractionDone);
    const initialInteractionDone = useGameStore(s => s.initialInteractionDone);
    // Connect WebSocket on mount
    useGameSocket();
    // One-time first-interaction handler for audio unlock
    useEffect(() => {
        if (initialInteractionDone)
            return;
        const handler = () => {
            setInitialInteractionDone();
            playAudioLogoThenSelectMusic();
            document.removeEventListener('pointerdown', handler, { capture: true });
        };
        document.addEventListener('pointerdown', handler, { capture: true });
        return () => document.removeEventListener('pointerdown', handler, { capture: true });
    }, [initialInteractionDone, setInitialInteractionDone]);
    return (_jsxs(_Fragment, { children: [_jsx(AppHeader, {}), _jsx(SettingsPanel, {}), _jsx(StartScreen, { active: currentScreen === 'start' }), _jsx(CharacterSelectScreen, { active: currentScreen === 'character-select' }), _jsx(LobbyScreen, { active: currentScreen === 'lobby' }), _jsx(SpLobbyScreen, { active: currentScreen === 'sp-lobby' }), _jsx(GameplayScreen, { active: currentScreen === 'gameplay' })] }));
}
