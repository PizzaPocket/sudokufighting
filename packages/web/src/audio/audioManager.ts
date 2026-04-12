// Audio manager — TypeScript singleton
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
let selectedTrackIndex = SELECT_TRACK_INDEX;

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

// ── SFX via AudioBuffer ────────────────────────────────────────────────────────
// All SFX are pre-fetched as ArrayBuffers on page load (no AudioContext needed).
// After initAudio() creates the AudioContext, buffers are decoded via
// decodeAudioData(). Playback uses one-shot AudioBufferSourceNodes — no
// HTMLAudioElement gesture-unlock ceremony needed on any platform.

const SFX_SRCS: Record<string, string> = {
  round1:         '/sounds/Round_One.mp3',
  round2:         '/sounds/Round_Two.mp3',
  round3:         '/sounds/Round_Three.mp3',
  fight:          '/sounds/Fight.mp3',
  victory:        '/sounds/Victory.mp3',
  devastation:    '/sounds/Devestation.mp3',
  ko:             '/sounds/KO.mp3',
  tko:            '/sounds/TKO.mp3',
  fightBell:      '/sounds/fight_bell.wav',
  punch:          '/sounds/01_punch.wav',
  kick:           '/sounds/02_kick.wav',
  rowSpecial:     '/sounds/03_special1.wav',
  colSpecial:     '/sounds/04_special2.wav',
  subgridSpecial: '/sounds/05_special3.wav',
  blip:           '/sounds/text_blip.wav',
  logo:           '/sounds/Sudoku_Fighting_Audio_Logo.m4a',
};

// Raw ArrayBuffers fetched pre-gesture (populates browser HTTP cache)
const fetchedRaw = new Map<string, ArrayBuffer>();
// Decoded AudioBuffers (available after initAudio creates the AudioContext)
const decodedBuffers = new Map<string, AudioBuffer>();

// Fetch all SFX on module load. No AudioContext required — pure HTTP.
function prefetchAudio(): void {
  for (const src of Object.values(SFX_SRCS)) {
    fetch(src)
      .then(r => r.arrayBuffer())
      .then(ab => {
        fetchedRaw.set(src, ab);
        // Decode immediately if AudioContext already exists
        if (audioCtx) decodeSingle(src, ab);
      })
      .catch(() => {});
  }
  // Also warm the browser cache for select music (large file, can't decode in memory)
  fetch(TRACKS[SELECT_TRACK_INDEX].src).catch(() => {});
}

function decodeSingle(src: string, ab: ArrayBuffer): void {
  if (!audioCtx) return;
  // slice() copies the buffer — decodeAudioData may detach the original
  audioCtx.decodeAudioData(ab.slice(0), buf => {
    decodedBuffers.set(src, buf);
  }, () => {});
}

// Decode all already-fetched raw buffers. Called from initAudio().
function decodeAllFetched(): void {
  for (const [src, ab] of fetchedRaw.entries()) {
    if (!decodedBuffers.has(src)) decodeSingle(src, ab);
  }
}

// Play a decoded SFX buffer, optionally delayed by delayMs.
// Connects directly to ctx.destination (bypasses gainNode / music volume).
function playBuf(src: string, delayMs = 0): void {
  if (!sfxEnabled || !audioCtx) return;
  const buf = decodedBuffers.get(src);
  if (!buf) return;
  const node = audioCtx.createBufferSource();
  node.buffer = buf;
  node.connect(audioCtx.destination);
  node.start(audioCtx.currentTime + delayMs / 1000);
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
//   called. Fight tracks download on-demand when startFightMusic() fires — there
//   is always a 2+ second buffer window (round intro overlay) before fight audio
//   is actually needed.

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
    // is called. The select track starts downloading in playLogoAndSelectMusic();
    // fight tracks start downloading when startFightMusic() calls play().
    el.preload = 'none';
    el.loop = true;
    const node = ctx.createMediaElementSource(el);
    node.connect(gainNode!);
    trackPool.set(track.src, { el, node });
  }
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
  if (currentTrackSrc) startFightMusic();
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
    // Reset to the beginning so the theme always starts fresh on return to menu.
    const entry = trackPool.get(TRACKS[SELECT_TRACK_INDEX].src);
    if (entry) entry.el.currentTime = 0;
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
// initAudio: called once on first user interaction (splash puzzle touch/key, or
// first start-screen gesture for room-code path). Creates the AudioContext,
// wires music tracks into the Web Audio graph, and begins decoding all
// pre-fetched SFX ArrayBuffers. Produces no audible output.

