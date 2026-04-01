import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { send } from '../../hooks/useGameSocket';
import { startVsAIRound } from '../../ai/useVsAI';
import { playRoundAnnouncer, playFightAnnouncer, playKOAnnouncer, playTKOAnnouncer, playVictoryAnnouncer, playDevastationAnnouncer, startFightMusic, } from '../../audio/audioManager';
export default function GameOverlay() {
    const preRoundSignal = useGameStore(s => s.preRoundSignal);
    const roundOver = useGameStore(s => s.roundOver);
    const roundWinnerSeat = useGameStore(s => s.roundWinnerSeat);
    const matchOver = useGameStore(s => s.matchOver);
    const mySeat = useGameStore(s => s.mySeat);
    const health = useGameStore(s => s.health);
    const myName = useGameStore(s => s.myName);
    const opponentName = useGameStore(s => s.opponentName);
    const matchWinnerSeat = useGameStore(s => s.matchWinnerSeat);
    const matchWinnerName = useGameStore(s => s.matchWinnerName);
    const opponentDisconnected = useGameStore(s => s.opponentDisconnected);
    const gameMode = useGameStore(s => s.gameMode);
    const resetAll = useGameStore(s => s.resetAll);
    const [overlay, setOverlay] = useState(null);
    const [showButtons, setShowButtons] = useState(false);
    const [hidden, setHidden] = useState(true);
    const timers = useRef([]);
    const mainRef = useRef(null);
    function clearTimers() {
        timers.current.forEach(t => clearTimeout(t));
        timers.current = [];
    }
    function addTimer(fn, ms) {
        timers.current.push(setTimeout(fn, ms));
    }
    function showOverlay(content) {
        setOverlay(content);
        setHidden(false);
        // Re-trigger animation
        if (mainRef.current) {
            mainRef.current.style.animation = 'none';
            void mainRef.current.offsetWidth;
            mainRef.current.style.animation = '';
        }
    }
    function hideOverlay() {
        setHidden(true);
    }
    // Pre-round sequence: ROUND X (2s) → FIGHT! (1s) → hide
    const preRoundNonce = preRoundSignal?.nonce;
    useEffect(() => {
        if (!preRoundSignal)
            return;
        clearTimers();
        setShowButtons(false);
        const { roundNumber, backgroundId } = preRoundSignal;
        playRoundAnnouncer(roundNumber);
        showOverlay({
            main: `ROUND ${roundNumber}`,
            sub: '',
            mainColor: 'var(--accent)',
            nonce: preRoundSignal.nonce,
        });
        addTimer(() => {
            playFightAnnouncer();
            if (roundNumber === 1)
                startFightMusic(backgroundId);
            showOverlay({
                main: 'FIGHT!',
                sub: '',
                mainColor: '#dc2626',
                mainShadow: '4px 5px 0 #FF8B16',
                nonce: preRoundSignal.nonce + 0.5,
            });
            addTimer(() => hideOverlay(), 1000);
        }, 2000);
    }, [preRoundNonce]); // eslint-disable-line react-hooks/exhaustive-deps
    // Round-end overlay: KO / TKO / TIE
    useEffect(() => {
        if (!roundOver || matchOver)
            return;
        clearTimers();
        addTimer(() => {
            const st = useGameStore.getState();
            const winner = st.roundWinnerSeat ?? -1;
            if (winner === -1) {
                showOverlay({ main: 'TIE', sub: "IT'S A TIE", mainColor: '#8B49FF', nonce: Date.now() });
            }
            else {
                const isTrueKO = st.health[(1 - winner)] <= 0;
                const winnerIsMe = winner === st.mySeat;
                const wName = winnerIsMe ? st.myName : st.opponentName;
                const subText = ((wName ?? 'Player').toUpperCase()) + ' WINS!';
                if (isTrueKO)
                    playKOAnnouncer();
                else
                    playTKOAnnouncer();
                showOverlay({ main: isTrueKO ? 'KO' : 'TKO', sub: subText, mainColor: '#F00013', nonce: Date.now() });
            }
            addTimer(() => {
                if (useGameStore.getState().matchOver)
                    return;
                hideOverlay();
                const cur = useGameStore.getState();
                if (cur.gameMode === 'singleplayer') {
                    startVsAIRound(cur.roundNumber + 1);
                }
                else {
                    send('next_round', {});
                }
            }, 2500);
        }, 400);
    }, [roundOver]); // eslint-disable-line react-hooks/exhaustive-deps
    // Match-end overlay: VICTORY / DEVASTATION
    useEffect(() => {
        if (!matchOver || matchWinnerSeat === null)
            return;
        clearTimers();
        setShowButtons(false);
        addTimer(() => {
            if (matchWinnerSeat === -1) {
                showOverlay({ main: 'TIE', sub: "IT'S A TIE", mainColor: '#8B49FF', nonce: Date.now() });
                setShowButtons(true);
                return;
            }
            const isWinner = matchWinnerSeat === mySeat;
            const winnerDisplayName = opponentDisconnected
                ? 'OPPONENT DISCONNECTED'
                : (matchWinnerName ?? 'Unknown').toUpperCase() + ' WINS!';
            if (isWinner) {
                playVictoryAnnouncer();
                showOverlay({
                    main: 'VICTORY!',
                    sub: winnerDisplayName,
                    mainColor: '#FF8B16',
                    mainShadow: '4px 5px 0 #8B49FF',
                    subColor: '#FFCA00',
                    nonce: Date.now(),
                });
            }
            else {
                if (!opponentDisconnected)
                    playDevastationAnnouncer();
                showOverlay({
                    main: 'DEVASTATION!',
                    sub: winnerDisplayName,
                    mainColor: '#F00013',
                    mainShadow: '4px 5px 0 #FF8B16',
                    nonce: Date.now(),
                });
            }
            setShowButtons(true);
        }, 400);
    }, [matchOver]); // eslint-disable-line react-hooks/exhaustive-deps
    if (hidden || !overlay)
        return null;
    return (_jsxs("div", { className: `game-overlay${hidden ? ' hidden' : ''}`, children: [_jsx("div", { ref: mainRef, id: "game-overlay-main", className: "overlay-main", style: { color: overlay.mainColor, textShadow: overlay.mainShadow }, children: overlay.main }), overlay.sub && (_jsx("div", { className: "overlay-sub", style: overlay.subColor ? { color: overlay.subColor } : undefined, children: overlay.sub })), showButtons && (_jsxs("div", { className: "overlay-btn-row", children: [gameMode === 'singleplayer' && (_jsx("button", { className: "btn btn-alt", onClick: () => {
                            const st = useGameStore.getState();
                            useGameStore.setState({ matchOver: false, matchWinnerSeat: null, roundWins: [0, 0] });
                            startVsAIRound(1);
                            setShowButtons(false);
                            setHidden(true);
                        }, children: "PLAY AGAIN" })), _jsx("button", { className: "btn btn-secondary", onClick: () => resetAll(), children: "LEAVE" })] }))] }));
}
