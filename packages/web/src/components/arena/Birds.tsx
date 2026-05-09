import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

const FRAMES = 4;
const FRAME_MS = 180;
const PX_PER_FRAME = 8;
const DRIFT_PER_FRAME = 3;
const SPAWN_MIN_MS = 4000;
const SPAWN_MAX_MS = 12000;

interface Bird {
  el: HTMLImageElement;
  x: number;
  y: number;
  fromLeft: boolean;
  dy: number;
  frame: number;
  frameElapsed: number;
}

interface Props {
  containerRef: React.RefObject<HTMLElement>;
}

export default function Birds({ containerRef }: Props) {
  const running = useRef(false);
  const rafId = useRef<number | null>(null);
  const spawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const birds = useRef<Bird[]>([]);
  const lastTs = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    running.current = true;
    lastTs.current = null;

    function scheduleSpawn() {
      const delay = SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
      spawnTimer.current = setTimeout(() => {
        if (!running.current) return;
        spawnBird();
        scheduleSpawn();
      }, delay);
    }

    function spawnBird() {
      const cont = containerRef.current;
      if (!cont) return;
      const fromLeft = Math.random() < 0.5;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const y = 30 + Math.random() * (vh * 0.38);
      const x = fromLeft ? -80 : vw + 80;
      const dy = (Math.random() * 2 - 1) * DRIFT_PER_FRAME;

      const el = document.createElement('img');
      el.src = '/assets/arenas/paradiso/bird_frame1.svg';
      el.style.cssText = [
        'position:absolute',
        `left:${x}px`,
        `top:${y}px`,
        'width:32px',
        'height:32px',
        'pointer-events:none',
        'z-index:1',
        'image-rendering:pixelated',
        fromLeft ? '' : 'transform:scaleX(-1)',
      ].filter(Boolean).join(';');
      cont.insertBefore(el, cont.firstChild);
      birds.current.push({ el, x, y, fromLeft, dy, frame: 1, frameElapsed: 0 });
    }

    function tick(ts: number) {
      if (!running.current) return;
      if (useGameStore.getState().isPaused) {
        lastTs.current = null; // discard elapsed time while paused
        rafId.current = requestAnimationFrame(tick);
        return;
      }
      if (lastTs.current === null) lastTs.current = ts;
      const dt = Math.min(ts - lastTs.current, 100);
      lastTs.current = ts;
      const vw = window.innerWidth;

      for (let i = birds.current.length - 1; i >= 0; i--) {
        const b = birds.current[i];
        b.frameElapsed += dt;
        if (b.frameElapsed >= FRAME_MS) {
          b.frameElapsed -= FRAME_MS;
          b.frame = (b.frame % FRAMES) + 1;
          b.el.src = `/assets/arenas/paradiso/bird_frame${b.frame}.svg`;
          b.x += b.fromLeft ? PX_PER_FRAME : -PX_PER_FRAME;
          b.y += b.dy;
          b.el.style.left = `${b.x}px`;
          b.el.style.top = `${b.y}px`;
        }
        if ((b.fromLeft && b.x > vw + 80) || (!b.fromLeft && b.x < -80)) {
          b.el.remove();
          birds.current.splice(i, 1);
        }
      }

      rafId.current = requestAnimationFrame(tick);
    }

    scheduleSpawn();
    rafId.current = requestAnimationFrame(tick);

    return () => {
      running.current = false;
      if (spawnTimer.current) clearTimeout(spawnTimer.current);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      birds.current.forEach(b => b.el.remove());
      birds.current = [];
    };
  }, []);

  return null;
}
