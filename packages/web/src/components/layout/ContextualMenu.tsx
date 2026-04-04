import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { TRACKS, setMusicEnabled, setSfxEnabled, setTrackIndex } from '../../audio/audioManager';

// Generic dark floating panel anchored to a trigger — not settings-specific.
// This instance hosts game settings (music, track, SFX). The pattern (.ctx-menu,
// .ctx-menu-item, .ctx-label) can be reused for any contextual control surface.
export default function ContextualMenu() {
  const settingsOpen = useGameStore(s => s.settingsOpen);
  const setSettingsOpen = useGameStore(s => s.setSettingsOpen);
  const musicEnabled = useGameStore(s => s.musicEnabled);
  const sfxEnabled = useGameStore(s => s.sfxEnabled);
  const selectedTrackIndex = useGameStore(s => s.selectedTrackIndex);
  const storeSetMusic = useGameStore(s => s.setMusicEnabled);
  const storeSetSfx = useGameStore(s => s.setSfxEnabled);
  const storeSetTrack = useGameStore(s => s.setSelectedTrackIndex);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        const settingsBtn = document.querySelector('.header-icon-btn');
        if (settingsBtn && settingsBtn.contains(target)) return;
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [settingsOpen, setSettingsOpen]);

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
    <div ref={panelRef} className={`ctx-menu${settingsOpen ? '' : ' hidden'}`} id="ctx-menu">
      <div className="ctx-menu-item">
        <span className="ctx-label">MUSIC</span>
        <label className="toggle-switch">
          <input type="checkbox" checked={musicEnabled} onChange={handleMusicToggle} />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="ctx-menu-divider" />

      <div className="ctx-menu-item stacked">
        <span className="ctx-label">TRACK</span>
        <div className="track-carousel">
          <button className="btn-utility carousel-btn" onClick={handleTrackPrev}>
            <img src="/assets/ui/chevron-left.svg" className="header-icon-img" alt="Previous" />
          </button>
          <span className="track-title">{TRACKS[selectedTrackIndex].title}</span>
          <button className="btn-utility carousel-btn" onClick={handleTrackNext}>
            <img src="/assets/ui/chevron-right.svg" className="header-icon-img" alt="Next" />
          </button>
        </div>
      </div>

      <div className="ctx-menu-divider" />

      <div className="ctx-menu-item">
        <span className="ctx-label">SFX</span>
        <label className="toggle-switch">
          <input type="checkbox" checked={sfxEnabled} onChange={handleSfxToggle} />
          <span className="toggle-slider" />
        </label>
      </div>
    </div>
  );
}
