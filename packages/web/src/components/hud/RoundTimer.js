import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ROUND_DURATION_MS } from '@sudoku-fighting/shared';
import { useGameStore } from '../../store/gameStore';
export default function RoundTimer() {
    const roundStartTime = useGameStore(s => s.roundStartTime);
    const roundOver = useGameStore(s => s.roundOver);
    const [seconds, setSeconds] = useState(99);
    useEffect(() => {
        if (!roundStartTime || roundOver)
            return;
        const interval = setInterval(() => {
            const elapsed = Date.now() - roundStartTime;
            const remaining = Math.max(0, Math.ceil((ROUND_DURATION_MS - elapsed) / 1000));
            setSeconds(remaining);
        }, 250);
        return () => clearInterval(interval);
    }, [roundStartTime, roundOver]);
    // Reset on new round
    useEffect(() => {
        if (roundStartTime)
            setSeconds(99);
    }, [roundStartTime]);
    const urgent = seconds <= 10;
    return (_jsx("div", { id: "round-timer", className: `round-timer${urgent ? ' urgent' : ''}`, children: String(seconds).padStart(2, '0') }));
}