let audioInited = false;

export function initAudio(): void {
  if (audioInited) return;
  audioInited = true;

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

  // Decode all SFX ArrayBuffers that have already been fetched.
  // Any that haven't arrived yet will be decoded when their fetch resolves.
  decodeAllFetched();
}

// playLogoAndSelectMusic: called on splash Enter press. Plays the audio logo
// SFX and starts the select music. Requires initAudio() to have been called.

export async function playLogoAndSelectMusic(): Promise<void> {
  const ctx = getCtx();
  if (ctx.state !== 'running') await ctx.resume();

  // Play audio logo via decoded buffer (falls back to HTMLAudioElement if not
  // yet decoded — rare, but possible on very slow connections).
  if (sfxEnabled) {
    const logoSrc = SFX_SRCS.logo;
    const logoBuf = decodedBuffers.get(logoSrc);
    if (logoBuf) {
      const node = ctx.createBufferSource();
      node.buffer = logoBuf;
      node.connect(ctx.destination);
      node.start();
    } else {
      new Audio(logoSrc).play().catch(() => {});
    }
  }

  // Start select music. The track pool was already wired in initAudio().
  const selectEntry = trackPool.get(TRACKS[SELECT_TRACK_INDEX].src);
  if (selectEntry) {
    currentTrackSrc = TRACKS[SELECT_TRACK_INDEX].src;
    selectEntry.el.currentTime = 0;
    resetGain();
    selectEntry.el.play().catch(() => {});
  }
}

// ── SFX playback ───────────────────────────────────────────────────────────────

export function playRoundAnnouncer(roundNumber: number) {
  const src = SFX_SRCS[`round${roundNumber}`];
  if (src) playBuf(src);
}

export function playFightAnnouncer()       { playBuf(SFX_SRCS.fight); }

export function playKOAnnouncer() {
  playBuf(SFX_SRCS.fightBell);
  playBuf(SFX_SRCS.ko, 600);
}

export function playTKOAnnouncer() {
  playBuf(SFX_SRCS.fightBell);
  playBuf(SFX_SRCS.tko, 600);
}

export function playVictoryAnnouncer()     { playBuf(SFX_SRCS.victory); }
export function playDevastationAnnouncer() { playBuf(SFX_SRCS.devastation); }

// ── Dialogue text blip ─────────────────────────────────────────────────────────
// AudioBufferSourceNode is a one-shot node — each call creates a new instance.
// Rapid-fire blips overlap naturally, no pool needed.

export function playTextBlip() {
  playBuf(SFX_SRCS.blip);
}

// ── Attack SFX ─────────────────────────────────────────────────────────────────

const ATTACK_SFX_KEYS: Record<string, string> = {
  punch:           'punch',
  kick:            'kick',
  row_special:     'rowSpecial',
  column_special:  'colSpecial',
  subgrid_special: 'subgridSpecial',
};

export function playAttackSFX(type: AttackType, delay = SFX_LEAD_MS) {
  if (!sfxEnabled) return;
  const key = ATTACK_SFX_KEYS[type] ?? 'punch';
  const src = SFX_SRCS[key];
  playBuf(src, delay);
}

// ── Module init ────────────────────────────────────────────────────────────────
// Start fetching SFX and warming the select music cache immediately.
prefetchAudio();
