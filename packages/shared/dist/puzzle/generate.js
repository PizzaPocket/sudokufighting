import { shuffle, fillGrid, countSolutions } from './solve.js';
export function generatePuzzle() {
    // Build a complete valid grid
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
    const firstRow = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (let c = 0; c < 9; c++)
        grid[0][c] = firstRow[c];
    fillGrid(grid);
    const solution = grid.map(r => [...r]);
    // Remove cells (28–33) while maintaining unique solution
    const removalTarget = 28 + Math.floor(Math.random() * 6);
    const positions = shuffle(Array.from({ length: 81 }, (_, i) => ({ row: Math.floor(i / 9), col: i % 9 })));
    let removed = 0;
    for (const { row, col } of positions) {
        if (removed >= removalTarget)
            break;
        const saved = grid[row][col];
        grid[row][col] = 0;
        if (countSolutions(grid, 2) === 1) {
            removed++;
        }
        else {
            grid[row][col] = saved;
        }
    }
    const puzzle = grid.map(r => r.map(v => (v === 0 ? null : v)));
    return { puzzle, solution };
}
