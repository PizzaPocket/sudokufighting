import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
export default function StartScreen({ active }) {
    const setScreen = useGameStore(s => s.setScreen);
    const setGameMode = useGameStore(s => s.setGameMode);
    const myName = useGameStore(s => s.myName);
    const setMyName = useGameStore(s => s.setMyName);
    const lobbyJoinError = useGameStore(s => s.lobbyJoinError);
    const setLobbyJoinError = (err) => useGameStore.setState({ lobbyJoinError: err });
    const joinCodeRef = useRef(null);
    const [localError, setLocalError] = useState(null);
    // Pre-fill room code from ?room=CODE URL param on first mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('room');
        if (code && joinCodeRef.current) {
            joinCodeRef.current.value = code.toUpperCase();
        }
    }, []);
    const errorMsg = localError ?? lobbyJoinError;
    function goToCharacterSelect(mode) {
        setGameMode(mode);
        useGameStore.setState({ lobbyJoinError: null });
        setLocalError(null);
        setScreen('character-select');
    }
    function handleJoinRoom() {
        const code = joinCodeRef.current?.value.trim().toUpperCase() ?? '';
        if (code.length < 4) {
            setLocalError('Enter a valid room code.');
            return;
        }
        setLocalError(null);
        useGameStore.setState({ lobbyJoinError: null, pendingJoinCode: code });
        goToCharacterSelect('friend');
    }
    return (_jsxs("div", { id: "screen-start", className: `screen${active ? ' active' : ''}`, children: [_jsxs("div", { className: "start-logo-container", children: [_jsx("img", { className: "start-logo-top", src: "/assets/ui/Logo1_Sudoku.svg", alt: "Sudoku" }), _jsx("img", { className: "start-logo-bottom", src: "/assets/ui/Logo2_Fighting.svg", alt: "Fighting" })] }), _jsxs("div", { className: "start-actions", children: [_jsxs("div", { className: "start-section", children: [_jsx("span", { className: "start-mode-label", children: "2 PLAYER" }), _jsx("button", { className: "btn", onClick: () => goToCharacterSelect('quick'), children: "QUICK PLAY" }), _jsx("button", { className: "btn btn-secondary", onClick: () => goToCharacterSelect('friend'), children: "CREATE ROOM" }), _jsxs("div", { className: "join-combo", children: [_jsx("input", { ref: joinCodeRef, className: "join-input", type: "text", maxLength: 8, placeholder: "Room code", onKeyDown: e => e.key === 'Enter' && handleJoinRoom() }), _jsx("button", { id: "btn-join-room", onClick: handleJoinRoom, children: "JOIN" })] })] }), _jsx("div", { className: "start-divider" }), _jsxs("div", { className: "start-section", children: [_jsx("span", { className: "start-mode-label", children: "SINGLE PLAYER" }), _jsx("button", { className: "btn btn-alt", onClick: () => goToCharacterSelect('singleplayer'), children: "VS AI" })] }), _jsx("p", { className: `start-error${errorMsg ? ' visible' : ''}`, children: errorMsg ?? '\u00A0' })] })] }));
}
