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

const fetchedRaw    = new Map<string, ArrayBuffer>();
const decodedBuffers = new Map<string, AudioBuffer>();

function prefetchAudio(): void {
  // SFX — fetch to ArrayBuffer; decoded once AudioContext exists
  for (const src of Object.values(SFX_SRCS)) {
    fetch(src)
      .then(r => r.arrayBuffer())
      .then(ab => {
        fetchedRaw.set(src, ab);
        if (audioCtx) decodeSingle(src, ab);
      })
      .catch(() => {});
  }
  // Warm the browser cache for the select music track and the first fight track.
  // Full decode happens lazily when startFightMusic() is first called.
  fetch(TRACKS[SELECT_TRACK_INDEX].src).catch(() => {});
}

function decodeSingle(src: string, ab: ArrayBuffer): void {
  if (!audioCtx) return;
  audioCtx.decodeAudioData(ab.slice(0), buf => {
    decodedBuffers.set(src, buf);
  }, () => {});
}

function decodeAllFetched(): void {
  for (const [src, ab] of fetchedRaw.entries()) {
    if (!decodedBuffers.has(src)) decodeSingle(src, ab);
  }
}

function playBuf(src: string, delayMs = 0): void {
  if (!sfxEnabled || !audioCtx) return;
  const buf = decodedBuffers.get(src);
  if (!buf) return;
  const node = audioCtx.createBufferSource();
  node.buffer = buf;
  node.connect(audioCtx.destination);
  node.start(audioCtx.currentTime + delayMs / 1000);
}

// ── Music — AudioBufferSourceNode for gapless looping ─────────────────────────
//
// HTMLAudioElement.loop does a real seek-to-0 on each loop, causing an audible
// gap. AudioBufferSourceNode with loop:true wraps the read pointer at the sample
// level — the scheduler never leaves the buffer, so looping is truly gapless.
//
// Pause/resume: AudioBufferSourceNode cannot be paused. Instead we record the
// playback offset at pause time and start a new node from that offset on resume.
// The offset is (ctx.currentTime - startedAt + initialOffset) % duration.

const musicBuffers  = new Map<string, AudioBuffer>();
const musicDecoding = new Map<string, Promise<AudioBuffer | null>>();

// Active playback state
let _musicNode:          AudioBufferSourceNode | null = null;
let _musicBuffer:        AudioBuffer | null = null;
let _musicSrc:           string | null = null;
let _musicStartedAt      = 0;     // ctx.currentTime when current node started
let _musicInitialOffset  = 0;     // track position the node started from
let _musicPaused         = false;
let _musicPauseOffset    = 0;     // track position saved on user-pause

function _fetchAndDecode(src: string): Promise<AudioBuffer | null> {
  if (musicDecoding.has(src)) return musicDecoding.get(src)!;
  const p = fetch(src)
    .then(r => r.arrayBuffer())
    .then(ab => new Promise<AudioBuffer | null>(resolve => {
      const ctx = getCtx();
      ctx.decodeAudioData(ab, buf => {
        musicBuffers.set(src, buf);
        resolve(buf);
      }, () => resolve(null));
    }))
    .catch(() => null);
  musicDecoding.set(src, p);
  return p;
}

function _getMusicPosition(): number {
  if (!_musicBuffer || !audioCtx) return _musicPauseOffset;
  const elapsed = audioCtx.currentTime - _musicStartedAt;
  return (_musicInitialOffset + elapsed) % _musicBuffer.duration;
}

function _stopMusicNode(): void {
  if (_musicNode) {
    try { _musicNode.stop(); } catch {}
    _musicNode.disconnect();
    _musicNode = null;
  }
}

function _startNode(src: string, buffer: AudioBuffer, offset = 0): void {
  _stopMusicNode();
  const ctx = getCtx();
  const node = ctx.createBufferSource();
  node.buffer = buffer;
  node.loop = true;
  node.loopStart = 0;
  node.loopEnd = buffer.duration;
  node.connect(gainNode!);
  _musicNode          = node;
  _musicBuffer        = buffer;
  _musicSrc           = src;
  _musicInitialOffset = offset % buffer.duration;
  _musicStartedAt     = ctx.currentTime;
  _musicPaused        = false;
  node.start(0, _musicInitialOffset);
}

