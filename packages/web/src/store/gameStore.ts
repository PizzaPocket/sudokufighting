import { create } from 'zustand';
import type {
  ServerMessage, AttackType, AnimationState, Character, Difficulty, DialogueEntry,
} from '@sudoku-fighting/shared';
import { STARTING_HEALTH, HEALTH_UPDATE_DELAY_LIGHT, HEALTH_UPDATE_DELAY_HEAVY, ANIMATION_CONFIG } from '@sudoku-fighting/shared';
import { playAttackSFX, pauseMusic, resumeMusic, SELECT_TRACK_INDEX } from '../audio/audioManager';
import { BASE_UNLOCKED } from '../progression/progressionService';
import { CAMPAIGN_SCORE_MULTIPLIERS } from '../stats/statsService';

export type Screen = 'splash' | 'start' | 'character-select' | 'lobby' | 'practice-lobby' | 'campaign-lobby' | 'campaign-dialogue' | 'gameplay' | 'privacy';

// Skip splash when the URL contains a ?room= code (user tapped an invite link).
function getInitialScreen(): Screen {
  try {
    return new URLSearchParams(window.location.search).has('room') ? 'start' : 'splash';
  } catch {
    return 'splash';
  }
}
export type GameMode = 'quick' | 'friend' | 'practice' | 'campaign' | null;

export interface AnimSignal {
  state: AnimationState;
  nonce: number; // increments so two identical signals re-trigger useEffect
}

export interface FloatingPointsEvent {
  id: number;
  seat: 0 | 1;
  points: number;
  row?: number;
  col?: number;
}

export interface WipingCell {
  targetSeat: 0 | 1;
  row: number;
  col: number;
}

interface GameStore {
  // ── Navigation ────────────────────────────────────────────────────────────
  currentScreen: Screen;
  prevScreen: Screen | null;
  startEntering: boolean;
  gameMode: GameMode;
  initialInteractionDone: boolean;

  // ── Connection ────────────────────────────────────────────────────────────
  wsConnected: boolean;

  // ── Player ────────────────────────────────────────────────────────────────
  myPlayerId: string | null;
  mySeat: 0 | 1 | null;
  myCharacter: string | null;
  myName: string | null;
  myUseAlt: boolean;

  // ── Opponent ──────────────────────────────────────────────────────────────
  opponentName: string | null;
  opponentCharacter: string | null;
  opponentUseAlt: boolean;

  // ── Lobby ─────────────────────────────────────────────────────────────────
  shareCode: string | null;
  friendCreating: boolean;
  preferredArenaId: string | null;
  lobbyOpponentReady: boolean;
  lobbyJoinError: string | null;
  lobbyCountdown: number | null;

  // ── Single-player ─────────────────────────────────────────────────────────
  spDifficulty: Difficulty;
  spArenaIndex: number;

  // ── Puzzle state ──────────────────────────────────────────────────────────
  roundNumber: number;
  roundWins: [number, number];
  myPuzzle: (number | null)[][] | null;
  mySolution: number[][] | null;
  myGrid: (number | null)[][] | null;
  opponentGivens: (number | null)[][] | null;
  opponentGrid: (number | null)[][] | null;
  selectedCell: { row: number; col: number } | null;
  opponentCursorPos: { row: number; col: number } | null;

  // ── Combat ────────────────────────────────────────────────────────────────
  health: [number, number];
  combo: [number, number];
  score: [number, number];
  scoreOffset: [number, number];
  scoreFightOffset: [number, number];
  counterWindowActive: boolean;
  counterWindowExpiry: number | null;
  counterWindowDefenderSeat: 0 | 1 | null;
  counterLandedNonce: number;
  selfDamagePredicted: boolean;

  // ── Round flow ────────────────────────────────────────────────────────────
  roundOver: boolean;
  roundWinnerSeat: 0 | 1 | -1 | null;
  matchOver: boolean;
  matchWinnerSeat: 0 | 1 | -1 | null;
  matchWinnerName: string | null;
  opponentDisconnected: boolean;
  rematchPending: boolean;    // this player voted to rematch, waiting for opponent
  rematchOffered: boolean;    // opponent voted to rematch, waiting on us
  rematchCancelled: boolean;  // opponent left the end screen; REMATCH is no longer available
  backgroundId: string | null;
  fightStartTime: number | null;

