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

// Web Audio API — created lazily on first user interaction to satisfy browser policy
let audioCtx: AudioContext | null = null;
let gainNode: GainNode | null = null;

// Music playback via HTMLAudioElement + MediaElementSourceNode.
// Using MediaElementSource (instead of BufferSource) lets the browser start playback
// synchronously within the gesture handler, which keeps iOS Chrome from re-suspending
// the AudioContext before a fetch/decode can complete.
let currentMediaEl: HTMLAudioElement | null = null;
let currentMediaSource: MediaElementAudioSourceNode | null = null;
let currentSrc: string | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.6;
    gainNode.connect(audioCtx.destination);
  }
  return audioCtx;
}

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
  if (currentMediaEl) {
    currentMediaEl.pause();
    currentMediaEl = null;
    currentSrc = null;
    startFightMusic();
  }
}

export async function startFightMusic(backgroundId?: string) {
  const arena = backgroundId ? getArena(backgroundId) : null;
  if (arena) selectedTrackIndex = arena.trackIndex;

  const src = TRACKS[selectedTrackIndex].src;
  if (currentSrc === src && currentMediaEl && !currentMediaEl.paused) return;

  // Stop any existing track
  if (currentMediaEl) {
    currentMediaEl.pause();
    currentMediaEl.src = '';
  }
  if (currentMediaSource) {
    currentMediaSource.disconnect();
    currentMediaSource = null;
  }
  currentMediaEl = null;
  currentSrc = null;

  const ctx = getCtx();
  if (ctx.state !== 'running') await ctx.resume();

  gainNode!.gain.cancelScheduledValues(ctx.currentTime);
  gainNode!.gain.setValueAtTime(musicEnabled ? 0.6 : 0, ctx.currentTime);

  const mediaEl = new Audio(src);
  mediaEl.loop = true;

  // Connect through the Web Audio graph for gain control
  const mediaSource = ctx.createMediaElementSource(mediaEl);
  mediaSource.connect(gainNode!);

  currentMediaEl = mediaEl;
  currentMediaSource = mediaSource;
  currentSrc = src;

  mediaEl.play().catch(() => {});
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
  if (!currentMediaEl) return;
  if (gainNode && audioCtx) {
    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  }
  currentMediaEl.pause();
  currentMediaEl.src = '';
  if (currentMediaSource) { currentMediaSource.disconnect(); currentMediaSource = null; }
  currentMediaEl = null;
  currentSrc = null;
}

export function fadeOutMusic(durationMs = 500) {
  if (!currentMediaEl || !gainNode || !audioCtx) return;
  const duration = durationMs / 1000;
  gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);

  const el = currentMediaEl;
  const src = currentMediaSource;
  currentMediaEl = null;
  currentMediaSource = null;
  currentSrc = null;

  setTimeout(() => {
    el.pause();
    el.src = '';
    if (src) src.disconnect();
    if (gainNode && audioCtx) {
      gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      gainNode.gain.setValueAtTime(musicEnabled ? 0.6 : 0, audioCtx.currentTime);
    }
  }, durationMs);
}

export function preloadAllTracks() {
  // With MediaElementSource, preloading is handled by the browser automatically
  // when play() is called. No-op here.
}

export function playAudioLogoThenSelectMusic() {
  selectedTrackIndex = SELECT_TRACK_INDEX;
  const ctx = getCtx();
  // iOS unlock: play silent buffer in gesture handler to activate the AudioContext
  const silentBuf = ctx.createBuffer(1, 1, 22050);
  const silent = ctx.createBufferSource();
  silent.buffer = silentBuf;
  silent.connect(ctx.destination);
  silent.start(0);
  if (sfxEnabled) {
    const logo = new Audio('/sounds/Sudoku_Fighting_Audio_Logo.mp3');
    logo.play().catch(() => {});
  }
  ctx.resume().then(() => startFightMusic());
}

// ── Announcer clips ────────────────────────────────────────────────────────

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

// ── Dialogue text blip ─────────────────────────────────────────────────────

const textBlipEl = new Audio('/sounds/text_blip.wav');

export function playTextBlip() {
  if (!sfxEnabled) return;
  textBlipEl.currentTime = 0;
  textBlipEl.play().catch(() => {});
}

// ── Attack SFX ─────────────────────────────────────────────────────────────

const ATTACK_SFX: Record<string, HTMLAudioElement> = {
  punch:           new Audio('/sounds/01_punch.wav'),
  kick:            new Audio('/sounds/02_kick.wav'),
  row_special:     new Audio('/sounds/03_special1.wav'),
  column_special:  new Audio('/sounds/04_special2.wav'),
  subgrid_special: new Audio('/sounds/05_special3.wav'),
};

export function playAttackSFX(type: AttackType, delay = SFX_LEAD_MS) {
  if (!sfxEnabled) return;
  const sfx = ATTACK_SFX[type] ?? ATTACK_SFX.punch;
  setTimeout(() => {
    if (!sfxEnabled) return;
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  }, delay);
}