// ── Mobile AudioContext recovery ───────────────────────────────────────────────
// AudioBufferSourceNode pauses/resumes automatically with the AudioContext,
// so we only need to resume the context itself. We do NOT restart the music node
// here — that would reset the loop position and cause a skip.

function registerRecoveryListeners(ctx: AudioContext): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      ctx.resume().catch(() => {});
    }
  });

  const wakeOnGesture = () => {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  };
  document.addEventListener('pointerdown', wakeOnGesture, { passive: true });
  document.addEventListener('keydown',     wakeOnGesture, { passive: true });
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
  if (_musicSrc) startFightMusic();
}

function resetGain(): void {
  if (!gainNode || !audioCtx) return;
  gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  gainNode.gain.setValueAtTime(musicEnabled ? 0.6 : 0, audioCtx.currentTime);
}

export async function startFightMusic(backgroundId?: string) {
  const arena = backgroundId ? getArena(backgroundId) : null;
  if (arena) selectedTrackIndex = arena.trackIndex;

  const src = TRACKS[selectedTrackIndex].src;
  const ctx = getCtx();
  if (ctx.state !== 'running') await ctx.resume();

  resetGain();

  // Already playing this track — nothing to do
  if (_musicSrc === src && _musicNode && !_musicPaused) return;

  // Same track but user-paused — resume from saved position
  if (_musicSrc === src && _musicPaused && _musicBuffer) {
    _startNode(src, _musicBuffer, _musicPauseOffset);
    return;
  }

  // New track — fetch & decode if needed, then play
  let buffer = musicBuffers.get(src) ?? null;
  if (!buffer) buffer = await _fetchAndDecode(src);
  if (!buffer) return;

  _startNode(src, buffer);
}

/** Pause music, saving the current playback position. */
export function pauseMusic(): void {
  if (_musicPaused || !_musicNode || !_musicBuffer) return;
  _musicPauseOffset = _getMusicPosition();
  _musicPaused = true;
  _stopMusicNode();
}

/** Resume music from the position it was paused at. */
export function resumeMusic(): void {
  if (!_musicPaused || !_musicBuffer || !_musicSrc) return;
  if (!musicEnabled) { _musicPaused = false; return; }
  _startNode(_musicSrc, _musicBuffer, _musicPauseOffset);
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
  _stopMusicNode();
  _musicSrc    = null;
  _musicBuffer = null;
  _musicPaused = false;
  if (gainNode && audioCtx) {
    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  }
}

export function fadeOutMusic(durationMs = 500) {
  if (!gainNode || !audioCtx) return;
  const duration = durationMs / 1000;
  gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);

  const fadingSrc = _musicSrc;
  _musicSrc = null;

  setTimeout(() => {
    // Only stop if nothing new started over it
    if (fadingSrc && _musicSrc !== fadingSrc) _stopMusicNode();
  }, durationMs);
}

// No-op — kept for any remaining call sites
export function preloadAllTracks() {}

// ── First-gesture audio unlock ─────────────────────────────────────────────────

let audioInited = false;

export function initAudio(): void {
  if (audioInited) return;
  audioInited = true;

  const ctx = getCtx();

  // iOS silent-buffer unlock
  const silentBuf = ctx.createBuffer(1, 1, 22050);
  const silent = ctx.createBufferSource();
  silent.buffer = silentBuf;
  silent.connect(ctx.destination);
  silent.start(0);
  ctx.resume();

  decodeAllFetched();
}

export async function playLogoAndSelectMusic(): Promise<void> {
  const ctx = getCtx();
  if (ctx.state !== 'running') await ctx.resume();

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

  // Start fetching+decoding the select track if not already done
  const selectSrc = TRACKS[SELECT_TRACK_INDEX].src;
  let buffer = musicBuffers.get(selectSrc) ?? null;
  if (!buffer) buffer = await _fetchAndDecode(selectSrc);
  if (!buffer) return;

  _musicSrc = selectSrc;
  resetGain();
  _startNode(selectSrc, buffer, 0);
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

export function playTextBlip() {
  playBuf(SFX_SRCS.blip);
}

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
prefetchAudio();
