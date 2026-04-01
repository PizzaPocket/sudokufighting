import { create } from 'zustand';
import { STARTING_HEALTH, HEALTH_UPDATE_DELAY_LIGHT, HEALTH_UPDATE_DELAY_HEAVY } from '@sudoku-fighting/shared';
import { playAttackSFX } from '../audio/audioManager';
let _nonce = 0;
let _fpId = 0;
function isHeavyAttack(type) {
    return type === 'kick' || type === 'row_special' || type === 'column_special' || type === 'subgrid_special';
}
export const useGameStore = create((set, get) => ({
    // ── Initial state ──────────────────────────────────────────────────────────
    currentScreen: 'start',
    gameMode: null,
    initialInteractionDone: false,
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
    spDifficulty: 'medium',
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
    counterWindowActive: false,
    selfDamagePredicted: false,
    roundOver: false,
    roundWinnerSeat: null,
    matchOver: false,
    matchWinnerSeat: null,
    matchWinnerName: null,
    opponentDisconnected: false,
    backgroundId: null,
    roundStartTime: null,
    p1AnimSignal: null,
    p2AnimSignal: null,
    attackFlashType: null,
    floatingPoints: [],
    wipingCells: [],
    lastCorrectCell: null,
    preRoundSignal: null,
    characters: [],
    musicEnabled: true,
    sfxEnabled: true,
    selectedTrackIndex: 0,
    settingsOpen: false,
    // ── Simple setters ────────────────────────────────────────────────────────
    setScreen: (currentScreen) => set({ currentScreen }),
    setInitialInteractionDone: () => set({ initialInteractionDone: true }),
    setGameMode: (gameMode) => set({ gameMode }),
    setMyName: (myName) => set({ myName }),
    selectCharacter: (myCharacter) => set({ myCharacter }),
    setSpDifficulty: (spDifficulty) => set({ spDifficulty }),
    setSpArenaIndex: (spArenaIndex) => set({ spArenaIndex }),
    setPreferredArena: (preferredArenaId) => set({ preferredArenaId }),
    setCharacters: (characters) => set({ characters }),
    setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
    setSfxEnabled: (sfxEnabled) => set({ sfxEnabled }),
    setSelectedTrackIndex: (selectedTrackIndex) => set({ selectedTrackIndex }),
    setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
    clearAttackFlash: () => set({ attackFlashType: null }),
    removeFloatingPoints: (id) => set(s => ({ floatingPoints: s.floatingPoints.filter(fp => fp.id !== id) })),
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
        if (!s.myGrid)
            return {};
        const myGrid = s.myGrid.map(r => [...r]);
        myGrid[row][col] = value;
        return { myGrid };
    }),
    setLocalCellDanger: (row, col) => set(s => {
        if (!s.myGrid)
            return {};
        // Keep the value but mark it via the danger class — value stays in grid
        // The UI reads danger from myGrid value !== solution
        return {};
    }),
    clearWipedCells: (targetSeat, cells) => set(s => {
        const mySeat = s.mySeat;
        if (targetSeat === mySeat) {
            if (!s.myGrid || !s.myPuzzle)
                return {};
            const myGrid = s.myGrid.map(r => [...r]);
            const myPuzzle = s.myPuzzle.map(r => [...r]);
            for (const { row, col } of cells) {
                myGrid[row][col] = null;
                myPuzzle[row][col] = null; // marks as wiped (no longer a given)
            }
            return { myGrid, myPuzzle };
        }
        else {
            if (!s.opponentGrid)
                return {};
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
        combo: [0, 0], score: [0, 0],
        counterWindowActive: false, selfDamagePredicted: false,
        roundOver: false, roundWinnerSeat: null, p1AnimSignal: null, p2AnimSignal: null,
        attackFlashType: null, floatingPoints: [],
        wipingCells: [], lastCorrectCell: null, preRoundSignal: null,
    })),
    resetAll: () => set({
        currentScreen: 'start',
        gameMode: null,
        myPlayerId: null, mySeat: null, myCharacter: null, myName: null, myUseAlt: false,
        opponentName: null, opponentCharacter: null, opponentUseAlt: false,
        shareCode: null, friendCreating: false, preferredArenaId: null,
        lobbyOpponentReady: false, lobbyJoinError: null,
        roundNumber: 1, roundWins: [0, 0],
        myPuzzle: null, mySolution: null, myGrid: null,
        opponentGivens: null, opponentGrid: null,
        selectedCell: null, opponentCursorPos: null,
        health: [STARTING_HEALTH, STARTING_HEALTH],
        combo: [0, 0], score: [0, 0],
        counterWindowActive: false, selfDamagePredicted: false,
        roundOver: false, roundWinnerSeat: null, matchOver: false, matchWinnerSeat: null, matchWinnerName: null,
        opponentDisconnected: false, backgroundId: null, roundStartTime: null,
        p1AnimSignal: null, p2AnimSignal: null, attackFlashType: null, floatingPoints: [],
        wipingCells: [], lastCorrectCell: null, preRoundSignal: null,
        settingsOpen: false,
    }),
    // ── Central server event handler ──────────────────────────────────────────
    applyServerMessage: (msg) => {
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
                const myGrid = p.puzzle.map(r => r.map(v => v));
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
                    combo: [0, 0], score: [0, 0],
                    counterWindowActive: false, selfDamagePredicted: false,
                    roundOver: false,
                    backgroundId: p.backgroundId,
                    roundStartTime: p.roundStartTime,
                    selectedCell: null, opponentCursorPos: null,
                    p1AnimSignal: null, p2AnimSignal: null, attackFlashType: null,
                    floatingPoints: [],
                    currentScreen: 'gameplay',
                    preRoundSignal: { roundNumber: p.roundNumber, backgroundId: p.backgroundId, nonce: ++_nonce },
                });
                break;
            }
            case 'cell_update': {
                const { seat, row, col, value, isCorrect } = msg.payload;
                if (seat !== s.mySeat) {
                    // Opponent filled a cell
                    set(st => {
                        if (!st.opponentGrid)
                            return {};
                        const opponentGrid = st.opponentGrid.map(r => [...r]);
                        opponentGrid[row][col] = isCorrect ? value : null;
                        return { opponentGrid };
                    });
                }
                else if (isCorrect) {
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
            case 'attack_incoming':
                set({ counterWindowActive: true });
                break;
            case 'counter_window_active':
                set({ counterWindowActive: true });
                break;
            case 'auto_counter':
                set({ counterWindowActive: false });
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
                });
                break;
            }
            case 'counter_landed': {
                const { counterSeat } = msg.payload;
                const nonce = ++_nonce;
                const counterKey = counterSeat === 0 ? 'p1AnimSignal' : 'p2AnimSignal';
                const attackerKey = counterSeat === 0 ? 'p2AnimSignal' : 'p1AnimSignal';
                set({
                    [counterKey]: { state: 'punch', nonce },
                    [attackerKey]: { state: 'damage_light', nonce: nonce + 1 },
                    counterWindowActive: false,
                });
                break;
            }
            case 'health_update': {
                // Delayed to sync with damage animation frame
                const { health } = msg.payload;
                const delay = (() => {
                    // Find most recently set anim signal type to determine delay
                    const st = get();
                    const lastAnim = st.p1AnimSignal?.state ?? st.p2AnimSignal?.state;
                    if (!lastAnim)
                        return HEALTH_UPDATE_DELAY_LIGHT;
                    return isHeavyAttack(lastAnim) ? HEALTH_UPDATE_DELAY_HEAVY : HEALTH_UPDATE_DELAY_LIGHT;
                })();
                setTimeout(() => {
                    set({ health: health });
                }, delay);
                break;
            }
            case 'combo_update': {
                const { seat, combo } = msg.payload;
                set(st => {
                    const c = [...st.combo];
                    c[seat] = combo;
                    return { combo: c };
                });
                break;
            }
            case 'score_update': {
                const { seat, score } = msg.payload;
                const prevScore = get().score[seat];
                const delta = score - prevScore;
                set(st => {
                    const sc = [...st.score];
                    sc[seat] = score;
                    const fp = [...st.floatingPoints];
                    if (delta > 0)
                        fp.push({ id: ++_fpId, seat: seat, points: delta });
                    return { score: sc, floatingPoints: fp };
                });
                break;
            }
            case 'self_damage': {
                const { seat } = msg.payload;
                if (seat === s.mySeat) {
                    if (s.selfDamagePredicted) {
                        // Already played animation optimistically
                        set({ selfDamagePredicted: false });
                    }
                    else {
                        const nonce = ++_nonce;
                        const key = seat === 0 ? 'p1AnimSignal' : 'p2AnimSignal';
                        set({ [key]: { state: 'damage_light', nonce }, attackFlashType: 'self' });
                    }
                }
                break;
            }
            case 'row_wiped': {
                const { targetSeat, row } = msg.payload;
                const wipeCells = Array.from({ length: 9 }, (_, col) => ({ targetSeat: targetSeat, row, col }));
                get().addWipingCells(wipeCells);
                setTimeout(() => {
                    get().clearWipedCells(targetSeat, wipeCells);
                    get().removeWipingCells(wipeCells);
                }, 400);
                break;
            }
            case 'column_wiped': {
                const { targetSeat, col } = msg.payload;
                const wipeCells = Array.from({ length: 9 }, (_, row) => ({ targetSeat: targetSeat, row, col }));
                get().addWipingCells(wipeCells);
                setTimeout(() => {
                    get().clearWipedCells(targetSeat, wipeCells);
                    get().removeWipingCells(wipeCells);
                }, 400);
                break;
            }
            case 'box_wiped': {
                const { targetSeat, boxRow, boxCol } = msg.payload;
                const wipeCells = [];
                for (let r = boxRow; r < boxRow + 3; r++)
                    for (let c = boxCol; c < boxCol + 3; c++)
                        wipeCells.push({ targetSeat: targetSeat, row: r, col: c });
                get().addWipingCells(wipeCells);
                setTimeout(() => {
                    get().clearWipedCells(targetSeat, wipeCells);
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
                const nonce = ++_nonce;
                const updates = {
                    roundWins: roundWins,
                    roundWinnerSeat: winnerSeat,
                    roundOver: true,
                };
                if (winnerSeat !== -1) {
                    const loserSeat = (1 - winnerSeat);
                    const winnerKey = winnerSeat === 0 ? 'p1AnimSignal' : 'p2AnimSignal';
                    const loserKey = loserSeat === 0 ? 'p1AnimSignal' : 'p2AnimSignal';
                    const isTrueKO = get().health[loserSeat] <= 0;
                    updates[winnerKey] = { state: 'win', nonce };
                    updates[loserKey] = { state: isTrueKO ? 'ko' : 'idle', nonce: nonce + 1 };
                }
                set(updates);
                break;
            }
            case 'match_end':
                set({
                    matchOver: true,
                    matchWinnerSeat: msg.payload.winnerSeat,
                    matchWinnerName: msg.payload.winnerName,
                });
                break;
            case 'opponent_disconnected':
                set({ opponentDisconnected: true });
                break;
            default:
                break;
        }
    },
}));
