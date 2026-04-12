// Audio manager — port of frontend/js/audio.js to TypeScript singleton
import { getArena } from '@sudoku-fighting/shared';
import type { AttackType } from '@sudoku-fighting/shared';

export const TRACKS = [
  { title: "I'm Going For It", src: '/sounds/Im_Going_For_It.m4a'    },
  { title: 'Sudoku Fighting',  src: '/sounds/Sudoku_Fighting.m4a'    },
  { title: 'Action Go',        src: '/sounds/Action_Go.m4a'          },
  { title: 'Haunted (Remix)',  src: '/sounds/Haunted_Remix.m4a'      },
  { title: 'Jocular Jamnation', src: '/sounds/Jocular_Jamnation.m4a' },
  { title: 'Shinobi',          src: '/sounds/Shinobi.m4a'            },
];

export const SELECT_TRACK_INDEX = 1;
const SFX_LEAD_MS = 80;

let musicEnabled = true;
let sfxEnabled   = true;
let selectedTrackIndex = 0;

// ── Web Audio API ──────────────────────────────────────────────────────────────
// Created lazily on first user interaction to satisfy browser autoplay policy.
let audioCtx: AudioContext | null = null;
let gainNode: GainNode | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.6;
    gainNode.connect(audioCtx.destination);
    registerRecoveryListeners(audioCtx);
  }
  return audioCtx;
}

// ── Mobile AudioContext recovery ───────────────────────────────────────────────
// On mobile, the AudioContext is automatically suspended when the tab is
// backgrounded, the screen locks, or a phone call arrives. When that happens,
// HTMLAudioElements connected via MediaElementSourceNode are also paused by the
// browser and do NOT restart automatically when the context resumes — we must
// call play() again explicitly.
//
// Three recovery signals cover all cases:
//   1. visibilitychange — fires when the user returns from background/lock screen.
//   2. ctx.onstatechange — fires when the context itself transitions to 'running'.
//   3. pointerdown/keydown — any in-game tap/keystroke wakes a suspended context,
//      which matters most during active gameplay (every digit entry is a gesture).

function resumeCurrentTrack(): void {
  if (!currentTrackSrc || !audioCtx || audioCtx.state !== 'running') return;
  const entry = trackPool.get(currentTrackSrc);
  if (entry && entry.el.paused && musicEnabled) {
    entry.el.play().catch(() => {});
  }
}

function registerRecoveryListeners(ctx: AudioContext): void {
  ctx.onstatechange = () => {
    if (ctx.state === 'running') resumeCurrentTrack();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      ctx.resume().then(resumeCurrentTrack).catch(() => {});
    }
  });

  const wakeOnGesture = () => {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  };
  document.addEventListener('pointerdown', wakeOnGesture, { passive: true });
  document.addEventListener('keydown', wakeOnGesture, { passive: true });
}

// ── Music track pool ───────────────────────────────────────────────────────────
// All tracks are created once and permanently wired into the Web Audio graph.
// Only one element plays at a time — switching means pause() one, play() another.
// This eliminates the "simultaneous playback" bug that arose from orphaned
// HTMLAudioElements accumulating during fadeOutMusic's async cleanup window.
//
// Preload strategy for slow mobile connections:
//   On iOS, `preload='auto'` is ignored — audio only downloads when play() is
//   called. Calling play() on all 6 tracks at first-gesture fragments bandwidth
//   and delays the select music (which needs to play immediately). So we only
//   trigger the download for the select music + SFX on first gesture. Fight tracks
//   download on-demand when startFightMusic() fires — there is always a 2+ second
//   buffer window (round intro overlay) before fight audio is actually needed.

interface TrackPoolEntry {
  el: HTMLAudioElement;
  node: MediaElementAudioSourceNode;
}
const trackPool = new Map<string, TrackPoolEntry>();
let currentTrackSrc: string | null = null;

function ensureAllConnected(): void {
  const ctx = getCtx();
  for (const track of TRACKS) {
    if (trackPool.has(track.src)) continue;
    const el = new Audio(track.src);
    // preload='none': don't speculatively download. Downloads begin when play()
    // is called. The select track is unlocked (play+paused) in the gesture handler;
    // fight tracks start downloading when startFightMusic() calls play().
    el.preload = 'none';
    el.loop = true;
    const node = ctx.createMediaElementSource(el);
    node.connect(gainNode!);
    trackPool.set(track.src, { el, node });
  }
}

// Unlock a single element for iOS within a gesture handler.
// play() marks the element as user-activated; the .then(pause) immediately stops
// it so we don't accidentally keep it playing or trigger a download for tracks
// we don't need yet.
function unlockElement(el: HTMLAudioElement): void {
  el.play().then(() => el.pause()).catch(() => {});
}

