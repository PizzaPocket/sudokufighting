import { getArena } from '@sudoku-fighting/shared';

/**
 * Preload all image assets for a given arena into the browser cache.
 * Called as soon as backgroundId is known (lobby, game_start) so assets
 * are warm by the time GameplayScreen renders them.
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
  ].filter((s): s is string => !!s);

  for (const src of srcs) {
    const img = new Image();
    img.src = src;
  }
}
