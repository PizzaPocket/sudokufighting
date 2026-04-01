import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getArena } from '@sudoku-fighting/shared';
const MATCH_FADE_DURATION_MS = 298_000;
export default function ArenaBackground() {
    const backgroundId = useGameStore(s => s.backgroundId);
    const preRoundNonce = useGameStore(s => s.preRoundSignal?.nonce);
    const matchOver = useGameStore(s => s.matchOver);
    const matchStartTime = useRef(null);
    const fadeInterval = useRef(null);
    const sunInitialY = useRef(null);
    const sunEndRef = useRef(null);
    const sunStartRef = useRef(null);
    const overlayRef = useRef(null);
    const arena = backgroundId ? getArena(backgroundId) : null;
    // Initialize sun position when arena loads
    useEffect(() => {
        if (!arena?.sunEnd || !sunEndRef.current)
            return;
        // Position sun at vertical centre before fade starts
        if (sunInitialY.current === null) {
            const rect = sunEndRef.current.getBoundingClientRect();
            const y = (window.innerHeight - rect.height) / 2;
            sunInitialY.current = y;
            sunEndRef.current.style.top = `${y}px`;
            if (sunStartRef.current)
                sunStartRef.current.style.top = `${y}px`;
        }
    }, [arena?.sunEnd]);
    // Start bg fade when FIGHT! fires (preRoundSignal nonce changes and it's round 1)
    useEffect(() => {
        if (!preRoundNonce)
            return;
        const st = useGameStore.getState();
        if (st.roundNumber !== 1)
            return; // only start on round 1
        if (!matchStartTime.current)
            matchStartTime.current = Date.now();
        if (fadeInterval.current)
            return; // already running
        fadeInterval.current = setInterval(() => {
            const elapsed = Date.now() - (matchStartTime.current ?? Date.now());
            if (overlayRef.current) {
                overlayRef.current.style.opacity = String(Math.max(0, 1 - elapsed / MATCH_FADE_DURATION_MS));
            }
            const sunEnd = sunEndRef.current;
            const sunStart = sunStartRef.current;
            if (sunEnd && sunInitialY.current !== null) {
                const sinkPx = Math.floor(elapsed / 1000);
                const y = sunInitialY.current + sinkPx;
                sunEnd.style.top = `${y}px`;
                if (sunStart) {
                    sunStart.style.top = `${y}px`;
                    sunStart.style.opacity = String(Math.max(0, 1 - elapsed / MATCH_FADE_DURATION_MS));
                }
            }
        }, 250);
        return () => {
            if (fadeInterval.current) {
                clearInterval(fadeInterval.current);
                fadeInterval.current = null;
            }
        };
    }, [preRoundNonce]); // eslint-disable-line react-hooks/exhaustive-deps
    // Stop fade on match over (pause in place)
    useEffect(() => {
        if (matchOver && fadeInterval.current) {
            clearInterval(fadeInterval.current);
            fadeInterval.current = null;
        }
    }, [matchOver]);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (fadeInterval.current)
                clearInterval(fadeInterval.current);
        };
    }, []);
    if (!arena)
        return null;
    return (_jsxs(_Fragment, { children: [arena.sunEnd && (_jsx("img", { ref: sunEndRef, id: "sun-end", className: "arena-sun active", src: arena.sunEnd, alt: "" })), arena.sunStart && (_jsx("img", { ref: sunStartRef, id: "sun-start", className: "arena-sun active", src: arena.sunStart, alt: "" })), arena.bgFadeOverlay && (_jsx("div", { ref: overlayRef, id: "arena-bg-overlay", className: "active", style: { backgroundImage: `url(${arena.bgFadeOverlay})` } })), arena.ground && (_jsx("img", { id: "fight-ground", src: arena.ground, alt: "" })), arena.overlays?.map(o => (_jsx("img", { id: o.id, className: "midground-graphic", src: o.src, alt: "", style: { display: 'block' } }, o.id)))] }));
}
