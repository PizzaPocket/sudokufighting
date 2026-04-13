export const ANIMATION_CONFIG = {
    idle: { frames: 4, frameDuration: 200, loop: true, priority: 1 },
    punch: { frames: 3, frameDuration: 100, loop: false, priority: 3 },
    kick: { frames: 4, frameDuration: 100, loop: false, priority: 3 },
    row_special: { frames: 4, frameDuration: 120, loop: false, priority: 3 },
    column_special: { frames: 4, frameDuration: 120, loop: false, priority: 3 },
    subgrid_special: { frames: 5, frameDuration: 120, loop: false, priority: 3 },
    damage_light: { frames: 2, frameDuration: 150, loop: false, priority: 3 },
    damage_heavy: { frames: 3, frameDuration: 150, loop: false, priority: 3 },
    block: { frames: 2, frameDuration: 200, loop: true, priority: 2 },
    ko: { frames: 2, frameDuration: 400, loop: false, priority: 5, freeze: true },
    win: { frames: 2, frameDuration: 300, loop: true, priority: 4 },
    win_freeze: { frames: 2, frameDuration: 300, loop: false, priority: 5, freeze: true },
};
