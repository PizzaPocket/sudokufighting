import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { getArena } from '@sudoku-fighting/shared';
import { send } from '../hooks/useGameSocket';
import { useVsAI } from '../ai/useVsAI';
import HUD from '../components/hud/HUD';
import FightStage from '../components/character/FightStage';
import SudokuGrid from '../components/grid/SudokuGrid';
import MobileNumpad from '../components/grid/MobileNumpad';
import AttackFlash from '../components/overlays/AttackFlash';
import FloatingPoints from '../components/overlays/FloatingPoints';
import GameOverlay from '../components/overlays/GameOverlay';
import ArenaBackground from '../components/arena/ArenaBackground';
import Birds from '../components/arena/Birds';
import Clouds from '../components/arena/Clouds';
export default function GameplayScreen({ active }) {
    const mySeat = useGameStore(s => s.mySeat);
    const backgroundId = useGameStore(s => s.backgroundId);
    const matchOver = useGameStore(s => s.matchOver);
    const gameMode = useGameStore(s => s.gameMode);
    const screenRef = useRef(null);
    useVsAI();
    const arena = backgroundId ? getArena(backgroundId) : null;
    const isParadiso = arena?.id === 'bg_2';
    // p1 grid = seat 0, p2 grid = seat 1 (always)
    const p1GridId = 'p1-grid';
    const p2GridId = 'p2-grid';
    const p1PanelClass = `player-panel${mySeat === 0 ? ' is-me' : ''}`;
    const p2PanelClass = `player-panel${mySeat === 1 ? ' is-me' : ''}`;
    const bgStyle = arena?.background
        ? { backgroundImage: `url(${arena.background})` }
        : undefined;
    if (!active)
        return null;
    return (_jsxs("div", { id: "screen-gameplay", ref: screenRef, className: "screen active", style: bgStyle, children: [_jsx(ArenaBackground, {}), isParadiso && _jsx(Birds, { containerRef: screenRef }), isParadiso && _jsx(Clouds, { containerRef: screenRef }), _jsx("div", { className: "action-bar", children: !matchOver && (_jsx("button", { id: "btn-surrender", className: "btn btn-secondary", onClick: () => {
                        if (gameMode === 'singleplayer') {
                            const { mySeat: seat } = useGameStore.getState();
                            const aiSeat = (1 - (seat ?? 0));
                            useGameStore.getState().applyServerMessage({
                                type: 'match_end',
                                payload: {
                                    winnerSeat: aiSeat,
                                    winnerName: useGameStore.getState().opponentName ?? 'CPU',
                                },
                            });
                        }
                        else {
                            send('surrender', {});
                        }
                    }, children: "SURRENDER" })) }), _jsx(HUD, {}), _jsxs("div", { id: "arena", children: [_jsx("div", { id: "p1-panel", className: p1PanelClass, children: _jsx(SudokuGrid, { gridSeat: 0, id: p1GridId }) }), _jsx(FightStage, {}), _jsx("div", { id: "p2-panel", className: p2PanelClass, children: _jsx(SudokuGrid, { gridSeat: 1, id: p2GridId }) })] }), _jsx(MobileNumpad, {}), _jsx(AttackFlash, {}), _jsx(FloatingPoints, {}), _jsx(GameOverlay, {})] }));
}
