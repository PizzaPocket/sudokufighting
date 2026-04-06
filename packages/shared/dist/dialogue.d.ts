export interface DialogueEntry {
    speakerName: string;
    portraitPath: string;
    lines: string[];
    /** Arena bg.svg to show behind the speaker. null = solid black. */
    backgroundSrc: string | null;
}
export declare const MASTER_CHOW_INTRO: Record<string, string[]>;
export declare const MATCH_DIALOGUE: Record<string, Record<string, {
    speaker: string;
    lines: string[];
}>>;
export declare function getMatchDialogue(playerCharId: string, opponentCharId: string): {
    speaker: string;
    lines: string[];
} | null;
//# sourceMappingURL=dialogue.d.ts.map