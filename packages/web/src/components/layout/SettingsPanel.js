import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useGameStore } from '../../store/gameStore';
import { TRACKS, setMusicEnabled, setSfxEnabled, setTrackIndex } from '../../audio/audioManager';
export default function SettingsPanel() {
    const settingsOpen = useGameStore(s => s.settingsOpen);
    const musicEnabled = useGameStore(s => s.musicEnabled);
    const sfxEnabled = useGameStore(s => s.sfxEnabled);
    const selectedTrackIndex = useGameStore(s => s.selectedTrackIndex);
    const storeSetMusic = useGameStore(s => s.setMusicEnabled);
    const storeSetSfx = useGameStore(s => s.setSfxEnabled);
    const storeSetTrack = useGameStore(s => s.setSelectedTrackIndex);
    function handleMusicToggle() {
        const next = !musicEnabled;
        storeSetMusic(next);
        setMusicEnabled(next);
    }
    function handleSfxToggle() {
        const next = !sfxEnabled;
        storeSetSfx(next);
        setSfxEnabled(next);
    }
    function handleTrackPrev() {
        const next = ((selectedTrackIndex - 1) + TRACKS.length) % TRACKS.length;
        storeSetTrack(next);
        setTrackIndex(next);
    }
    function handleTrackNext() {
        const next = (selectedTrackIndex + 1) % TRACKS.length;
        storeSetTrack(next);
        setTrackIndex(next);
    }
    return (_jsxs("div", { className: `settings-panel${settingsOpen ? '' : ' hidden'}`, id: "settings-panel", children: [_jsxs("div", { className: "settings-item", children: [_jsx("span", { className: "settings-label", children: "MUSIC" }), _jsxs("label", { className: "toggle-switch", children: [_jsx("input", { type: "checkbox", checked: musicEnabled, onChange: handleMusicToggle }), _jsx("span", { className: "toggle-slider" })] })] }), _jsx("div", { className: "settings-divider" }), _jsxs("div", { className: "settings-item track-row", children: [_jsx("span", { className: "settings-label", children: "TRACK" }), _jsxs("div", { className: "track-carousel", children: [_jsx("button", { className: "btn-utility carousel-btn", onClick: handleTrackPrev, children: "\u2039" }), _jsx("span", { className: "track-title", children: TRACKS[selectedTrackIndex].title }), _jsx("button", { className: "btn-utility carousel-btn", onClick: handleTrackNext, children: "\u203A" })] })] }), _jsx("div", { className: "settings-divider" }), _jsxs("div", { className: "settings-item", children: [_jsx("span", { className: "settings-label", children: "SFX" }), _jsxs("label", { className: "toggle-switch", children: [_jsx("input", { type: "checkbox", checked: sfxEnabled, onChange: handleSfxToggle }), _jsx("span", { className: "toggle-slider" })] })] })] }));
}
