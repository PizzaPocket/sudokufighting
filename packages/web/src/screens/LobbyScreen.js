import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { send } from '../hooks/useGameSocket';
import { ARENAS } from '@sudoku-fighting/shared';
import ArenaCarousel from '../components/lobby/ArenaCarousel';
export default function LobbyScreen({ active }) {
    const mySeat = useGameStore(s => s.mySeat);
    const myCharacter = useGameStore(s => s.myCharacter);
    const myName = useGameStore(s => s.myName);
    const myUseAlt = useGameStore(s => s.myUseAlt);
    const characters = useGameStore(s => s.characters);
    const opponentName = useGameStore(s => s.opponentName);
    const opponentCharacter = useGameStore(s => s.opponentCharacter);
    const opponentUseAlt = useGameStore(s => s.opponentUseAlt);
    const lobbyOpponentReady = useGameStore(s => s.lobbyOpponentReady);
    const shareCode = useGameStore(s => s.shareCode);
    const gameMode = useGameStore(s => s.gameMode);
    const preferredArenaId = useGameStore(s => s.preferredArenaId);
    const setPreferredArena = useGameStore(s => s.setPreferredArena);
    const spArenaIndex = useGameStore(s => s.spArenaIndex);
    const setSpArenaIndex = useGameStore(s => s.setSpArenaIndex);
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [arenaIndex, setArenaIndex] = useState(0);
    const hasSentJoin = useRef(false);
    const isPrivate = gameMode === 'friend';
    const title = isPrivate ? 'PRIVATE ROOM' : 'MATCHMAKING';
    const myChar = characters.find(c => c.id === myCharacter);
    const oppChar = characters.find(c => c.id === opponentCharacter);
    // Send join/create once when screen becomes active
    useEffect(() => {
        if (!active || hasSentJoin.current)
            return;
        hasSentJoin.current = true;
        const storedName = myName ?? 'Player';
        const charId = myCharacter ?? 'fighter1';
        if (gameMode === 'quick') {
            send('find_match', { characterId: charId, name: storedName, preferredArenaId: null });
        }
        else if (gameMode === 'friend') {
            // Check if we have a pending join code
            const st = useGameStore.getState();
            const pending = st.pendingJoinCode;
            if (pending) {
                useGameStore.setState({ pendingJoinCode: null });
                send('join_room', { shareCode: pending, characterId: charId, name: storedName });
            }
            else {
                send('create_room', { characterId: charId, name: storedName });
            }
        }
    }, [active]);
    // Reset hasSentJoin on deactivation
    useEffect(() => {
        if (!active)
            hasSentJoin.current = false;
    }, [active]);
    function handleCopyLink() {
        const url = `${window.location.origin}?room=${shareCode}`;
        navigator.clipboard.writeText(url).catch(() => { });
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
    }
    const p1Seat = 0;
    const p2Seat = 1;
    // Default to P1 while waiting for seat assignment from server (create_room doesn't
    // immediately send player_joined — it only arrives once both players are in the room)
    const myP1 = mySeat === null ? true : mySeat === 0;
    function getPortrait(char, useAlt) {
        if (!char)
            return '/characters/placeholder_fighter.svg';
        return useAlt && char.altPortraitPath ? char.altPortraitPath : char.portraitPath;
    }
    return (_jsxs("div", { id: "screen-lobby", className: `screen${active ? ' active' : ''}`, children: [_jsx("h1", { className: "lobby-title", children: title }), _jsxs("div", { className: "lobby-players", children: [_jsxs("div", { id: "lobby-p1", className: `lobby-player${myP1 ? ' is-me' : ''}`, children: [_jsx("span", { className: "lobby-player-label", children: "P1" }), _jsx("img", { id: "lobby-p1-portrait", src: getPortrait(myP1 ? myChar : oppChar, myP1 ? myUseAlt : opponentUseAlt), alt: "" }), _jsx("span", { children: myP1 ? (myName ?? '—') : (opponentName ?? '—') }), _jsx("span", { className: `lobby-status ${(myP1 ? true : lobbyOpponentReady) ? 'ready' : 'waiting'}`, children: (myP1 ? true : lobbyOpponentReady) ? 'READY' : 'WAITING...' })] }), _jsx("span", { className: "lobby-vs", children: "VS" }), _jsxs("div", { id: "lobby-p2", className: `lobby-player${!myP1 ? ' is-me' : ''}`, children: [_jsx("span", { className: "lobby-player-label", children: "P2" }), _jsx("img", { id: "lobby-p2-portrait", src: getPortrait(!myP1 ? myChar : oppChar, !myP1 ? myUseAlt : opponentUseAlt), alt: "" }), _jsx("span", { children: !myP1 ? (myName ?? '—') : (opponentName ?? '—') }), _jsx("span", { className: `lobby-status ${(!myP1 ? true : lobbyOpponentReady) ? 'ready' : 'waiting'}`, children: (!myP1 ? true : lobbyOpponentReady) ? 'READY' : 'WAITING...' })] })] }), !lobbyOpponentReady && (_jsx("p", { className: "lobby-hint", children: "Waiting for opponent\u2026" })), isPrivate && shareCode ? (_jsxs("div", { className: "lobby-share", children: [_jsx("span", { className: "lobby-share-label", children: "INVITE CODE" }), _jsxs("div", { className: "lobby-invite-row", children: [_jsx("span", { className: "lobby-share-code", children: shareCode }), _jsx("button", { className: "btn btn-sm btn-secondary", onClick: handleCopyLink, children: "COPY LINK" })] }), _jsx("p", { className: `lobby-copy-confirm${copyFeedback ? ' visible' : ''}`, children: "Link copied!" })] })) : !isPrivate ? (_jsxs("div", { className: "lobby-promo", children: [_jsx("button", { className: "btn btn-sm btn-secondary", onClick: handleCopyLink, children: "SHARE GAME" }), _jsx("p", { className: `lobby-promo-feedback${copyFeedback ? ' visible' : ''}`, children: "Link copied!" })] })) : null, _jsx(ArenaCarousel, { arenaIndex: arenaIndex, onIndexChange: (i) => { setArenaIndex(i); setPreferredArena(ARENAS[i].id); }, sendToServer: gameMode === 'quick' })] }));
}
