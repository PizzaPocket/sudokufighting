// Minimal ambient declarations for globals that exist in both browser and Node
// without pulling in the full DOM or Node typings.
declare function setTimeout(fn: () => void, ms: number): number;
declare function clearTimeout(id: number): void;