function pauseAllTracks(): void {
  for (const { el } of trackPool.values()) {
    if (!el.paused) el.pause();
  }
}

function resetGain(): void {
  if (!gainNode || !audioCtx) return;
  gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  gainNode.gain.setValueAtTime(musicEnabled ? 0.6 : 0, audioCtx.currentTime);
}

// ── Public music API ───────────────────────────────────────────────────────────

export function setMusicEnabled(enabled: boolean) {
  musicEnabled = enabled;
  if (!gainNode || !audioCtx) return;
  gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  gainNode.gain.setValueAtTime(enabled ? 0.6 : 0, audioCtx.currentTime);
}

export function setSfxEnabled(enabled: boolean) {
  sfxEnabled = enabled;
}

export function getSelectedTrackIndex() { return selectedTrackIndex; }

export function setTrackIndex(index: number) {
  selectedTrackIndex = ((index % TRACKS.length) + TRACKS.length) % TRACKS.length;
  if (currentTrackSrc) {
    // Music is actively playing — switch immediately.
    startFightMusic();
  }
}

export async function startFightMusic(backgroundId?: string) {
  const arena = backgroundId ? getArena(backgroundId) : null;
  if (arena) selectedTrackIndex = arena.trackIndex;

  const src = TRACKS[selectedTrackIndex].src;

  // Pool may not exist yet on desktop (no prior gesture check ran ensureAllConnected).
  ensureAllConnected();

  const ctx = getCtx();
  if (ctx.state !== 'running') await ctx.resume();

  resetGain();

  if (currentTrackSrc === src) {
    // Same track — resume if paused (e.g. after AudioContext suspension recovery).
    const entry = trackPool.get(src);
    if (entry && entry.el.paused) entry.el.play().catch(() => {});
    return;
  }

  // Pause whatever was playing before.
  if (currentTrackSrc) {
    trackPool.get(currentTrackSrc)?.el.pause();
  }

  currentTrackSrc = src;
  // play() initiates the download on iOS if not already cached. On a slow
  // connection, the 2s round-intro overlay gives the browser time to buffer.
  trackPool.get(src)?.el.play().catch(() => {});
}

export function switchToSelectMusic() {
  const delay = 500;
  fadeOutMusic(delay);
  setTimeout(() => {
    selectedTrackIndex = SELECT_TRACK_INDEX;
    startFightMusic();
  }, delay + 50);
}

export function stopMusicNow() {
  if (gainNode && audioCtx) {
    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  }
  pauseAllTracks();
  currentTrackSrc = null;
}

export function fadeOutMusic(durationMs = 500) {
  if (!gainNode || !audioCtx) return;
  const duration = durationMs / 1000;
  gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);

  const fadingSrc = currentTrackSrc;
  currentTrackSrc = null;

  setTimeout(() => {
    // Pause only if nothing new has taken over this track's element.
    if (fadingSrc && currentTrackSrc !== fadingSrc) {
      trackPool.get(fadingSrc)?.el.pause();
    }
    // Gain stays at 0 — startFightMusic/switchToSelectMusic resets it.
  }, durationMs);
}

// No-op kept for any call sites that still reference it.
export function preloadAllTracks() {}

// ── First-gesture audio unlock ─────────────────────────────────────────────────
// Called synchronously inside the first pointerdown handler (App.tsx).
//
// Sequence matters here:
//   1. Create AudioContext + play silent buffer (activates the context on iOS).
//   2. Create all pool entries (AudioNode graph wiring, no downloads yet).
//   3. Start the select music synchronously (sets currentTrackSrc, triggers download).
//   4. Unlock the select music element (play+pause within gesture — also triggers
//      download start on iOS so it begins buffering).
//   5. Unlock all SFX elements (small files, all needed before first fight).
//   6. Do NOT unlock the 5 fight tracks here — they download on demand when
//      startFightMusic() is called, which always has a 2+ second buffer window.

export function playAudioLogoThenSelectMusic() {
  selectedTrackIndex = SELECT_TRACK_INDEX;
  const ctx = getCtx();

  // iOS silent-buffer unlock: activates the AudioContext within the gesture.
  const silentBuf = ctx.createBuffer(1, 1, 22050);
  const silent = ctx.createBufferSource();
  silent.buffer = silentBuf;
  silent.connect(ctx.destination);
  silent.start(0);
  ctx.resume();

  // Wire all tracks into the graph (no downloads yet).
  ensureAllConnected();

  // Start select music first — this sets currentTrackSrc and triggers its download.
  const selectEntry = trackPool.get(TRACKS[SELECT_TRACK_INDEX].src);
  if (selectEntry) {
    currentTrackSrc = TRACKS[SELECT_TRACK_INDEX].src;
    resetGain();
    selectEntry.el.play().catch(() => {});
  }

  // Unlock the select track element (gesture-scoped play+pause).
  // Its play() above may already be running, so this is a no-op for the download
  // but ensures iOS marks it activated for future non-gesture calls.
  if (selectEntry) unlockElement(selectEntry.el);

  // Unlock all SFX elements within this gesture — they're small and needed soon.
  unlockAllSFX();

  // Play the audio logo SFX.
  if (sfxEnabled) {
    const logo = new Audio('/sounds/Sudoku_Fighting_Audio_Logo.mp3');
    logo.play().catch(() => {});
  }

  // Fight tracks (the other 5) are NOT unlocked or downloaded here.
  // Once the AudioContext is activated, MediaElementSource-connected elements
  // can be played in non-gesture contexts on modern iOS/Android — they inherit
  // the context's activation status.
}

