// Audio manager — port of frontend/js/audio.js to TypeScript singleton
import { getArena } from '@sudoku-fighting/shared';
export const TRACKS = [
    { title: "I'm Going For It", src: '/sounds/Im_Going_For_It.mp3' },
    { title: 'Sudoku Fighting', src: '/sounds/Sudoku_Fighting.mp3' },
    { title: 'Action Go', src: '/sounds/Action_Go.mp3' },
    { title: 'Haunted (Remix)', src: '/sounds/Haunted_Remix.mp3' },
];
const SELECT_TRACK_INDEX = 1;
const SFX_LEAD_MS = 80;
let musicEnabled = true;
let sfxEnabled = true;
let selectedTrackIndex = 0;
// Web Audio API — created lazily on first user interaction to satisfy browser policy
let audioCtx = null;
let gainNode = null;
let currentSource = null;
let currentSrc = null;
const bufferCache = {};
function getCtx() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.6;
        gainNode.connect(audioCtx.destination);
    }
    return audioCtx;
}
async function loadBuffer(src) {
    if (bufferCache[src])
        return bufferCache[src];
    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    const decoded = await getCtx().decodeAudioData(arrayBuffer);
    bufferCache[src] = decoded;
    return decoded;
}
export function setMusicEnabled(enabled) {
    musicEnabled = enabled;
    if (!gainNode || !audioCtx)
        return;
    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setValueAtTime(enabled ? 0.6 : 0, audioCtx.currentTime);
}
export function setSfxEnabled(enabled) {
    sfxEnabled = enabled;
}
export function getSelectedTrackIndex() { return selectedTrackIndex; }
export function setTrackIndex(index) {
    selectedTrackIndex = ((index % TRACKS.length) + TRACKS.length) % TRACKS.length;
    if (currentSource) {
        currentSource.stop();
        currentSource = null;
        currentSrc = null;
        startFightMusic();
    }
}
export async function startFightMusic(backgroundId) {
    const arena = backgroundId ? getArena(backgroundId) : null;
    if (arena)
        selectedTrackIndex = arena.trackIndex;
    const src = TRACKS[selectedTrackIndex].src;
    if (currentSource && currentSrc === src)
        return;
    if (currentSource) {
        currentSource.stop();
        currentSource = null;
    }
    const ctx = getCtx();
    if (ctx.state !== 'running')
        await ctx.resume();
    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.setValueAtTime(musicEnabled ? 0.6 : 0, ctx.currentTime);
    const buffer = await loadBuffer(src);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gainNode);
    source.start();
    currentSource = source;
    currentSrc = src;
}
export function switchToSelectMusic() {
    const delay = 500;
    fadeOutMusic(delay);
    setTimeout(() => {
        selectedTrackIndex = SELECT_TRACK_INDEX;
        startFightMusic();
    }, delay + 50);
}
export function fadeOutMusic(durationMs = 500) {
    if (!currentSource || !gainNode || !audioCtx)
        return;
    const duration = durationMs / 1000;
    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
    const src = currentSource;
    setTimeout(() => {
        try {
            src.stop();
        }
        catch { /* already stopped */ }
        if (currentSource === src) {
            currentSource = null;
            currentSrc = null;
        }
        if (gainNode && audioCtx) {
            gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
            gainNode.gain.setValueAtTime(musicEnabled ? 0.6 : 0, audioCtx.currentTime);
        }
    }, durationMs);
}
export function preloadAllTracks() {
    TRACKS.forEach(t => loadBuffer(t.src).catch(() => { }));
}
export function playAudioLogoThenSelectMusic() {
    selectedTrackIndex = SELECT_TRACK_INDEX;
    const ctx = getCtx();
    // iOS unlock: play silent buffer in gesture handler
    const silentBuf = ctx.createBuffer(1, 1, 22050);
    const silent = ctx.createBufferSource();
    silent.buffer = silentBuf;
    silent.connect(ctx.destination);
    silent.start(0);
    if (sfxEnabled) {
        const logo = new Audio('/sounds/Sudoku_Fighting_Audio_Logo.mp3');
        logo.play().catch(() => { });
    }
    ctx.resume().then(() => startFightMusic());
}
// ── Announcer clips ────────────────────────────────────────────────────────
const ROUND_CLIPS = {
    1: new Audio('/sounds/Round_One.mp3'),
    2: new Audio('/sounds/Round_Two.mp3'),
    3: new Audio('/sounds/Round_Three.mp3'),
};
const fightClip = new Audio('/sounds/Fight.mp3');
const victoryClip = new Audio('/sounds/Victory.mp3');
const devastationClip = new Audio('/sounds/Devestation.mp3');
const koClip = new Audio('/sounds/KO.mp3');
const tkoClip = new Audio('/sounds/TKO.mp3');
const fightBellClip = new Audio('/sounds/fight_bell.wav');
function playClip(audio) {
    if (!sfxEnabled)
        return;
    audio.currentTime = 0;
    audio.play().catch(() => { });
}
export function playRoundAnnouncer(roundNumber) {
    const clip = ROUND_CLIPS[roundNumber];
    if (clip)
        playClip(clip);
}
export function playFightAnnouncer() { playClip(fightClip); }
export function playKOAnnouncer() { playClip(fightBellClip); setTimeout(() => playClip(koClip), 600); }
export function playTKOAnnouncer() { playClip(fightBellClip); setTimeout(() => playClip(tkoClip), 600); }
export function playVictoryAnnouncer() { playClip(victoryClip); }
export function playDevastationAnnouncer() { playClip(devastationClip); }
// ── Attack SFX ─────────────────────────────────────────────────────────────
const ATTACK_SFX = {
    punch: new Audio('/sounds/01_punch.wav'),
    kick: new Audio('/sounds/02_kick.wav'),
    row_special: new Audio('/sounds/03_special1.wav'),
    column_special: new Audio('/sounds/04_special2.wav'),
    subgrid_special: new Audio('/sounds/05_special3.wav'),
};
export function playAttackSFX(type, delay = SFX_LEAD_MS) {
    if (!sfxEnabled)
        return;
    const sfx = ATTACK_SFX[type] ?? ATTACK_SFX.punch;
    setTimeout(() => {
        if (!sfxEnabled)
            return;
        sfx.currentTime = 0;
        sfx.play().catch(() => { });
    }, delay);
}
