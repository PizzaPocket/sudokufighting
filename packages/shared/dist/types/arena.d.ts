export interface ArenaOverlay {
    id: string;
    src: string;
}
export interface Arena {
    id: string;
    name: string;
    background: string;
    ground: string;
    bgFadeOverlay?: string;
    sunEnd?: string;
    sunStart?: string;
    hasBirds?: boolean;
    hasClouds?: boolean;
    overlays: ArenaOverlay[];
    trackIndex: number;
    dialogueBg?: string;
}
//# sourceMappingURL=arena.d.ts.map