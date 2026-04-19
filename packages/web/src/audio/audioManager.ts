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

const fetchedRaw     = new Map<string, ArrayBuffer>();
const decodedBuffers = new Map<string, AudioBuffer>();

// Raw ArrayBuffers for music tracks — fetched early so initAudio can decode
// synchronously (within gesture) without a network round-trip.
const musicRaw = new Map<string, ArrayBuffer>();

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
  // Pre-fetch select music track raw buffer.
  // Stored in musicRaw so initAudio() can decode it immediately (within gesture),
  // avoiding any network wait in playLogoAndSelectMusic().
  const selectSrc = TRACKS[SELECT_TRACK_INDEX].src;
  fetch(selectSrc)
    .then(r => r.arrayBuffer())
    .then(ab => { musicRaw.set(selectSrc, ab); })
    .catch(() => {});
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
// Pause/resume: AudioBufferSourceNode cannot be paused. We record the playback
// offset at pause time and start a new node from that offset on resume.

const musicBuffers  = new Map<string, AudioBuffer>();
const musicDecoding = new Map<string, Promise<AudioBuffer | null>>();

// Active playback state
let _musicNode:         AudioBufferSourceNode | null = null;
let _musicBuffer:       AudioBuffer | null = null;
let _musicSrc:          string | null = null;
let _musicStartedAt     = 0;   // ctx.currentTime when current node started
let _musicInitialOffset = 0;   // track position the node started from
let _musicPaused        = false;
let _musicPauseOffset   = 0;   // track position saved on pause

// ── iOS keepAlive (Web Audio) ──────────────────────────────────────────────────
// A silent looping AudioBufferSourceNode prevents iOS from auto-suspending the
// AudioContext between audio events (e.g. between initAudio() and the first
// music node start, or between tracks).

let _keepAliveNode: AudioBufferSourceNode | null = null;

function startKeepAlive(ctx: AudioContext): void {
  if (_keepAliveNode) return;
  const silentBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); // 1s silence
  const node = ctx.createBufferSource();
  node.buffer = silentBuf;
  node.loop = true;
  node.connect(ctx.destination);
  node.start(0);
  _keepAliveNode = node;
}

// ── iOS session keeper (HTMLAudioElement) ──────────────────────────────────────
// iOS audio sessions have two relevant categories:
//   "ambient"  — default for Web Audio API; silenced by the mute switch.
//   "playback" — used by HTMLAudioElement; bypasses the mute switch (like apps).
//
// When HTMLAudioElement.play() is called in a gesture the session upgrades to
// "playback". However the upgrade reverts when that element finishes playing.
// Solution: keep a silent looping HTMLAudioElement alive after the first gesture
// so the session stays in "playback" permanently, even after the logo jingle ends.

let _iosSessionEl: HTMLAudioElement | null = null;

function keepIOSSession(): void {
  if (_iosSessionEl) return;
  const ctx = getCtx();
  const el = new Audio(SFX_SRCS.blip);
  el.loop = true;
  // Route through Web Audio at gain=0 — completely silent in the audio output,
  // but the HTMLAudioElement is actively playing so iOS recognises it as real
  // media and keeps the audio session in "playback" mode indefinitely.
  // This is inaudible even through headphones, unlike a non-zero volume approach.
  const source = ctx.createMediaElementSource(el);
  const muteGain = ctx.createGain();
  muteGain.gain.value = 0;
  source.connect(muteGain);
  muteGain.connect(ctx.destination);
  el.play().catch(() => {});
  _iosSessionEl = el;
}

// ── _fetchAndDecode — uses musicRaw to avoid network fetch when possible ───────

function _fetchAndDecode(src: string): Promise<AudioBuffer | null> {
  if (musicDecoding.has(src)) return musicDecoding.get(src)!;

  const ctx = getCtx();

  // Use pre-fetched raw buffer if available — avoids a network round-trip
  // so the decode starts immediately without an async fetch macrotask.
  const rawAb = musicRaw.get(src);
  if (rawAb) {
    const p = new Promise<AudioBuffer | null>(resolve => {
      ctx.decodeAudioData(rawAb.slice(0), buf => {
        musicBuffers.set(src, buf);
        resolve(buf);
      }, () => resolve(null));
    });
    musicDecoding.set(src, p);
    return p;
  }

  // Fallback: fetch from network (browser cache hit is fast, but still async)
  const p = fetch(src)
    .then(r => r.arrayBuffer())
    .then(ab => {
      musicRaw.set(src, ab); // cache raw buffer for future use
      return new Promise<AudioBuffer | null>(resolve => {
        ctx.decodeAudioData(ab, buf => {
          musicBuffers.set(src, buf);
          resolve(buf);
        }, () => resolve(null));
      });
    })
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
// Strategy:
//   1. keepAlive silent node prevents iOS from suspending an active context.
//   2. onstatechange detects suspension (page background, phone lock, etc.)
//      → saves music position, clears stale node refs.
//   3. On resume (visibilitychange / gesture): context resumes, onstatechange
//      fires with 'running' → keepAlive and music node are restarted.

function registerRecoveryListeners(ctx: AudioContext): void {
  ctx.onstatechange = () => {
    if (ctx.state === 'suspended') {
      // Save music position before ctx.currentTime freezes.
      if (_musicBuffer && !_musicPaused) {
        _musicPauseOffset = _getMusicPosition();
      }
      // Nodes are stopped by the suspension; clear refs so restart logic works.
      _keepAliveNode = null;
      _musicNode     = null;
    } else if (ctx.state === 'running') {
      // Context recovered — restart keepAlive and music (if it was playing).
      startKeepAlive(ctx);
      if (_musicBuffer && _musicSrc && !_musicPaused) {
        _startNode(_musicSrc, _musicBuffer, _musicPauseOffset);
      }
    }
  };

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

  // New track — decode if needed (uses musicRaw if pre-fetched), then play
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
    if (fadingSrc && _musicSrc !== fadingSrc) _stopMusicNode();
  }, durationMs);
}

