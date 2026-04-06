import React from 'react';

interface Props {
  row: number;
  col: number;
  value: number | null;
  // Own-grid states
  isGiven?: boolean;
  isCorrect?: boolean;
  isDanger?: boolean;
  isSelected?: boolean;
  isHighlight?: boolean;
  isSameNumber?: boolean;
  isWiping?: boolean;
  isCompletionFlash?: boolean;
  // Opponent-grid states
  isOpponentGiven?: boolean;
  isOpponentFilled?: boolean;
  isOpponentCursor?: boolean;
  // Position classes
  isBoxTop?: boolean;
  isBoxLeft?: boolean;
  isPreBoxRight?: boolean;
  isPreBoxBottom?: boolean;
  isReadonly?: boolean;
  isPaused?: boolean;
  onPointerDown?: (row: number, col: number) => void;
}

export default function SudokuCell({
  row, col, value,
  isGiven, isCorrect, isDanger, isSelected, isHighlight, isSameNumber,
  isWiping, isCompletionFlash,
  isOpponentGiven, isOpponentFilled, isOpponentCursor,
  isBoxTop, isBoxLeft, isPreBoxRight, isPreBoxBottom,
  isReadonly, isPaused, onPointerDown,
}: Props) {
  const classes = ['cell'];
  if (isGiven) classes.push('given');
  if (isCorrect) classes.push('correct');
  if (isDanger) classes.push('danger');
  if (isOpponentGiven) classes.push('opponent-given');
  if (isOpponentFilled) classes.push('opponent-filled');
  if (isOpponentCursor) classes.push('opponent-cursor');
  if (isHighlight) classes.push('highlight');
  if (isSameNumber) classes.push('same-number');
  if (isSelected) classes.push('selected');
  if (isWiping) classes.push('wiping');
  if (isCompletionFlash) classes.push('completion-flash');
  if (isReadonly) classes.push('readonly');
  if (isBoxTop) classes.push('box-top');
  if (isBoxLeft) classes.push('box-left');
  if (isPreBoxRight) classes.push('pre-box-right');
  if (isPreBoxBottom) classes.push('pre-box-bottom');

  return (
    <div
      className={classes.join(' ')}
      data-row={row}
      data-col={col}
      onPointerDown={onPointerDown ? () => onPointerDown(row, col) : undefined}
    >
      {value != null && !isPaused ? <span>{value}</span> : null}
    </div>
  );
}
