import type { PuzzleState } from '../types/game.js';

export function isRowComplete(puzz: PuzzleState, row: number): boolean {
  return puzz.playerGrid[row].every((v, c) =>
    v !== null && v !== 0 && v === puzz.solution[row][c]
  );
}

export function isColComplete(puzz: PuzzleState, col: number): boolean {
  return puzz.playerGrid.every((r, ri) =>
    r[col] !== null && r[col] !== 0 && r[col] === puzz.solution[ri][col]
  );
}

export function isBoxComplete(puzz: PuzzleState, boxRow: number, boxCol: number): boolean {
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (puzz.playerGrid[r][c] !== puzz.solution[r][c]) return false;
    }
  }
  return true;
}

export function isPuzzleComplete(puzz: PuzzleState): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzz.playerGrid[r][c] !== puzz.solution[r][c]) return false;
    }
  }
  return true;
}