// No-op — kept for any remaining call sites
export function preloadAllTracks() {}

/**
 * Pre-fetch a music track's raw bytes and decode it if AudioContext exists.
 * Call when you know a track will be needed soon (e.g. arena background change)
 * so the buffer is ready by the time startFightMusic() is called.
 */
export function preloadMusicTrack(src: string): void {
  if (musicRaw.has(src) || musicDecoding.has(src) || musicBuffers.has(src)) return;
  fetch(src)
    .then(r => r.arrayBuffer())
    .then(ab => {
      musicRaw.set(src, ab);
      if (audioCtx) _fetchAndDecode(src);
    })
    .catch(() => {});
}

// ── First-gesture audio unlock ─────────────────────────────────────────────────
// iOS requires AudioContext.resume() AND the first node.start() to happen
// synchronously within a user gesture handler. initAudio() satisfies this:
//   • ctx.resume() — synchronous call within gesture
//   • startKeepAlive() — starts a silent node, keeping the context alive
//   • _fetchAndDecode(selectSrc) — kicks off decode from musicRaw (no network),
//     so the buffer is ready (or nearly so) when playLogoAndSelectMusic() runs.

let audioInited = false;

export function initAudio(): void {
  if (audioInited) return;
  audioInited = true;

  const ctx = getCtx();

  // Resume synchronously within the gesture handler
  ctx.resume();

  // keepAlive: prevents iOS from auto-suspending the context between audio events
  startKeepAlive(ctx);

  // Decode all pre-fetched SFX
  decodeAllFetched();

  // Kick off select music decode from pre-fetched raw bytes (no network wait).
  // By the time the user finishes the splash puzzle and hits ENTER, this is done.
  const selectSrc = TRACKS[SELECT_TRACK_INDEX].src;
  if (musicRaw.has(selectSrc) && !musicDecoding.has(selectSrc) && !musicBuffers.has(selectSrc)) {
    _fetchAndDecode(selectSrc);
  }
}

export async function playLogoAndSelectMusic(): Promise<void> {
  const ctx = getCtx();
  if (ctx.state !== 'running') await ctx.resume();

  // Both calls must come before any await — they require synchronous gesture context.
  if (sfxEnabled) {
    // Logo via HTMLAudioElement sets the iOS audio session to "playback", which
    // bypasses the mute switch and routes audio through the main speaker.
    new Audio(SFX_SRCS.logo).play().catch(() => {});
  }
  // Session keeper: a real audio file looping at near-zero volume keeps the
  // "playback" session alive after the logo jingle finishes. iOS does not
  // maintain the session from silent/data-URI audio or volume=0 elements.
  keepIOSSession();

  const selectSrc = TRACKS[SELECT_TRACK_INDEX].src;

  // Fast path: buffer already decoded — no await needed
  let buffer = musicBuffers.get(selectSrc) ?? null;
  if (!buffer) {
    // Await the decode that was kicked off in initAudio().
    // keepAlive keeps the context running during this short wait.
    buffer = await _fetchAndDecode(selectSrc);
  }
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

// Frame at which impact lands, per special (120ms per frame)
const SPECIAL_HIT_FRAME: Partial<Record<AttackType, number>> = {
  row_special:     2, // hit on frame 2 → 120ms
  column_special:  3, // hit on frame 3 → 240ms
  subgrid_special: 3,
};

export function playAttackSFX(type: AttackType, delay = SFX_LEAD_MS) {
  if (!sfxEnabled) return;
  const key = ATTACK_SFX_KEYS[type] ?? 'punch';
  const src = SFX_SRCS[key];
  playBuf(src, delay);
  const hitFrame = SPECIAL_HIT_FRAME[type];
  if (hitFrame != null) {
    playBuf(SFX_SRCS.kick, (hitFrame - 1) * 120);
  }
}

// ── Module init ────────────────────────────────────────────────────────────────
prefetchAudio();
