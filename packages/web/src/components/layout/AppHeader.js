import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
        }
        else if (currentScreen === 'lobby' || currentScreen === 'sp-lobby') {
            disconnect();
            resetAll();
            setScreen('start');
        }
    }
    return (_jsxs("header", { className: "app-header", children: [_jsx("div", { className: "header-left", children: showBack && (_jsx("button", { className: "btn-utility header-icon-btn", onClick: handleBack, "aria-label": "Back", children: "\u2190" })) }), _jsx("div", { className: "header-right", children: showSettings && (_jsx("button", { className: "btn-utility header-icon-btn", onClick: () => setSettingsOpen(!settingsOpen), "aria-label": "Settings", children: "\u2699" })) })] }));
}
