// Audio manager for fight music, announcer, and SFX
import { getArena } from './arenas.js';

let musicEnabled = true;
let sfxEnabled   = true;

export function setMusicEnabled(enabled) {
  musicEnabled = enabled;
  gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  gainNode.gain.setValueAtTime(enabled ? 0.6 : 0, audioCtx.currentTime);
}

export function setSfxEnabled(enabled) {
  sfxEnabled = enabled;
}

// ---------------------------------------------------------------------------
// Fight music — uses Web Audio API for gapless looping
// ---------------------------------------------------------------------------

// All available tracks — add new entries here to extend the carousel
export const TRACKS = [
  { title: "I'm Going For It", src: '/sounds/Im_Going_For_It.mp3' },
  { title: 'Sudoku Fighting',  src: '/sounds/Sudoku_Fighting.mp3' },
  { title: 'Action Go',        src: '/sounds/Action_Go.mp3'       },
  { title: 'Haunted (Remix)',  src: '/sounds/Haunted_Remix.mp3'   },
];

let selectedTrackIndex = 0;

const SELECT_TRACK_INDEX = 1;

export function getSelectedTrackIndex() { return selectedTrackIndex; }

export function setTrackIndex(index) {
  selectedTrackIndex = ((index % TRACKS.length) + TRACKS.length) % TRACKS.length;
  // Restart music immediately with new track if something is playing
  if (currentSource) {
    currentSource.stop();
    currentSource = null;
    currentSrc = null;
    startFightMusic();
  }
}

const audioCtx = new AudioContext();
const gainNode = audioCtx.createGain();
gainNode.gain.value = 0.6;
gainNode.connect(audioCtx.destination);

// Cache decoded buffers so we only fetch each file once
const bufferCache = {};

async function loadBuffer(src) {
  if (bufferCache[src]) return bufferCache[src];
  const response = await fetch(src);
  const arrayBuffer = await response.arrayBuffer();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  bufferCache[src] = decoded;
  return decoded;
}

let currentSource = null;
let currentSrc = null;

export async function startFightMusic(backgroundId) {
  const arena = backgroundId ? getArena(backgroundId) : null;
  if (arena) {
    selectedTrackIndex = arena.trackIndex;
  }
  const src = TRACKS[selectedTrackIndex].src;
  if (currentSource && currentSrc === src) return; // same track already playing

  if (currentSource) {
    currentSource.stop();
    currentSource = null;
  }

  // Resume context if blocked by autoplay policy
  if (audioCtx.state === 'suspended') {
    const resume = async () => {
      await audioCtx.resume();
      document.removeEventListener('click', resume);
      document.removeEventListener('keydown', resume);
    };
    document.addEventListener('click', resume);
    document.addEventListener('keydown', resume);
  }

  // Restore gain (respecting mute state) in case it was faded out
  gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  gainNode.gain.setValueAtTime(musicEnabled ? 0.6 : 0, audioCtx.currentTime);

  const buffer = await loadBuffer(src);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(gainNode);
  source.start();
  currentSource = source;
  currentSrc = src;
}

export function fadeOutMusic(durationMs = 500) {
  if (!currentSource) return;
  const duration = durationMs / 1000;
  gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);

  const src = currentSource;
  setTimeout(() => {
    try { src.stop(); } catch {}
    if (currentSource === src) { currentSource = null; currentSrc = null; }
    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setValueAtTime(musicEnabled ? 0.6 : 0, audioCtx.currentTime);
  }, durationMs);
}

// ---------------------------------------------------------------------------
// Announcer clips
// ---------------------------------------------------------------------------

export function preloadAllTracks() {
  TRACKS.forEach(t => loadBuffer(t.src).catch(() => {}));
}

// Plays the audio logo and select music simultaneously.
// Called from within a user-gesture handler so both should play without issue.
// Returns the resolved track index so callers can update UI synchronously.
export function playAudioLogoThenSelectMusic() {
  // Apply select default synchronously so carousel title updates immediately
  selectedTrackIndex = SELECT_TRACK_INDEX;
  if (sfxEnabled) {
    const logo = new Audio('/sounds/Sudoku_Fighting_Audio_Logo.mp3');
    logo.play().catch(() => {});
  }
  audioCtx.resume().then(() => startFightMusic('select'));
}

const ROUND_CLIPS = {
  1: new Audio('/sounds/Round_One.mp3'),
  2: new Audio('/sounds/Round_Two.mp3'),
  3: new Audio('/sounds/Round_Three.mp3'),
};
const fightClip      = new Audio('/sounds/Fight.mp3');
const victoryClip    = new Audio('/sounds/Victory.mp3');
const devastationClip = new Audio('/sounds/Devestation.mp3');
const koClip         = new Audio('/sounds/KO.mp3');
const tkoClip        = new Audio('/sounds/TKO.mp3');

function playClip(audio) {
  if (!sfxEnabled) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

export function playRoundAnnouncer(roundNumber) {
  const clip = ROUND_CLIPS[roundNumber];
  if (clip) playClip(clip);
}

export function playFightAnnouncer() {
  playClip(fightClip);
}

const fightBellClip = new Audio('/sounds/fight_bell.wav');

function playFightBell() {
  playClip(fightBellClip);
}

export function playKOAnnouncer() {
  playFightBell();
  setTimeout(() => playClip(koClip), 600);
}

export function playTKOAnnouncer() {
  playFightBell();
  setTimeout(() => playClip(tkoClip), 600);
}

export function playVictoryAnnouncer() {
  playClip(victoryClip);
}

export function playDevastationAnnouncer() {
  playClip(devastationClip);
}

// ---------------------------------------------------------------------------
// Attack SFX
// ---------------------------------------------------------------------------

const ATTACK_SFX = {
  punch:           new Audio('/sounds/01_punch.wav'),
  kick:            new Audio('/sounds/02_kick.wav'),
  row_special:     new Audio('/sounds/03_special1.wav'),
  column_special:  new Audio('/sounds/04_special2.wav'),
  subgrid_special: new Audio('/sounds/05_special3.wav'),
};

// Small delay so the sound lands just before the visual impact frame
const SFX_LEAD_MS = 80;

export function playAttackSFX(type, delay = SFX_LEAD_MS) {
  if (!sfxEnabled) return;
  const sfx = ATTACK_SFX[type] ?? ATTACK_SFX.punch;
  setTimeout(() => {
    if (!sfxEnabled) return;
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  }, delay);
}
