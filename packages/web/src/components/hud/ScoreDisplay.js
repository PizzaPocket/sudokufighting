import { jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
export default function ScoreDisplay({ seat, id }) {
    const score = useGameStore(s => s.score[seat]);
    const [displayed, setDisplayed] = useState(0);
    const raf = useRef(null);
    const target = useRef(0);
    useEffect(() => {
        target.current = score;
        if (raf.current)
            return;
        function animate() {
            const diff = target.current - displayed;
            if (Math.abs(diff) < 1) {
                setDisplayed(target.current);
                raf.current = null;
                return;
            }
            setDisplayed(d => Math.round(d + diff * 0.2));
            raf.current = requestAnimationFrame(animate);
        }
        raf.current = requestAnimationFrame(animate);
        return () => {
            if (raf.current)
                cancelAnimationFrame(raf.current);
        };
    }, [score]);
    return (_jsxs("span", { className: "hud-score", id: id, children: [displayed, " PTS"] }));
}
