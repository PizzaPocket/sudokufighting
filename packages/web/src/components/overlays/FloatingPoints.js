import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
function FloatingPoint({ event }) {
    const removeFloatingPoints = useGameStore(s => s.removeFloatingPoints);
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const onEnd = () => removeFloatingPoints(event.id);
        el.addEventListener('animationend', onEnd, { once: true });
        return () => el.removeEventListener('animationend', onEnd);
    }, [event.id, removeFloatingPoints]);
    // Position over the center of the screen — we don't have cell DOM refs here.
    // Use a fixed central position; a proper implementation would pass the cell rect.
    const x = window.innerWidth / 2 + (event.seat === 0 ? -200 : 200);
    const y = window.innerHeight * 0.4;
    return (_jsxs("div", { ref: ref, className: "floating-points", style: { left: x, top: y }, children: ["+", event.points] }));
}
export default function FloatingPoints() {
    const events = useGameStore(s => s.floatingPoints);
    return (_jsx(_Fragment, { children: events.map(ev => (_jsx(FloatingPoint, { event: ev }, ev.id))) }));
}
