import React from 'react';
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

  return (
    <div className={`settings-panel${settingsOpen ? '' : ' hidden'}`} id="settings-panel">
      <div className="settings-item">
        <span className="settings-label">MUSIC</span>
        <label className="toggle-switch">
          <input type="checkbox" checked={musicEnabled} onChange={handleMusicToggle} />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="settings-divider" />

      <div className="settings-item track-row">
        <span className="settings-label">TRACK</span>
        <div className="track-carousel">
          <button className="btn-utility carousel-btn" onClick={handleTrackPrev}>‹</button>
          <span className="track-title">{TRACKS[selectedTrackIndex].title}</span>
          <button className="btn-utility carousel-btn" onClick={handleTrackNext}>›</button>
        </div>
      </div>

      <div className="settings-divider" />

      <div className="settings-item">
        <span className="settings-label">SFX</span>
        <label className="toggle-switch">
          <input type="checkbox" checked={sfxEnabled} onChange={handleSfxToggle} />
          <span className="toggle-slider" />
        </label>
      </div>
    </div>
  );
}
