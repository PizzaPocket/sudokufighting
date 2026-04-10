import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getArena } from '@sudoku-fighting/shared';

const MATCH_FADE_DURATION_MS = 298_000;

export default function ArenaBackground() {
  const backgroundId = useGameStore(s => s.backgroundId);
  const preRoundNonce = useGameStore(s => s.preRoundSignal?.nonce);
  const matchOver = useGameStore(s => s.matchOver);

  const matchStartTime = useRef<number | null>(null);
  const fadeInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const sunEndRef = useRef<HTMLImageElement>(null);
  const sunStartRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const matchPausedMs = useRef<number>(0);   // accumulated paused ms for this match
  const pausedAt = useRef<number | null>(null); // when current pause began

  const arena = backgroundId ? getArena(backgroundId) : null;

  // Initialize sun position when arena loads
  useEffect(() => {
    if (!arena?.sunEnd || !sunEndRef.current) return;
    const y = (window.innerHeight - sunEndRef.current.offsetHeight) / 2;
    sunEndRef.current.style.top = `${y}px`;
    if (sunStartRef.current) sunStartRef.current.style.top = `${y}px`;
  }, [arena?.sunEnd]);

  // Start bg fade when FIGHT! fires; keep running across all rounds for the full match duration
  useEffect(() => {
    if (!preRoundNonce) return;
    const st = useGameStore.getState();

    // Set match start time only once, on round 1
    if (st.roundNumber === 1) {
      matchStartTime.current = Date.now();
      matchPausedMs.current = 0;
    }

    // No match start time means round 1 hasn't fired yet — bail
    if (!matchStartTime.current) return;
    if (fadeInterval.current) return;

    function startFadeInterval() {
      fadeInterval.current = setInterval(() => {
        const elapsed = Date.now() - (matchStartTime.current ?? Date.now()) - matchPausedMs.current;

        if (overlayRef.current) {
          overlayRef.current.style.opacity = String(Math.max(0, 1 - elapsed / MATCH_FADE_DURATION_MS));
        }

        const sunEnd = sunEndRef.current;
        const sunStart = sunStartRef.current;
        if (sunEnd) {
          const sinkPx = Math.floor(elapsed / 1000);
          const y = (window.innerHeight - sunEnd.offsetHeight) / 2 + sinkPx;
          sunEnd.style.top = `${y}px`;
          if (sunStart) {
            sunStart.style.top = `${y}px`;
            sunStart.style.opacity = String(Math.max(0, 1 - elapsed / MATCH_FADE_DURATION_MS));
          }
        }
      }, 250);
    }

    startFadeInterval();

    // Subscribe to pause state and pause/resume the fade interval
    let prevPaused = useGameStore.getState().isPaused;
    const unsub = useGameStore.subscribe((s) => {
      const isPaused = s.isPaused;
      if (isPaused === prevPaused) return;
      prevPaused = isPaused;
      if (isPaused) {
        if (fadeInterval.current) {
          clearInterval(fadeInterval.current);
          fadeInterval.current = null;
        }
        pausedAt.current = Date.now();
      } else {
        if (pausedAt.current != null) {
          matchPausedMs.current += Date.now() - pausedAt.current;
          pausedAt.current = null;
        }
        startFadeInterval();
      }
    });

    return () => {
      unsub();
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
      if (fadeInterval.current) clearInterval(fadeInterval.current);
    };
  }, []);

  if (!arena) return null;

  return (
    <>
      {/* Fade overlay (bgFadeOverlay path) — sky layer, fades out to reveal base background */}
      {arena.bgFadeOverlay && (
        <div
          ref={overlayRef}
          id="arena-bg-overlay"
          className="active"
          style={{ backgroundImage: `url(${arena.bgFadeOverlay})` }}
        />
      )}

      {/* Sun layers (El Tropical) — above sky overlay; sun_end below sun_start so fade reveals it */}
      {arena.sunEnd && (
        <img
          ref={sunEndRef}
          id="sun-end"
          className="arena-sun active"
          src={arena.sunEnd}
          alt=""
        />
      )}
      {arena.sunStart && (
        <img
          ref={sunStartRef}
          id="sun-start"
          className="arena-sun active"
          src={arena.sunStart}
          alt=""
        />
      )}

      {/* Ground */}
      {arena.ground && (
        <img id="fight-ground" src={arena.ground} alt="" />
      )}

      {/* Midground overlays (palm trees, buildings, etc.) */}
      {arena.overlays?.map(o => (
        <img
          key={o.id}
          id={o.id}
          className="midground-graphic"
          src={o.src}
          alt=""
          style={{ display: 'block' }}
        />
      ))}
    </>
  );
}
