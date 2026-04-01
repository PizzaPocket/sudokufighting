import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useGameStore } from '../../store/gameStore';
import { send } from '../../hooks/useGameSocket';
import { vsAiPlayerMove } from '../../ai/useVsAI';
export default function MobileNumpad() {
    const selectedCell = useGameStore(s => s.selectedCell);
    const roundOver = useGameStore(s => s.roundOver);
    const handlePointerDown = (e) => {
        e.preventDefault(); // fire instantly; suppress synthetic click
        const btn = e.target.closest('[data-value]');
        if (!btn)
            return;
        const st = useGameStore.getState();
        if (!st.selectedCell || st.roundOver)
            return;
        const { row, col } = st.selectedCell;
        const value = parseInt(btn.dataset.value ?? '0');
        if (value === 0) {
            // Clear
            if (st.myPuzzle?.[row]?.[col] !== null)
                return;
            st.setLocalCellValue(row, col, null);
        }
        else {
            if (st.myPuzzle?.[row]?.[col] !== null)
                return;
            if (st.mySolution?.[row]?.[col] != null && st.myGrid?.[row]?.[col] === st.mySolution[row][col])
                return;
            st.setLocalCellValue(row, col, value);
            if (st.mySolution && st.mySolution[row][col] !== value) {
                const nonce = Date.now();
                const key = st.mySeat === 0 ? 'p1AnimSignal' : 'p2AnimSignal';
                useGameStore.setState({ [key]: { state: 'damage_light', nonce }, attackFlashType: 'self' });
                st.setSelfDamagePredicted();
            }
            if (st.gameMode === 'singleplayer') {
                vsAiPlayerMove?.(row, col, value);
            }
            else {
                send('cell_input', { row, col, value });
            }
        }
    };
    return (_jsxs("div", { id: "mobile-numpad", onPointerDown: handlePointerDown, children: [[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (_jsx("div", { className: "numpad-btn", "data-value": n, children: n }, n))), _jsx("div", { className: "numpad-btn", "data-value": 0, style: { gridColumn: 'span 9' }, children: "\u232B" })] }));
}