// ── Announcer clips ────────────────────────────────────────────────────────────

const ROUND_CLIPS: Record<number, HTMLAudioElement> = {
  1: new Audio('/sounds/Round_One.mp3'),
  2: new Audio('/sounds/Round_Two.mp3'),
  3: new Audio('/sounds/Round_Three.mp3'),
};
const fightClip       = new Audio('/sounds/Fight.mp3');
const victoryClip     = new Audio('/sounds/Victory.mp3');
const devastationClip = new Audio('/sounds/Devestation.mp3');
const koClip          = new Audio('/sounds/KO.mp3');
const tkoClip         = new Audio('/sounds/TKO.mp3');
const fightBellClip   = new Audio('/sounds/fight_bell.wav');

// ── Attack SFX ─────────────────────────────────────────────────────────────────

const ATTACK_SFX: Record<string, HTMLAudioElement> = {
  punch:           new Audio('/sounds/01_punch.wav'),
  kick:            new Audio('/sounds/02_kick.wav'),
  row_special:     new Audio('/sounds/03_special1.wav'),
  column_special:  new Audio('/sounds/04_special2.wav'),
  subgrid_special: new Audio('/sounds/05_special3.wav'),
};

// ── Text blip pool ─────────────────────────────────────────────────────────────
// A single HTMLAudioElement reset+replayed rapidly (as the typewriter effect does)
// drops most calls on iOS. A round-robin pool of 3 lets blips overlap naturally
// and survives the rapid-fire cadence without interrupting each other.

const BLIP_POOL_SIZE = 3;
const blipPool: HTMLAudioElement[] = Array.from(
  { length: BLIP_POOL_SIZE },
  () => new Audio('/sounds/text_blip.wav'),
);
let blipIndex = 0;

// ── SFX unlock (called once within first gesture) ──────────────────────────────
// SFX elements are plain HTMLAudioElements (not routed through the Web Audio
// graph). On iOS they require their own gesture-scope play() to be activated,
// independent of the AudioContext unlock. Since they're small files, unlocking
// all of them at first gesture is fine even on slow connections.

function allSFXElements(): HTMLAudioElement[] {
  return [
    ...Object.values(ROUND_CLIPS),
    fightClip, victoryClip, devastationClip, koClip, tkoClip, fightBellClip,
    ...Object.values(ATTACK_SFX),
    ...blipPool,
  ];
}

function unlockAllSFX(): void {
  for (const el of allSFXElements()) {
    el.play().then(() => {
      el.currentTime = 0;
      el.pause();
    }).catch(() => {});
  }
}

// ── SFX playback helpers ───────────────────────────────────────────────────────

function playClip(audio: HTMLAudioElement) {
  if (!sfxEnabled) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

export function playRoundAnnouncer(roundNumber: number) {
  const clip = ROUND_CLIPS[roundNumber];
  if (clip) playClip(clip);
}
export function playFightAnnouncer() { playClip(fightClip); }
export function playKOAnnouncer()    { playClip(fightBellClip); setTimeout(() => playClip(koClip), 600); }
export function playTKOAnnouncer()   { playClip(fightBellClip); setTimeout(() => playClip(tkoClip), 600); }
export function playVictoryAnnouncer()     { playClip(victoryClip); }
export function playDevastationAnnouncer() { playClip(devastationClip); }

// ── Dialogue text blip ─────────────────────────────────────────────────────────

export function playTextBlip() {
  if (!sfxEnabled) return;
  const el = blipPool[blipIndex % BLIP_POOL_SIZE];
  blipIndex++;
  el.currentTime = 0;
  el.play().catch(() => {});
}

// ── Attack SFX ─────────────────────────────────────────────────────────────────

export function playAttackSFX(type: AttackType, delay = SFX_LEAD_MS) {
  if (!sfxEnabled) return;
  const sfx = ATTACK_SFX[type] ?? ATTACK_SFX.punch;
  setTimeout(() => {
    if (!sfxEnabled) return;
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  }, delay);
}
