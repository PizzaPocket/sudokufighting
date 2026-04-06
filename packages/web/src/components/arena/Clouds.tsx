import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

const CLOUD_WIDTHS = [820, 586, 550, 496, 316, 356];
const MIN_WIDTH = Math.min(...CLOUD_WIDTHS);
const MAX_WIDTH = Math.max(...CLOUD_WIDTHS);
const MIN_SPEED = 3;
const MAX_SPEED = 12;
const MAX_CLOUDS = 3;
const SPAWN_MIN_MS = 5000;
const SPAWN_MAX_MS = 15000;

interface Cloud {
  el: HTMLImageElement;
  x: number;
  naturalWidth: number;
  speed: number;
}

interface Props {
  containerRef: React.RefObject<HTMLElement>;
}

export default function Clouds({ containerRef }: Props) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let running = true;
    let rafId: number | null = null;
    let spawnTimer: ReturnType<typeof setTimeout> | null = null;
    const clouds: Cloud[] = [];
    let lastTs: number | null = null;

    function spawnCloud(startX?: number) {
      const cont = containerRef.current;
      if (!cont) return;
      const vh = window.innerHeight;
      const cloudIdx = Math.floor(Math.random() * CLOUD_WIDTHS.length);
      const cloudNum = cloudIdx + 1;
      const naturalWidth = CLOUD_WIDTHS[cloudIdx];
      const t = (naturalWidth - MIN_WIDTH) / (MAX_WIDTH - MIN_WIDTH);
      const speed = MIN_SPEED + t * (MAX_SPEED - MIN_SPEED);
      const x = startX ?? -(naturalWidth + 20);
      const y = Math.random() * (vh * 0.75);

      const el = document.createElement('img');
      el.src = `/assets/arenas/paradiso/cloud${cloudNum}.svg`;
      el.style.cssText = [
        'position:absolute',
        `left:${x}px`,
        `top:${y}px`,
        'pointer-events:none',
        'z-index:0',
      ].join(';');
      cont.insertBefore(el, cont.firstChild);
      clouds.push({ el, x, naturalWidth, speed });
    }

    function scheduleSpawn() {
      const delay = SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
      spawnTimer = setTimeout(() => {
        if (!running) return;
        if (clouds.length < MAX_CLOUDS) spawnCloud();
        scheduleSpawn();
      }, delay);
    }

    function tick(ts: number) {
      if (!running) return;
      if (useGameStore.getState().isPaused) {
        lastTs = null; // discard elapsed time while paused
        rafId = requestAnimationFrame(tick);
        return;
      }
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 100);
      lastTs = ts;
      const vw = window.innerWidth;

      for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];
        c.x += c.speed * (dt / 1000);
        c.el.style.left = `${c.x}px`;
        if (c.x > vw + c.naturalWidth + 20) {
          c.el.remove();
          clouds.splice(i, 1);
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    // Seed initial clouds
    const vw = window.innerWidth;
    const initialCount = Math.floor(Math.random() * (MAX_CLOUDS + 1));
    for (let i = 0; i < initialCount; i++) spawnCloud(Math.random() * vw);

    scheduleSpawn();
    rafId = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (spawnTimer) clearTimeout(spawnTimer);
      if (rafId) cancelAnimationFrame(rafId);
      clouds.forEach(c => c.el.remove());
    };
  }, []);

  return null;
}