  // ── Animation signals ─────────────────────────────────────────────────────
  p1AnimSignal: AnimSignal | null;
  p2AnimSignal: AnimSignal | null;
  p1MistakeSignal: { nonce: number } | null;
  p2MistakeSignal: { nonce: number } | null;
  attackFlashType: 'punch' | 'heavy' | 'self' | null;
  floatingPoints: FloatingPointsEvent[];
  wipingCells: WipingCell[];
  lastCorrectCell: { row: number; col: number; nonce: number } | null;
  preRoundSignal: { roundNumber: number; backgroundId: string; nonce: number } | null;

  // ── Characters data ───────────────────────────────────────────────────────
  characters: Character[];

  // ── Campaign ──────────────────────────────────────────────────────────────
  campaignFightIndex: number;
  campaignResult: 'gameover' | 'victory' | 'continue' | null;
  campaignDialogueQueue: DialogueEntry[];

  // ── Progression ───────────────────────────────────────────────────────────
  unlockedCharacterIds: string[];
  pendingUnlockIds: string[];
  campaignClearCount: number;

  // ── Credits cinematic ─────────────────────────────────────────────────────
  creditsActive: boolean;
  campaignFinalScore: number | null;   // adjusted score for completed run
  campaignFinalRank: number | null;    // global rank; null = loading or not yet queried

  // ── Match scoring (canonical) ──────────────────────────────────────────────
  isFlawlessVictory: boolean;     // player won 2–0 this match
  rawMatchScore: number;          // points scored this match/fight (difficulty multiplier already applied)
  finalMatchScore: number;        // rawMatchScore * 2 if flawless, else rawMatchScore
  campaignTotalScore: number;     // accumulated finalMatchScore across all campaign fights

  // ── Pause ─────────────────────────────────────────────────────────────────
  isPaused: boolean;
  totalPausedMs: number;    // accumulated ms paused this round (reset per round)
  pauseStartTime: number | null; // Date.now() when current pause began

  // ── Settings ──────────────────────────────────────────────────────────────
  musicEnabled: boolean;
  sfxEnabled: boolean;
  hapticsEnabled: boolean;
  selectedTrackIndex: number;
  settingsOpen: boolean;
  scoreboardOpen: boolean;
  aboutOpen: boolean;
  testCreditsOpen: boolean;

  // ── Actions ───────────────────────────────────────────────────────────────
  setScreen: (screen: Screen) => void;
  transitionToStart: () => void;
  setInitialInteractionDone: () => void;
  setGameMode: (mode: GameMode) => void;
  setMyName: (name: string) => void;
  selectCharacter: (charId: string) => void;
  setSpDifficulty: (d: Difficulty) => void;
  setSpArenaIndex: (i: number) => void;
  setPreferredArena: (arenaId: string) => void;
  setLobbyCountdown: (n: number | null) => void;
  setCharacters: (chars: Character[]) => void;
  setSelfDamagePredicted: () => void;
  selectCell: (row: number, col: number) => void;
  setLocalCellValue: (row: number, col: number, value: number | null) => void;
  setLocalCellDanger: (row: number, col: number) => void;
  clearWipedCells: (targetSeat: 0 | 1, cells: Array<{ row: number; col: number }>) => void;
  addWipingCells: (cells: WipingCell[]) => void;
  removeWipingCells: (cells: WipingCell[]) => void;
  resetForNextRound: () => void;
  resetForRematch: () => void;
  resetAll: () => void;
  setMusicEnabled: (enabled: boolean) => void;
  setSfxEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setSelectedTrackIndex: (index: number) => void;
  setSettingsOpen: (open: boolean) => void;
  setScoreboardOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  clearAttackFlash: () => void;
  removeFloatingPoints: (id: number) => void;
  setIsPaused: (v: boolean) => void;
  setCampaignFightIndex: (i: number) => void;
  setCampaignResult: (r: 'gameover' | 'victory' | 'continue' | null) => void;
  setCreditsActive: (v: boolean) => void;
  setCampaignDialogueQueue: (q: DialogueEntry[]) => void;
  addUnlockedCharacters: (ids: string[]) => void;
  setPendingUnlockIds: (ids: string[]) => void;
  incrementCampaignClearCount: () => void;
  applyServerMessage: (msg: ServerMessage) => void;
}

let _nonce = 0;
let _fpId = 0;

