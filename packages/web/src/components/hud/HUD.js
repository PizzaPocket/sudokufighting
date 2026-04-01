import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useGameStore } from '../../store/gameStore';
import HealthBar from './HealthBar';
import RoundTimer from './RoundTimer';
import ScoreDisplay from './ScoreDisplay';
export default function HUD() {
    const myName = useGameStore(s => s.myName);
    const opponentName = useGameStore(s => s.opponentName);
    const mySeat = useGameStore(s => s.mySeat);
    const health = useGameStore(s => s.health);
    const combo = useGameStore(s => s.combo);
    const roundNumber = useGameStore(s => s.roundNumber);
    const roundWins = useGameStore(s => s.roundWins);
    const p1Name = mySeat === 0 ? myName : opponentName;
    const p2Name = mySeat === 0 ? opponentName : myName;
    const roundDots = (wins) => '● '.repeat(wins).trim() || '';
    return (_jsxs("div", { id: "hud", children: [_jsxs("div", { className: "hud-name-row", children: [_jsx("span", { id: "p1-name", className: "hud-name", children: p1Name ?? 'P1' }), _jsxs("span", { id: "round-indicator", className: "round-label", children: ["ROUND ", roundNumber] }), _jsx("span", { id: "p2-name", className: "hud-name right", children: p2Name ?? 'P2' })] }), _jsxs("div", { className: "hud-bar-row", children: [_jsx(HealthBar, { hp: health[0], side: "left", id: "p1-health-bar" }), _jsx("div", { className: "ko-block", children: "KO" }), _jsx(HealthBar, { hp: health[1], side: "right", id: "p2-health-bar" })] }), _jsxs("div", { className: "hud-sub-row", children: [_jsxs("div", { className: "hud-sub-left", children: [_jsx(ScoreDisplay, { seat: mySeat === 0 ? 0 : 1, id: "p1-score" }), _jsx("span", { className: "combo-counter", id: "p1-combo", children: combo[0] > 1 ? `${combo[0]}× COMBO!` : '' })] }), _jsx(RoundTimer, {}), _jsxs("div", { className: "hud-sub-right", children: [_jsx("span", { className: "combo-counter", id: "p2-combo", children: combo[1] > 1 ? `${combo[1]}× COMBO!` : '' }), _jsx(ScoreDisplay, { seat: mySeat === 0 ? 1 : 0, id: "p2-score" })] })] })] }));
}
