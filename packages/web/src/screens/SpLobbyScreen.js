import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ARENAS } from '@sudoku-fighting/shared';
import ArenaCarousel from '../components/lobby/ArenaCarousel';
const DIFFICULTIES = ['easy', 'medium', 'hard'];
function pickAICharacter(myCharId, characters) {
    const others = characters.filter(c => c.id !== myCharId);
    const pool = others.length > 0 ? others : characters;
    if (pool.length === 0)
        return null;
    return pool[Math.floor(Math.random() * pool.length)];
}
export default function SpLobbyScreen({ active }) {
    const spDifficulty = useGameStore(s => s.spDifficulty);
    const setSpDifficulty = useGameStore(s => s.setSpDifficulty);
    const spArenaIndex = useGameStore(s => s.spArenaIndex);
    const setSpArenaIndex = useGameStore(s => s.setSpArenaIndex);
    const myCharacter = useGameStore(s => s.myCharacter);
    const myName = useGameStore(s => s.myName);
    const characters = useGameStore(s => s.characters);
    const myChar = characters.find(c => c.id === myCharacter) ?? null;
    // Read from store directly in the lazy initializer so first render is correct
    // (SpLobbyScreen is always mounted but hidden; characters are loaded before it activates)
    const [aiChar, setAiChar] = useState(() => {
        const st = useGameStore.getState();
        return pickAICharacter(st.myCharacter, st.characters);
    });
    const prevActiveRef = useRef(false);
    useEffect(() => {
        if (active && !prevActiveRef.current && characters.length > 0) {
            setAiChar(pickAICharacter(myCharacter, characters));
        }
        prevActiveRef.current = active;
    }, [active, myCharacter, characters]);
    function handleStart() {
        const arenaId = ARENAS[spArenaIndex % ARENAS.length].id;
        // Store opponent identity so useVsAI can read it when constructing game_start
        useGameStore.setState({
            opponentCharacter: aiChar?.id ?? 'fighter2',
            opponentName: aiChar?.name ?? 'CPU',
            backgroundId: arenaId,
            mySeat: 0,
        });
        // useVsAI (mounted in GameplayScreen) will generate puzzles and dispatch game_start
        useGameStore.setState({ currentScreen: 'gameplay' });
    }
    return (_jsxs("div", { id: "screen-sp-lobby", className: `screen${active ? ' active' : ''}`, children: [_jsx("h1", { className: "lobby-title", children: "VS AI" }), _jsxs("div", { className: "lobby-players", children: [_jsxs("div", { id: "sp-lobby-p1", className: "lobby-player is-me", children: [_jsx("span", { className: "lobby-player-label", children: "YOU" }), _jsx("img", { src: myChar?.portraitPath ?? '/characters/placeholder_fighter.svg', alt: "" }), _jsx("span", { children: myName ?? 'Player' })] }), _jsx("span", { className: "lobby-vs", children: "VS" }), _jsxs("div", { id: "sp-lobby-p2", className: "lobby-player", children: [_jsx("span", { className: "lobby-player-label", children: "AI" }), _jsx("img", { id: "sp-lobby-p2-portrait", src: aiChar?.portraitPath ?? '/characters/placeholder_fighter.svg', alt: aiChar?.name ?? 'CPU' }), _jsx("span", { children: aiChar?.name ?? 'CPU' })] })] }), _jsxs("div", { className: "sp-difficulty", children: [_jsx("span", { className: "sp-difficulty-label", children: "DIFFICULTY" }), _jsx("div", { className: "sp-difficulty-btns", children: DIFFICULTIES.map(d => (_jsx("button", { className: `btn btn-sm sp-diff-btn${spDifficulty === d ? ' selected' : ''}`, onClick: () => setSpDifficulty(d), children: d.toUpperCase() }, d))) })] }), _jsx(ArenaCarousel, { arenaIndex: spArenaIndex, onIndexChange: setSpArenaIndex, sendToServer: false }), _jsx("button", { id: "btn-sp-start", className: "btn btn-alt", onClick: handleStart, children: "START!" })] }));
}
