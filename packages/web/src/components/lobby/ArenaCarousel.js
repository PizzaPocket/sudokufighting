import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ARENAS } from '@sudoku-fighting/shared';
import { send } from '../../hooks/useGameSocket';
export default function ArenaCarousel({ arenaIndex, onIndexChange, sendToServer }) {
    const arena = ARENAS[arenaIndex % ARENAS.length];
    function prev() {
        const next = ((arenaIndex - 1) + ARENAS.length) % ARENAS.length;
        onIndexChange(next);
        if (sendToServer)
            send('set_arena_preference', { arenaId: ARENAS[next].id });
    }
    function next() {
        const n = (arenaIndex + 1) % ARENAS.length;
        onIndexChange(n);
        if (sendToServer)
            send('set_arena_preference', { arenaId: ARENAS[n].id });
    }
    return (_jsxs("div", { className: "lobby-arena-picker", children: [_jsx("span", { className: "settings-label", style: { color: '#ffffff' }, children: "ARENA" }), _jsxs("div", { className: "track-carousel", children: [_jsx("button", { className: "btn-utility carousel-btn", onClick: prev, children: "\u2039" }), _jsx("span", { className: "track-title", children: arena.name }), _jsx("button", { className: "btn-utility carousel-btn", onClick: next, children: "\u203A" })] })] }));
}
