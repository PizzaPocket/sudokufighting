import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { initAudio, playLogoAndSelectMusic } from '../audio/audioManager';
import { hapticRipple } from '../audio/haptics';
import SudokuCell from '../components/grid/SudokuCell';
import { CREDITS } from '../creditsContent';

// ── Puzzle generation ──────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface SplashPuzzle {
  answer: number;
  rowCells: (number | null)[]; // 9 items; index 4 = null (center = answer)
  colCells: (number | null)[]; // 9 items; index 4 = null
}

function generateSplashPuzzle(): SplashPuzzle {
  const answer = Math.floor(Math.random() * 9) + 1;
  const others = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => d !== answer));
  const slots = [0, 1, 2, 3, 5, 6, 7, 8];

  const rowCells: (number | null)[] = Array(9).fill(null);
  const colCells: (number | null)[] = Array(9).fill(null);
  // All 8 non-center slots filled — one shuffle per line so digits differ in order
  shuffle(slots).forEach((slot, i) => { rowCells[slot] = others[i]; });
  shuffle(slots).forEach((slot, i) => { colCells[slot] = others[i]; });

  return { answer, rowCells, colCells };
}

// ── Component ──────────────────────────────────────────────────────────────────

type InputState = 'idle' | 'correct' | 'wrong';

const WRONG_CLEAR_MS = 1200;
const TRANSITION_MS = 800;

interface Props { onComplete: () => void; }

