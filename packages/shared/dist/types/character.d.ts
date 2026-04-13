export interface Character {
    id: string;
    name: string;
    altId?: string;
    altName?: string;
    portraitPath: string;
    altPortraitPath?: string;
}
export type AnimationState = 'idle' | 'punch' | 'kick' | 'row_special' | 'column_special' | 'subgrid_special' | 'damage_light' | 'damage_heavy' | 'block' | 'ko' | 'win' | 'win_freeze';
export interface AnimationConfig {
    frames: number;
    frameDuration: number;
    loop: boolean;
    priority: 1 | 2 | 3 | 4 | 5;
    freeze?: boolean;
}
export declare const ANIMATION_CONFIG: Record<AnimationState, AnimationConfig>;
//# sourceMappingURL=character.d.ts.map