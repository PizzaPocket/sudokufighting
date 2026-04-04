// Sudoku solver utilities — pure functions, no side effects

type Grid = (number | null | 0)[][];

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isValid(grid: Grid, row: number, col: number, num: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

function findFirstEmpty(grid: Grid): { row: number; col: number } | null {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!grid[r][c]) return { row: r, col: c };
    }
  }
  return null;
}

export function fillGrid(grid: Grid): boolean {
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

export function countSolutions(grid: Grid, max = 2): number {
  const g = grid.map(r => [...r]);
  let count = 0;

  function solve(g: Grid): boolean {
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
