import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { send } from '../../hooks/useGameSocket';
import { vsAiPlayerMove } from '../../ai/useVsAI';
import SudokuCell from './SudokuCell';

interface Props {
  /** Which player seat this grid belongs to (0 = p1, 1 = p2) */
  gridSeat: 0 | 1;
  id: string;
}

export default function SudokuGrid({ gridSeat, id }: Props) {
  const mySeat = useGameStore(s => s.mySeat);
  const isMe = gridSeat === mySeat;

  const myGrid = useGameStore(s => s.myGrid);
  const myPuzzle = useGameStore(s => s.myPuzzle);
  const mySolution = useGameStore(s => s.mySolution);
  const opponentGrid = useGameStore(s => s.opponentGrid);
  const opponentGivens = useGameStore(s => s.opponentGivens);
  const selectedCell = useGameStore(s => s.selectedCell);
  const opponentCursorPos = useGameStore(s => s.opponentCursorPos);
  const roundOver = useGameStore(s => s.roundOver);
  const isPaused = useGameStore(s => s.isPaused);
  const wipingCells = useGameStore(s => s.wipingCells);
  const lastCorrectCell = useGameStore(s => s.lastCorrectCell);
  const lastCorrectNonce = lastCorrectCell?.nonce;

  const selectCell = useGameStore(s => s.selectCell);
  const setLocalCellValue = useGameStore(s => s.setLocalCellValue);
  const setSelfDamagePredicted = useGameStore(s => s.setSelfDamagePredicted);
  const p1AnimSignal = useGameStore(s => s.p1AnimSignal);
  const p2AnimSignal = useGameStore(s => s.p2AnimSignal);

  // Completion flash state: key = "row-col", value = animation key counter
  const [flashCells, setFlashCells] = useState<Set<string>>(new Set());
  const lastSentCursor = useRef<{ row: number; col: number } | null>(null);

  // Build wiping set for this grid's seat
  const wipingSet = new Set<string>();
  for (const w of wipingCells) {
    if (w.targetSeat === gridSeat) wipingSet.add(`${w.row}-${w.col}`);
  }

  // Completion ripple — triggered when my own cell becomes correct
  useEffect(() => {
    if (!isMe || !lastCorrectCell || !myGrid || !mySolution) return;
    const { row, col } = lastCorrectCell;

    const g = myGrid as (number | null)[][];
    const sol = mySolution;
    const flashTargets: string[] = [];

    const rowComplete = g[row].every((v, c) => v != null && v === sol[row][c]);
    if (rowComplete) {
      for (let c = 0; c < 9; c++) flashTargets.push(`${row}-${c}`);
    }
    const colComplete = g.every((r, ri) => r[col] != null && r[col] === sol[ri][col]);
    if (colComplete) {
      for (let r = 0; r < 9; r++) flashTargets.push(`${r}-${col}`);
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    let boxComplete = true;
    for (let r = boxRow; r < boxRow + 3 && boxComplete; r++)
      for (let c = boxCol; c < boxCol + 3 && boxComplete; c++)
        if (g[r][c] !== sol[r][c]) boxComplete = false;
    if (boxComplete) {
      for (let r = boxRow; r < boxRow + 3; r++)
        for (let c = boxCol; c < boxCol + 3; c++)
          flashTargets.push(`${r}-${c}`);
    }

    if (flashTargets.length === 0) return;

    // Add flash classes, remove after animation (350ms)
    const unique = [...new Set(flashTargets)];
    setFlashCells(prev => {
      const next = new Set(prev);
      unique.forEach(k => next.add(k));
      return next;
    });
    setTimeout(() => {
      setFlashCells(prev => {
        const next = new Set(prev);
        unique.forEach(k => next.delete(k));
        return next;
      });
    }, 400);
  }, [lastCorrectNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard input — only for own grid
  useEffect(() => {
    if (!isMe) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const cur = useGameStore.getState().selectedCell;
        if (!cur) return;
        let { row, col } = cur;
        if (e.key === 'ArrowUp')    row = Math.max(0, row - 1);
        if (e.key === 'ArrowDown')  row = Math.min(8, row + 1);
        if (e.key === 'ArrowLeft')  col = Math.max(0, col - 1);
        if (e.key === 'ArrowRight') col = Math.min(8, col + 1);
        useGameStore.getState().selectCell(row, col);
        send('cursor_move', { row, col });
        return;
      }

      const st = useGameStore.getState();
      if (!st.selectedCell || st.roundOver) return;
      const { row, col } = st.selectedCell;

      if (st.isPaused) return;

      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        if (st.myPuzzle?.[row]?.[col] !== null) return;
        if (st.mySolution?.[row]?.[col] != null && st.myGrid?.[row]?.[col] === st.mySolution[row][col]) return;
        st.setLocalCellValue(row, col, num);
        // Optimistic wrong-guess damage animation
        if (st.mySolution && st.mySolution[row][col] !== num) {
          const nonce = Date.now();
          const animKey = st.mySeat === 0 ? 'p1AnimSignal' : 'p2AnimSignal';
          const mistakeKey = st.mySeat === 0 ? 'p1MistakeSignal' : 'p2MistakeSignal';
          useGameStore.setState({ [animKey]: { state: 'damage_heavy', nonce }, [mistakeKey]: { nonce }, attackFlashType: 'self' });
          setTimeout(() => useGameStore.getState().setSelfDamagePredicted(), 300);
        }
        if (st.gameMode === 'practice' || st.gameMode === 'campaign') {
          vsAiPlayerMove?.(row, col, num);
        } else {
          send('cell_input', { row, col, value: num });
        }
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (st.myPuzzle?.[row]?.[col] !== null) return;
        st.setLocalCellValue(row, col, null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMe]);

  const handlePointerDown = useCallback((row: number, col: number) => {
    if (!isMe) return;
    const st = useGameStore.getState();
    // Tap already-selected non-given cell to clear it
    if (st.selectedCell?.row === row && st.selectedCell?.col === col) {
      if (st.myPuzzle?.[row]?.[col] === null && st.myGrid?.[row]?.[col] != null) {
        st.setLocalCellValue(row, col, null);
        return;
      }
    }
    selectCell(row, col);
    send('cursor_move', { row, col });
  }, [isMe, selectCell]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMe) return;
    const cell = (e.target as HTMLElement).closest('[data-row]') as HTMLElement | null;
    if (!cell) return;
    const row = parseInt(cell.dataset.row ?? '');
    const col = parseInt(cell.dataset.col ?? '');
    if (isNaN(row) || isNaN(col)) return;
    if (lastSentCursor.current?.row === row && lastSentCursor.current?.col === col) return;
    lastSentCursor.current = { row, col };
    send('cursor_move', { row, col });
  }, [isMe]);

  const grid = isMe ? myGrid : opponentGrid;
  const puzzle = isMe ? myPuzzle : opponentGivens;

  if (!grid) return null;

  const selVal = (isMe && selectedCell) ? (myGrid?.[selectedCell.row]?.[selectedCell.col] ?? null) : null;

  const cells: React.ReactElement[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = grid[r][c];
      const givenVal = puzzle?.[r]?.[c] ?? null;
      const isGiven = givenVal !== null;
      const isCorrect = !isGiven && val != null && mySolution != null && isMe && mySolution[r][c] === val;
      const isDanger = !isGiven && val != null && mySolution != null && isMe && mySolution[r][c] !== val;
      const isSelected = isMe && selectedCell?.row === r && selectedCell?.col === c;
      const isHighlight = isMe && selectedCell != null && !isSelected && (
        r === selectedCell.row || c === selectedCell.col ||
        (Math.floor(r / 3) === Math.floor(selectedCell.row / 3) && Math.floor(c / 3) === Math.floor(selectedCell.col / 3))
      );
      const isSameNumber = isMe && selVal != null && val === selVal && !isSelected;
      const key = `${r}-${c}`;
      const isWiping = wipingSet.has(key);
      const isCompletionFlash = flashCells.has(key);
      const isOpponentCursor = !isMe && opponentCursorPos?.row === r && opponentCursorPos?.col === c;
      const isOpponentGiven = !isMe && isGiven && val != null;
      const isOpponentFilled = !isMe && !isGiven && val != null;

      cells.push(
        <SudokuCell
          key={key}
          row={r}
          col={c}
          value={val}
          isGiven={isMe ? isGiven : undefined}
          isCorrect={isMe ? isCorrect : undefined}
          isDanger={isMe ? isDanger : undefined}
          isSelected={isSelected}
          isHighlight={isHighlight}
          isSameNumber={isSameNumber}
          isWiping={isWiping}
          isCompletionFlash={isCompletionFlash}
          isOpponentGiven={isOpponentGiven}
          isOpponentFilled={isOpponentFilled}
          isOpponentCursor={isOpponentCursor}
          isBoxTop={r > 0 && r % 3 === 0}
          isBoxLeft={c > 0 && c % 3 === 0}
          isPreBoxRight={c === 2 || c === 5}
          isPreBoxBottom={r === 2 || r === 5}
          isReadonly={!isMe}
          isPaused={isPaused}
          onPointerDown={isMe ? handlePointerDown : undefined}
        />
      );
    }
  }

  return (
    <div
      id={id}
      className={`sudoku-grid${isMe ? ' is-me' : ''}`}
      onMouseMove={isMe ? handleMouseMove : undefined}
    >
      {cells}
    </div>
  );
}
