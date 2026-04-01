import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
export default function CharacterSelectScreen({ active }) {
    const characters = useGameStore(s => s.characters);
    const setCharacters = useGameStore(s => s.setCharacters);
    const selectCharacter = useGameStore(s => s.selectCharacter);
    const setScreen = useGameStore(s => s.setScreen);
    const gameMode = useGameStore(s => s.gameMode);
    const [selected, setSelected] = useState(null);
    const [cardsReady, setCardsReady] = useState(false);
    const screenRef = useRef(null);
    // Load characters once
    useEffect(() => {
        if (characters.length > 0)
            return;
        fetch(`/characters/characters.json?v=${Date.now()}`)
            .then(r => r.json())
            .then((chars) => setCharacters(chars))
            .catch(() => { });
    }, [characters.length, setCharacters]);
    // Trigger card-appear animation each time screen becomes active
    useEffect(() => {
        if (!active) {
            setCardsReady(false);
            return;
        }
        setSelected(null);
        const t = setTimeout(() => setCardsReady(true), 50);
        return () => clearTimeout(t);
    }, [active]);
    function handleSelectChar(char) {
        setSelected(char.id);
        selectCharacter(char.id);
        const nextScreen = gameMode === 'singleplayer' ? 'sp-lobby' : 'lobby';
        setScreen(nextScreen);
    }
    return (_jsx("div", { id: "screen-character-select", ref: screenRef, className: `screen${active ? ' active' : ''}${cardsReady ? ' cards-ready' : ''}`, children: _jsxs("div", { className: "char-select-scroll", children: [_jsx("p", { className: "subtitle", children: "Choose your fighter" }), _jsx("div", { id: "character-grid", children: characters.map((char, i) => (_jsxs("button", { className: `character-card card-intro${selected === char.id ? ' selected' : ''}`, style: { animationDelay: `${i * 60}ms` }, onClick: () => handleSelectChar(char), children: [_jsx("img", { src: char.portraitPath, alt: char.name, draggable: false }), _jsx("span", { className: "char-name", children: char.name })] }, char.id))) })] }) }));
}
