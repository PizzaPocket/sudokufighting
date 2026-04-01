import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
export default function AttackFlash() {
    const flashType = useGameStore(s => s.attackFlashType);
    const clearAttackFlash = useGameStore(s => s.clearAttackFlash);
    const divRef = useRef(null);
    // Track nonce so same flashType in succession re-triggers
    const prevType = useRef(null);
    useEffect(() => {
        if (!flashType || !divRef.current)
            return;
        const el = divRef.current;
        // Force reflow so the animation re-plays even if same class
        el.className = 'attack-flash';
        void el.offsetWidth;
        el.className = `attack-flash ${flashType}-flash`;
        const onEnd = () => {
            clearAttackFlash();
        };
        el.addEventListener('animationend', onEnd, { once: true });
        return () => el.removeEventListener('animationend', onEnd);
    }, [flashType]);
    return _jsx("div", { ref: divRef, className: "attack-flash" });
}
