import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useGameStore } from '../../store/gameStore';
import { TRACKS, setMusicEnabled, setSfxEnabled } from '../../audio/audioManager';
import { setHapticsEnabled } from '../../audio/haptics';

// Generic dark floating panel anchored to a trigger — not settings-specific.
// This instance hosts game settings (music, track, SFX). The pattern (.ctx-menu,
// .ctx-menu-item, .ctx-label) can be reused for any contextual control surface.
export default function ContextualMenu() {
  const settingsOpen = useGameStore(s => s.settingsOpen);
  const setSettingsOpen = useGameStore(s => s.setSettingsOpen);
  const setAboutOpen = useGameStore(s => s.setAboutOpen);
  const musicEnabled = useGameStore(s => s.musicEnabled);
  const sfxEnabled = useGameStore(s => s.sfxEnabled);
  const selectedTrackIndex = useGameStore(s => s.selectedTrackIndex);
  const hapticsEnabled = useGameStore(s => s.hapticsEnabled);
  const storeSetMusic = useGameStore(s => s.setMusicEnabled);
  const storeSetSfx = useGameStore(s => s.setSfxEnabled);
  const storeSetHaptics = useGameStore(s => s.setHapticsEnabled);
  const isNative = Capacitor.isNativePlatform();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        const settingsBtn = document.querySelector('.header-settings-btn');
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

  function handleHapticsToggle() {
    const next = !hapticsEnabled;
    storeSetHaptics(next);
    setHapticsEnabled(next);
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
        <span className="track-title">{TRACKS[selectedTrackIndex].title}</span>
      </div>

      <div className="ctx-menu-divider" />

      <div className="ctx-menu-item">
        <span className="ctx-label">SOUND EFFECTS</span>
        <label className="toggle-switch">
          <input type="checkbox" checked={sfxEnabled} onChange={handleSfxToggle} />
          <span className="toggle-slider" />
        </label>
      </div>

      {isNative && (
        <>
          <div className="ctx-menu-divider" />
          <div className="ctx-menu-item">
            <span className="ctx-label">VIBRATION</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={hapticsEnabled} onChange={handleHapticsToggle} />
              <span className="toggle-slider" />
            </label>
          </div>
        </>
      )}

      <div className="ctx-menu-divider" />

      <button
        className="auth-link ctx-about-link"
        onClick={() => { setSettingsOpen(false); setAboutOpen(true); }}
      >
        ABOUT
      </button>

    </div>
  );
}
