// Sudoku puzzle generator using backtracking
// Produces easy-difficulty puzzles with 40-45 givens and a unique solution

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValid(grid, row, col, num) {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false;
  }
  // Check column
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false;
  }
  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

function findFirstEmpty(grid) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) return { row: r, col: c };
    }
  }
  return null;
}

function fillGrid(grid) {
  const pos = findFirstEmpty(grid);
  if (!pos) return true;
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const d of digits) {
    if (isValid(grid, pos.row, pos.col, d)) {
      grid[pos.row][pos.col] = d;
      if (fillGrid(grid)) return true;
      grid[pos.row][pos.col] = 0;
    }
  }
  return false;
}

function countSolutions(grid, max = 2) {
  // Deep copy to avoid mutating the original
  const g = grid.map(r => [...r]);
  let count = 0;

  function solve(g) {
    const pos = findFirstEmpty(g);
    if (!pos) {
      count++;
      return count >= max;
    }
    for (let d = 1; d <= 9; d++) {
      if (isValid(g, pos.row, pos.col, d)) {
        g[pos.row][pos.col] = d;
        if (solve(g)) return true;
        g[pos.row][pos.col] = 0;
      }
    }
    return false;
  }

  solve(g);
  return count;
}

export function generatePuzzle() {
  // Stage 1: Build a complete valid grid
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));

  // Seed the first row with shuffled digits for variety
  const firstRow = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (let c = 0; c < 9; c++) grid[0][c] = firstRow[c];

  fillGrid(grid);

  // Stage 2: Copy as solution
  const solution = grid.map(r => [...r]);

  // Stage 3: Remove cells to reach easy difficulty (48–53 givens = remove 28–33)
  const removalTarget = 28 + Math.floor(Math.random() * 6); // 28–33
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => ({ row: Math.floor(i / 9), col: i % 9 }))
  );

  let removed = 0;
  for (const { row, col } of positions) {
    if (removed >= removalTarget) break;
    const saved = grid[row][col];
    grid[row][col] = 0;
    if (countSolutions(grid, 2) === 1) {
      removed++;
    } else {
      grid[row][col] = saved;
    }
  }

  // Convert 0 to null for clarity
  const puzzle = grid.map(r => r.map(v => (v === 0 ? null : v)));

  return { puzzle, solution };
}