function isHeavyAttack(type: AttackType) {
  return type === 'kick' || type === 'row_special' || type === 'column_special' || type === 'subgrid_special';
}

export const useGameStore = create<GameStore>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  currentScreen: getInitialScreen(),
  prevScreen: null,
  startEntering: false,
  gameMode: null,
  initialInteractionDone: false,

  wsConnected: false,

  myPlayerId: null,
  mySeat: null,
  myCharacter: null,
  myName: null,
  myUseAlt: false,

  opponentName: null,
  opponentCharacter: null,
  opponentUseAlt: false,

  shareCode: null,
  friendCreating: false,
  preferredArenaId: null,
  lobbyOpponentReady: false,
  lobbyJoinError: null,
  lobbyCountdown: null,

  spDifficulty: 'normal',
  spArenaIndex: 0,

  roundNumber: 1,
  roundWins: [0, 0],
  myPuzzle: null,
  mySolution: null,
  myGrid: null,
  opponentGivens: null,
  opponentGrid: null,
  selectedCell: null,
  opponentCursorPos: null,

  health: [STARTING_HEALTH, STARTING_HEALTH],
  combo: [0, 0],
  score: [0, 0],
  scoreOffset: [0, 0],
  scoreFightOffset: [0, 0],
  counterWindowActive: false,
  counterWindowExpiry: null,
  counterWindowDefenderSeat: null,
  counterLandedNonce: 0,
  selfDamagePredicted: false,

  roundOver: false,
  roundWinnerSeat: null,
  matchOver: false,
  matchWinnerSeat: null,
  matchWinnerName: null,
  opponentDisconnected: false,
  rematchPending: false,
  rematchOffered: false,
  rematchCancelled: false,
  backgroundId: null,
  fightStartTime: null,

  p1AnimSignal: null,
  p2AnimSignal: null,
  p1MistakeSignal: null,
  p2MistakeSignal: null,
  attackFlashType: null,
  floatingPoints: [],
  wipingCells: [],
  lastCorrectCell: null,
  preRoundSignal: null,

  characters: [],

  campaignFightIndex: 0,
  campaignResult: null,
  campaignDialogueQueue: [],
  unlockedCharacterIds: [...BASE_UNLOCKED],
  pendingUnlockIds: [],
  campaignClearCount: 0,
  creditsActive: false,
  campaignFinalScore: null,
  campaignFinalRank: null,

  isFlawlessVictory: false,
  rawMatchScore: 0,
  finalMatchScore: 0,
  campaignTotalScore: 0,

  isPaused: false,
  totalPausedMs: 0,
  pauseStartTime: null,

  musicEnabled: true,
  sfxEnabled: true,
  hapticsEnabled: true,
  selectedTrackIndex: SELECT_TRACK_INDEX,
  settingsOpen: false,
  scoreboardOpen: false,
  aboutOpen: false,
  testCreditsOpen: false,

  // ── Simple setters ────────────────────────────────────────────────────────
  setScreen: (screen) => set(s => ({ prevScreen: s.currentScreen, currentScreen: screen })),
  transitionToStart: () => {
    set({ currentScreen: 'start', startEntering: true });
    setTimeout(() => set({ startEntering: false }), 2000);
  },
  setInitialInteractionDone: () => set({ initialInteractionDone: true }),
  setGameMode: (gameMode) => set({ gameMode }),
  setMyName: (myName) => set({ myName }),
  selectCharacter: (myCharacter) => set({ myCharacter }),
  setSpDifficulty: (spDifficulty) => set({ spDifficulty }),
  setSpArenaIndex: (spArenaIndex) => set({ spArenaIndex }),
  setPreferredArena: (preferredArenaId) => set({ preferredArenaId }),
  setLobbyCountdown: (lobbyCountdown) => set({ lobbyCountdown }),
  setCharacters: (characters) => set({ characters }),
  setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
  setSfxEnabled: (sfxEnabled) => set({ sfxEnabled }),
  setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
  setSelectedTrackIndex: (selectedTrackIndex) => set({ selectedTrackIndex }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setScoreboardOpen: (scoreboardOpen) => set({ scoreboardOpen }),
  setAboutOpen: (aboutOpen) => set({ aboutOpen }),
  clearAttackFlash: () => set({ attackFlashType: null }),
  removeFloatingPoints: (id) => set(s => ({ floatingPoints: s.floatingPoints.filter(fp => fp.id !== id) })),
  setIsPaused: (isPaused) => {
    if (isPaused) {
      set({ isPaused: true, pauseStartTime: Date.now() });
      pauseMusic();
    } else {
      const s = get();
      const extra = s.pauseStartTime != null ? Date.now() - s.pauseStartTime : 0;
      // Shift counter window expiry forward by the pause duration so the bar
      // resumes from exactly where it froze rather than appearing expired.
      const counterWindowExpiry = s.counterWindowExpiry != null ? s.counterWindowExpiry + extra : null;
      set({ isPaused: false, pauseStartTime: null, totalPausedMs: s.totalPausedMs + extra, counterWindowExpiry });
      resumeMusic();
    }
  },
  setCampaignFightIndex: (campaignFightIndex) => set({ campaignFightIndex }),
  setCampaignResult: (campaignResult) => set({ campaignResult }),
  setCreditsActive: (creditsActive) => set({ creditsActive }),
  setCampaignDialogueQueue: (campaignDialogueQueue) => set({ campaignDialogueQueue }),
  addUnlockedCharacters: (ids) => set(s => ({ unlockedCharacterIds: [...new Set([...s.unlockedCharacterIds, ...ids])] })),
  setPendingUnlockIds: (pendingUnlockIds) => set({ pendingUnlockIds }),
  incrementCampaignClearCount: () => set(s => ({ campaignClearCount: s.campaignClearCount + 1 })),

  addWipingCells: (cells) => set(s => ({ wipingCells: [...s.wipingCells, ...cells] })),
  removeWipingCells: (cells) => set(s => {
    const keys = new Set(cells.map(c => `${c.targetSeat}-${c.row}-${c.col}`));
    return { wipingCells: s.wipingCells.filter(c => !keys.has(`${c.targetSeat}-${c.row}-${c.col}`)) };
  }),

  setSelfDamagePredicted: () => {
    set({ selfDamagePredicted: true });
  },

  selectCell: (row, col) => set({ selectedCell: { row, col } }),

  setLocalCellValue: (row, col, value) => set(s => {
    if (!s.myGrid) return {};
    const myGrid = s.myGrid.map(r => [...r]);
    myGrid[row][col] = value;
    return { myGrid };
  }),

  setLocalCellDanger: (row, col) => set(s => {
    if (!s.myGrid) return {};
    // Keep the value but mark it via the danger class — value stays in grid
    // The UI reads danger from myGrid value !== solution
    return {};
  }),

  clearWipedCells: (targetSeat, cells) => set(s => {
    const mySeat = s.mySeat;
    if (targetSeat === mySeat) {
      if (!s.myGrid || !s.myPuzzle) return {};
      const myGrid = s.myGrid.map(r => [...r]);
      const myPuzzle = s.myPuzzle.map(r => [...r]);
      for (const { row, col } of cells) {
        myGrid[row][col] = null;
        myPuzzle[row][col] = null; // marks as wiped (no longer a given)
      }
      return { myGrid, myPuzzle };
    } else {
      if (!s.opponentGrid) return {};
      const opponentGrid = s.opponentGrid.map(r => [...r]);
      for (const { row, col } of cells) {
        opponentGrid[row][col] = null;
      }
      return { opponentGrid };
    }
  }),

  resetForNextRound: () => set(s => ({
    myPuzzle: null, mySolution: null, myGrid: null,
    opponentGivens: null, opponentGrid: null,
    selectedCell: null, opponentCursorPos: null,
    health: [STARTING_HEALTH, STARTING_HEALTH],
    combo: [0, 0], score: [0, 0], scoreOffset: [0, 0],
    counterWindowActive: false, counterWindowExpiry: null, counterWindowDefenderSeat: null,
    selfDamagePredicted: false,
    roundOver: false, roundWinnerSeat: null, p1AnimSignal: null, p2AnimSignal: null,
    attackFlashType: null, floatingPoints: [],
    wipingCells: [], lastCorrectCell: null, preRoundSignal: null,
    totalPausedMs: 0, pauseStartTime: null,
  })),

  resetForRematch: () => set(() => ({
    matchOver: false,
    matchWinnerSeat: null,
    matchWinnerName: null,
    roundWins: [0, 0],
    roundNumber: 1,
    roundOver: false,
    roundWinnerSeat: null,
    rematchPending: false,
    rematchOffered: false,
    rematchCancelled: false,
    opponentDisconnected: false,
    isFlawlessVictory: false,
    rawMatchScore: 0,
    finalMatchScore: 0,
    score: [0, 0],
    scoreOffset: [0, 0],
    scoreFightOffset: [0, 0],
  })),

  resetAll: () => set(s => ({
    currentScreen: 'start',
    gameMode: null,
    myPlayerId: null, mySeat: null, myCharacter: null, myName: null, myUseAlt: false,
    opponentName: null, opponentCharacter: null, opponentUseAlt: false,
    shareCode: null, friendCreating: false, preferredArenaId: null,
    lobbyOpponentReady: false, lobbyJoinError: null, lobbyCountdown: null,
    roundNumber: 1, roundWins: [0, 0],
    myPuzzle: null, mySolution: null, myGrid: null,
    opponentGivens: null, opponentGrid: null,
    selectedCell: null, opponentCursorPos: null,
    health: [STARTING_HEALTH, STARTING_HEALTH],
    combo: [0, 0], score: [0, 0], scoreOffset: [0, 0], scoreFightOffset: [0, 0],
    counterWindowActive: false, counterWindowExpiry: null, counterWindowDefenderSeat: null,
    selfDamagePredicted: false,
    roundOver: false, roundWinnerSeat: null, matchOver: false, matchWinnerSeat: null, matchWinnerName: null,
    opponentDisconnected: false, rematchPending: false, rematchOffered: false, rematchCancelled: false,
    backgroundId: null, fightStartTime: null,
    p1AnimSignal: null, p2AnimSignal: null, p1MistakeSignal: null, p2MistakeSignal: null,
    attackFlashType: null, floatingPoints: [],
    wipingCells: [], lastCorrectCell: null, preRoundSignal: null,
    settingsOpen: false,
    aboutOpen: false,
    isPaused: false,
    totalPausedMs: 0,
    pauseStartTime: null,
    campaignFightIndex: 0,
    campaignResult: null,
    campaignDialogueQueue: [],
    pendingUnlockIds: [],
    campaignFinalScore: null,
    campaignFinalRank: null,
    isFlawlessVictory: false,
    rawMatchScore: 0,
    finalMatchScore: 0,
    campaignTotalScore: 0,
    // unlockedCharacterIds and campaignClearCount persist across resets
  })),

  // ── Central server event handler ──────────────────────────────────────────
  applyServerMessage: (msg: ServerMessage) => {
    const s = get();
    switch (msg.type) {

      case 'connected':
        set({ myPlayerId: msg.payload.playerId });
        break;

      case 'waiting_for_opponent':
        set({ shareCode: msg.payload.shareCode });
        break;

      case 'room_created':
        // Creator is always seat 0; player_joined only arrives when opponent joins
        set({ shareCode: msg.payload.shareCode, mySeat: 0 });
        break;

      case 'room_not_found':
        set({ lobbyJoinError: 'Room not found. Check the code and try again.' });
        break;

      case 'room_full':
        set({ lobbyJoinError: 'That room is already full.' });
        break;

      case 'player_joined':
        set({
          myPlayerId: msg.payload.playerId,
          mySeat: msg.payload.seat,
          myCharacter: msg.payload.characterId,
          myUseAlt: msg.payload.useAlt,
          shareCode: msg.payload.shareCode ?? get().shareCode,
          currentScreen: 'lobby',
        });
        break;

      case 'opponent_joined':
        set({
          opponentName: msg.payload.name,
          opponentCharacter: msg.payload.characterId,
          opponentUseAlt: msg.payload.useAlt,
          lobbyOpponentReady: true,
        });
        break;

      case 'opponent_left_lobby':
        set({ opponentName: null, opponentCharacter: null, lobbyOpponentReady: false });
        break;

      case 'game_start': {
        const p = msg.payload;
        // DEBUG — remove after diagnosis
        console.log('[DEBUG game_start] fightStartTime:', (p as any).fightStartTime, '| roundStartTime (legacy):', (p as any).roundStartTime, '| Date.now():', Date.now(), '| diff ms:', (p as any).fightStartTime != null ? (p as any).fightStartTime - Date.now() : 'FIELD MISSING');
        const myGrid = p.puzzle.map(r => r.map(v => v));
        const isMultiplayer = s.gameMode === 'quick' || s.gameMode === 'friend';
        set({
          roundNumber: p.roundNumber,
          mySeat: p.mySeat,
          myUseAlt: p.myUseAlt,
          opponentName: p.opponentName,
          opponentCharacter: p.opponentCharacter,
          opponentUseAlt: p.opponentUseAlt,
          mySolution: p.solution,
          myPuzzle: p.puzzle.map(r => [...r]),
          myGrid,
          opponentGivens: p.opponentGivens.map(r => [...r]),
          opponentGrid: p.opponentGivens.map(r => [...r]),
          health: [STARTING_HEALTH, STARTING_HEALTH],
          combo: [0, 0],
          score: (p.roundNumber === 1 && s.gameMode !== 'campaign') ? [0, 0] : s.score,
          scoreOffset: (p.roundNumber === 1 && s.gameMode !== 'campaign') ? [0, 0] : s.score,
          scoreFightOffset: p.roundNumber === 1 ? (s.gameMode === 'campaign' ? s.score : [0, 0] as [number, number]) : s.scoreFightOffset,
          counterWindowActive: false, counterWindowExpiry: null, counterWindowDefenderSeat: null,
          selfDamagePredicted: false,
          roundOver: false,
          matchOver: false,
          matchWinnerSeat: null,
          matchWinnerName: null,
          backgroundId: p.backgroundId,
          fightStartTime: p.fightStartTime,
          selectedCell: null, opponentCursorPos: null,
          p1AnimSignal: null, p2AnimSignal: null, p1MistakeSignal: null, p2MistakeSignal: null, attackFlashType: null,
          floatingPoints: [],
          lastCorrectCell: null,
          // Multiplayer: stay on lobby screen for the countdown; gameplay transition
          // happens in LobbyScreen after lobbyCountdown ticks to 0.
          // Single-player / VS-AI: switch immediately (useVsAI dispatches game_start
          // only after currentScreen is already 'gameplay').
          currentScreen: isMultiplayer ? s.currentScreen : 'gameplay',
          lobbyCountdown: isMultiplayer ? 3 : null,
          preRoundSignal: isMultiplayer
            ? null
            : { roundNumber: p.roundNumber, backgroundId: p.backgroundId, nonce: ++_nonce },
          isPaused: false,
          totalPausedMs: 0,
          pauseStartTime: null,
          campaignResult: null,
          // Reset per-match scoring fields for each new fight; also reset
          // campaignTotalScore at the very start of a fresh campaign run.
          isFlawlessVictory: false,
          rawMatchScore: 0,
          finalMatchScore: 0,
          ...(p.roundNumber === 1 && s.gameMode === 'campaign' && s.campaignFightIndex === 0
            ? { campaignTotalScore: 0 }
            : {}),
        });
        break;
      }

      case 'cell_update': {
        const { seat, row, col, value, isCorrect } = msg.payload;
        if (seat !== s.mySeat) {
          // Opponent filled a cell
          set(st => {
            if (!st.opponentGrid) return {};
            const opponentGrid = st.opponentGrid.map(r => [...r]);
            opponentGrid[row][col] = isCorrect ? value : null;
            return { opponentGrid };
          });
        } else if (isCorrect) {
          // Own correct cell — emit signal for completion ripple animation
          set({ lastCorrectCell: { row, col, nonce: ++_nonce } });
        }
        break;
      }

      case 'cursor_update':
        if (msg.payload.seat !== s.mySeat) {
          set({ opponentCursorPos: { row: msg.payload.row, col: msg.payload.col } });
        }
        break;

      case 'attack_incoming': {
        const { attackerSeat, delayMs } = msg.payload;
        set({
          counterWindowActive: true,
          counterWindowExpiry: Date.now() + delayMs,
          counterWindowDefenderSeat: (1 - attackerSeat) as 0 | 1,
        });
        break;
      }

      case 'counter_window_active': {
        const { defenderSeat, expiresAt } = msg.payload;
        set({
          counterWindowActive: true,
          counterWindowExpiry: expiresAt,
          counterWindowDefenderSeat: defenderSeat,
        });
        break;
      }

      case 'auto_counter':
        set({ counterWindowActive: false, counterWindowExpiry: null, counterWindowDefenderSeat: null });
        break;

      case 'attack_landed': {
        const { attackerSeat, defenderSeat, type } = msg.payload;
        const heavy = isHeavyAttack(type);
        const flashType = heavy ? 'heavy' : 'punch';
        playAttackSFX(type);
        // Anim signals
        const nonce = ++_nonce;
        const attackerKey = attackerSeat === 0 ? 'p1AnimSignal' : 'p2AnimSignal';
        const defenderKey = defenderSeat === 0 ? 'p1AnimSignal' : 'p2AnimSignal';
        set({
          [attackerKey]: { state: type, nonce },
          [defenderKey]: { state: heavy ? 'damage_heavy' : 'damage_light', nonce: nonce + 1 },
          attackFlashType: flashType,
          counterWindowActive: false,
          counterWindowExpiry: null,
          counterWindowDefenderSeat: null,
        });
        break;
      }

      case 'counter_landed': {
        const { counterSeat, attackType } = msg.payload;
        const nonce = ++_nonce;
        // counterSeat is the defender who countered; attackerKey is the original attacker
        const counterKey = counterSeat === 0 ? 'p1AnimSignal' : 'p2AnimSignal';
        const attackerKey = counterSeat === 0 ? 'p2AnimSignal' : 'p1AnimSignal';
        playAttackSFX(attackType);
        // Phase 1: original attacker plays their attack animation
        set(st => ({
          [attackerKey]: { state: attackType, nonce },
          counterWindowActive: false,
          counterWindowExpiry: null,
          counterWindowDefenderSeat: null,
          counterLandedNonce: st.counterLandedNonce + 1,
        }));
        // Phase 2: counter-er's punch starts 2 frames into the original attack
        const counterDelay = ANIMATION_CONFIG[attackType].frameDuration * 2;
        setTimeout(() => {
          const nonce2 = ++_nonce;
          set({
            [counterKey]: { state: 'punch', nonce: nonce2 },
            [attackerKey]: { state: 'damage_light', nonce: nonce2 + 1 },
          });
        }, counterDelay);
        break;
      }

      case 'health_update': {
        // Delayed to sync with damage animation frame
        const { health } = msg.payload;
        const delay = (() => {
          // Find most recently set anim signal type to determine delay
          const st = get();
          const lastAnim = st.p1AnimSignal?.state ?? st.p2AnimSignal?.state;
          if (!lastAnim) return HEALTH_UPDATE_DELAY_LIGHT;
          return isHeavyAttack(lastAnim as AttackType) ? HEALTH_UPDATE_DELAY_HEAVY : HEALTH_UPDATE_DELAY_LIGHT;
        })();
        setTimeout(() => {
          set({ health: health as [number, number] });
        }, delay);
        break;
      }

      case 'combo_update': {
        const { seat, combo } = msg.payload;
        set(st => {
          const c: [number, number] = [...st.combo] as [number, number];
          c[seat] = combo;
          return { combo: c };
        });
        break;
      }

      case 'score_update': {
        const { seat, score } = msg.payload;
        const st0 = get();
        const isVsAI = st0.gameMode === 'campaign' || st0.gameMode === 'practice';
        const multiplier = isVsAI
          ? (CAMPAIGN_SCORE_MULTIPLIERS[st0.spDifficulty ?? 'normal'] ?? 1.0)
          : 1.0;
        const cumulative = st0.scoreOffset[seat] + Math.round(score * multiplier);
        const delta = cumulative - st0.score[seat];
        const lastCell = st0.lastCorrectCell;
        set(st => {
          const sc: [number, number] = [...st.score] as [number, number];
          sc[seat] = cumulative;
          const fp: FloatingPointsEvent[] = [...st.floatingPoints];
          if (delta > 0) fp.push({
            id: ++_fpId,
            seat: seat as 0 | 1,
            points: delta,
            row: lastCell?.row,
            col: lastCell?.col,
          });
          return { score: sc, floatingPoints: fp };
        });
        break;
      }

      case 'self_damage': {
        const { seat } = msg.payload;
        const animKey    = seat === 0 ? 'p1AnimSignal'    : 'p2AnimSignal';
        const mistakeKey = seat === 0 ? 'p1MistakeSignal' : 'p2MistakeSignal';
        if (seat === s.mySeat) {
          if (s.selfDamagePredicted) {
            // Already played animation optimistically
            set({ selfDamagePredicted: false });
          } else {
            const nonce = ++_nonce;
            set({ [animKey]: { state: 'damage_light', nonce }, attackFlashType: 'self' });
          }
        } else {
          // Opponent made a mistake — play their damage flinch + error sprite
          const nonce = ++_nonce;
          set({ [animKey]: { state: 'damage_light', nonce }, [mistakeKey]: { nonce } });
        }
        break;
      }

      case 'row_wiped': {
        const { targetSeat, row } = msg.payload;
        const wipeCells: WipingCell[] = Array.from({ length: 9 }, (_, col) => ({ targetSeat: targetSeat as 0|1, row, col }));
        get().addWipingCells(wipeCells);
        setTimeout(() => {
          get().clearWipedCells(targetSeat as 0|1, wipeCells);
          get().removeWipingCells(wipeCells);
        }, 400);
        break;
      }

      case 'column_wiped': {
        const { targetSeat, col } = msg.payload;
        const wipeCells: WipingCell[] = Array.from({ length: 9 }, (_, row) => ({ targetSeat: targetSeat as 0|1, row, col }));
        get().addWipingCells(wipeCells);
        setTimeout(() => {
          get().clearWipedCells(targetSeat as 0|1, wipeCells);
          get().removeWipingCells(wipeCells);
        }, 400);
        break;
      }

      case 'box_wiped': {
        const { targetSeat, boxRow, boxCol } = msg.payload;
        const wipeCells: WipingCell[] = [];
        for (let r = boxRow; r < boxRow + 3; r++)
          for (let c = boxCol; c < boxCol + 3; c++)
            wipeCells.push({ targetSeat: targetSeat as 0|1, row: r, col: c });
        get().addWipingCells(wipeCells);
        setTimeout(() => {
          get().clearWipedCells(targetSeat as 0|1, wipeCells);
          get().removeWipingCells(wipeCells);
        }, 400);
        break;
      }

      case 'puzzle_complete':
        break;

      case 'time_up':
        break;

      case 'round_end': {
        const { winnerSeat, roundWins } = msg.payload;
        set({
          roundWins: roundWins as [number, number],
          roundWinnerSeat: winnerSeat,
          roundOver: true,
          counterWindowActive: false, counterWindowExpiry: null, counterWindowDefenderSeat: null,
        });
        if (winnerSeat !== -1) {
          // Delay anim signals past the health_update setTimeout (max 300ms) so
          // health is already updated when we check for a true KO.
          setTimeout(() => {
            const nonce = ++_nonce;
            const loserSeat = (1 - winnerSeat) as 0 | 1;
            const winnerKey = winnerSeat === 0 ? 'p1AnimSignal' : 'p2AnimSignal';
            const loserKey  = loserSeat  === 0 ? 'p1AnimSignal' : 'p2AnimSignal';
            const isTrueKO = get().health[loserSeat] <= 0;
            set({
              [winnerKey]: { state: 'win', nonce },
              [loserKey]:  { state: isTrueKO ? 'ko' : 'idle', nonce: nonce + 1 },
            });
          }, HEALTH_UPDATE_DELAY_HEAVY + 50);
        }
        break;
      }

      case 'match_end': {
        const st = get();
        const mySeat = st.mySeat ?? 0;
        const oppSeat = (1 - mySeat) as 0 | 1;
        const iWon = msg.payload.winnerSeat === mySeat;
        const isFlawless = iWon
          && st.roundWins[mySeat] === 2
          && st.roundWins[oppSeat] === 0;
        const rawMatch = st.score[mySeat] - st.scoreFightOffset[mySeat];
        const finalMatch = isFlawless ? rawMatch * 2 : rawMatch;
        set({
          matchOver: true,
          matchWinnerSeat: msg.payload.winnerSeat,
          matchWinnerName: msg.payload.winnerName,
          isFlawlessVictory: isFlawless,
          rawMatchScore: rawMatch,
          finalMatchScore: finalMatch,
          counterWindowActive: false, counterWindowExpiry: null, counterWindowDefenderSeat: null,
        });
        break;
      }

      case 'opponent_disconnected':
        set({ opponentDisconnected: true });
        break;

      case 'rematch_offered':
        set({ rematchOffered: true });
        break;

      case 'rematch_start':
        get().resetForRematch();
        break;

      case 'rematch_cancelled':
        set({ rematchPending: false, rematchOffered: false, rematchCancelled: true });
        break;

      default:
        break;
    }
  },
}));