export default function SplashScreen({ onComplete }: Props) {
  const setInitialInteractionDone = useGameStore(s => s.setInitialInteractionDone);
  const initialInteractionDone    = useGameStore(s => s.initialInteractionDone);
  const setScreen                 = useGameStore(s => s.setScreen);

  const [puzzle]                      = useState<SplashPuzzle>(generateSplashPuzzle);
  const [inputVal, setInputVal]       = useState<number | null>(null);
  const [inputState, setInputState]   = useState<InputState>('idle');
  const [exiting, setExiting]         = useState(false);
  // Same pattern as SudokuGrid: selected position + Set of flashing cell keys
  const [selectedPos, setSelectedPos] = useState({ row: 4, col: 4 });
  const [flashCells, setFlashCells]   = useState<Set<string>>(new Set());

  const wrongTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioInited = useRef(false);

  const ensureAudioInited = useCallback(() => {
    if (audioInited.current || initialInteractionDone) return;
    audioInited.current = true;
    initAudio();
    setInitialInteractionDone();
  }, [initialInteractionDone, setInitialInteractionDone]);

  // Value at any cross-cell position
  function getCellValue(r: number, c: number): number | null {
    if (r === 4 && c === 4) return inputVal;
    if (r === 4) return puzzle.rowCells[c];
    if (c === 4) return puzzle.colCells[r];
    return null;
  }

  const submitDigit = useCallback((digit: number) => {
    if (inputState === 'correct' || exiting) return;
    if (selectedPos.row !== 4 || selectedPos.col !== 4) return; // only centre cell accepts input
    ensureAudioInited();

    if (wrongTimer.current) clearTimeout(wrongTimer.current);

    if (digit === puzzle.answer) {
      setInputVal(digit);
      setInputState('correct');
      setSelectedPos({ row: 4, col: 4 });
      // Ripple flash outward from center — same stagger as SudokuGrid (Chebyshev dist * 120ms)
      const crossKeys: string[] = [];
      for (let c = 0; c < 9; c++) crossKeys.push(`4-${c}`);
      for (let r = 0; r < 9; r++) if (r !== 4) crossKeys.push(`${r}-4`);
      const byDist = new Map<number, string[]>();
      crossKeys.forEach(key => {
        const [kr, kc] = key.split('-').map(Number);
        const dist = Math.max(Math.abs(kr - 4), Math.abs(kc - 4));
        if (!byDist.has(dist)) byDist.set(dist, []);
        byDist.get(dist)!.push(key);
      });
      hapticRipple(Math.max(...byDist.keys()));
      byDist.forEach((keys, dist) => {
        setTimeout(() => {
          setFlashCells(prev => { const next = new Set(prev); keys.forEach(k => next.add(k)); return next; });
          setTimeout(() => {
            setFlashCells(prev => { const next = new Set(prev); keys.forEach(k => next.delete(k)); return next; });
          }, 400);
        }, dist * 120);
      });
    } else {
      setInputVal(digit);
      setInputState('wrong');
      wrongTimer.current = setTimeout(() => {
        setInputVal(null);
        setInputState('idle');
      }, WRONG_CLEAR_MS);
    }
  }, [puzzle.answer, inputState, exiting, ensureAudioInited, selectedPos]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (exiting) return;
      const d = parseInt(e.key, 10);
      if (d >= 1 && d <= 9) { submitDigit(d); return; }
      if (e.key === 'Enter' && inputState === 'correct') handleEnter();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitDigit, inputState, exiting]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleEnter() {
    if (inputState !== 'correct' || exiting) return;
    setExiting(true);
    ensureAudioInited();
    playLogoAndSelectMusic();
    setTimeout(onComplete, TRANSITION_MS);
  }

  useEffect(() => () => { if (wrongTimer.current) clearTimeout(wrongTimer.current); }, []);

  // ── Build 81 cells — same highlight/same-number logic as SudokuGrid ────────────
  const selVal = getCellValue(selectedPos.row, selectedPos.col);

  const cellEls: React.ReactNode[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const inCross  = r === 4 || c === 4;
      const isCenter = r === 4 && c === 4;

      if (!inCross) {
        cellEls.push(<div key={`${r}-${c}`} className="cell splash-hidden" />);
        continue;
      }

      const val      = getCellValue(r, c);
      const isGiven  = !isCenter; // all cross cells except center are givens
      const isSelected  = r === selectedPos.row && c === selectedPos.col;
      // Same formula as SudokuGrid
      const isHighlight = !isSelected && (
        r === selectedPos.row || c === selectedPos.col ||
        (Math.floor(r / 3) === Math.floor(selectedPos.row / 3) &&
         Math.floor(c / 3) === Math.floor(selectedPos.col / 3))
      );
      const isSameNumber      = !isSelected && selVal != null && val === selVal;
      const isCompletionFlash = flashCells.has(`${r}-${c}`);

      cellEls.push(
        <SudokuCell
          key={`${r}-${c}`}
          row={r} col={c} value={val}
          isGiven={isGiven}
          isCorrect={isCenter && inputState === 'correct'}
          isDanger={isCenter && inputState === 'wrong'}
          isSelected={isSelected}
          isHighlight={isHighlight}
          isSameNumber={isSameNumber}
          isCompletionFlash={isCompletionFlash}
          isBoxTop={r > 0 && r % 3 === 0}
          isBoxLeft={c > 0 && c % 3 === 0}
          isPreBoxRight={c === 2 || c === 5}
          isPreBoxBottom={r === 2 || r === 5}
          onPointerDown={(pr, pc) => {
            setSelectedPos({ row: pr, col: pc });
            ensureAudioInited();
          }}
        />
      );
    }
  }

  return (
    <div id="screen-splash" className={exiting ? 'exiting' : ''}>
      <div className="splash-main">
        <div id="splash-grid-wrap">
          <div id="splash-grid" className="sudoku-grid is-me">
            {cellEls}
          </div>
        </div>

        <div id="mobile-numpad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
            <div
              key={d}
              className="numpad-btn"
              onPointerDown={e => { e.preventDefault(); submitDigit(d); }}
            >
              {d}
            </div>
          ))}
        </div>

        <button
          className={`btn splash-enter-btn${inputState === 'correct' ? ' active' : ''}`}
          disabled={inputState !== 'correct'}
          onClick={handleEnter}
        >
          ENTER
        </button>
      </div>

      <h1 style={{ position:'absolute', width:'1px', height:'1px', overflow:'hidden', clip:'rect(0,0,0,0)', whiteSpace:'nowrap' }}>Sudoku Fighting</h1>
      <div className="screen-footer">
        <span className="screen-footer-tagline">Competitive Sudoku with fighting game combat</span>
        <span className="screen-footer-copy">{CREDITS.find(l => l.text?.startsWith('©'))?.text}</span>
        <button className="privacy-footer-link" onClick={() => setScreen('privacy')}>Privacy Policy</button>
      </div>
    </div>
  );
}
