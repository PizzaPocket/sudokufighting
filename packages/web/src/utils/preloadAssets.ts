import { getArena } from '@sudoku-fighting/shared';

const _preloaded = new Set<string>();

/**
 * Preload all image assets for a given arena through the full image decode
 * pipeline (not just fetch cache), so they're ready to paint with no flash.
 */
export function preloadArenaAssets(arenaId: string): void {
  const arena = getArena(arenaId);
  if (!arena) return;

  const srcs = [
    arena.background,
    arena.ground,
    arena.bgFadeOverlay,
    arena.sunEnd,
    arena.sunStart,
    arena.dialogueBg,
    ...arena.overlays.map(o => o.src),
  ].filter((s): s is string => !!s && !_preloaded.has(s));

  for (const src of srcs) {
    _preloaded.add(src);
    const img = new Image();
    img.src = src;
    img.decode?.().catch(() => {});
  }
}
