// Client-side game orchestrator
import { connect, disconnect, send, on, off } from './ws.js';
import { AnimationController, ANIM } from './animation.js';
import { startFightMusic, fadeOutMusic, preloadAllTracks, playAudioLogoThenSelectMusic, playRoundAnnouncer, playFightAnnouncer, playKOAnnouncer, playTKOAnnouncer, playVictoryAnnouncer, playDevastationAnnouncer, playAttackSFX, setMusicEnabled, setSfxEnabled, TRACKS, getSelectedTrackIndex, setTrackIndex } from './audio.js';
import { ARENAS, getArena } from './arenas.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  myPlayerId: null,
  mySeat: null,
  myCharacter: null,
  myName: null,
  opponentName: null,
  opponentCharacter: null,
  roundNumber: 1,
  health: [100, 100],
  combo: [0, 0],
  score: [0, 0],
  roundWins: [0, 0],
  mySolution: null,
  myPuzzle: null,          // [[number|null]] given clues — null means editable (wiped givens too)
  myGrid: null,            // [[number|null]] working copy
  opponentGivens: null,
  opponentGrid: null,
  selectedCell: null,
  lastCorrectCell: null,
  opponentCursorPos: null,
  lastSentCursor: null,
  myUseAlt: false,
  opponentUseAlt: false,
  counterWindowActive: false,
  pendingCounterAttackType: null,
  roundOver: false,
  matchOver: false,
  characters: [],
  animP1: null,
  animP2: null,
  // Flow state
  gameMode: null,           // 'quick' | 'friend'
  shareCode: null,          // invite code shown in lobby
  pendingJoinCode: null,    // code from URL param or input, used after char select
  friendCreating: false,    // true when this player is the room creator
  initialInteractionDone: false,
  opponentDisconnected: false,
};

// Round timer
let roundTimerInterval = null;

// Sunset fade + sun sink — run continuously from match start regardless of round pauses
// Max match duration from startBgFade() (called at FIGHT!, ~5s after round-1 game_start):
//   Round 1 remaining (~94s) + end-of-round overlay (~3s)
//   + Round 2 (99s) + end-of-round overlay (~3s)
//   + Round 3 (99s)  = ~298s
const MATCH_FADE_DURATION_MS = 298_000;
let matchStartTime = null;
let bgFadeInterval = null;
let sunInitialY = null; // px from top of viewport when animation started

function startBgFade() {
  if (!matchStartTime) matchStartTime = Date.now();
  if (bgFadeInterval) return; // already running

  // Pin sun initial Y now (image has CSS-defined size so getBoundingClientRect is reliable)
  const sunEndEl = document.getElementById('sun-end');
  if (sunEndEl?.classList.contains('active') && sunInitialY === null) {
    const rect = sunEndEl.getBoundingClientRect();
    sunInitialY = (window.innerHeight - rect.height) / 2;
    sunEndEl.style.top = sunInitialY + 'px';
    const sunStartEl = document.getElementById('sun-start');
    if (sunStartEl?.classList.contains('active')) sunStartEl.style.top = sunInitialY + 'px';
  }

  bgFadeInterval = setInterval(() => {
    const elapsed = Date.now() - matchStartTime;

    // Fade arena-bg-overlay (used by arenas with bgFadeOverlay)
    const overlay = document.getElementById('arena-bg-overlay');
    if (overlay?.classList.contains('active')) {
      overlay.style.opacity = Math.max(0, 1 - elapsed / MATCH_FADE_DURATION_MS);
    }

    // Fade + sink sun layers
    const sunEndEl = document.getElementById('sun-end');
    const sunStartEl = document.getElementById('sun-start');
    if (sunEndEl?.classList.contains('active') && sunInitialY !== null) {
      const sinkPx = Math.floor(elapsed / 1000);
      const y = sunInitialY + sinkPx;
      sunEndEl.style.top = y + 'px';
      if (sunStartEl?.classList.contains('active')) {
        sunStartEl.style.top = y + 'px';
        sunStartEl.style.opacity = Math.max(0, 1 - elapsed / MATCH_FADE_DURATION_MS);
      }
    }
  }, 250);
}

function stopBgFade() {
  clearInterval(bgFadeInterval);
  bgFadeInterval = null;
}

function resetBgFade() {
  stopBgFade();
  matchStartTime = null;
  sunInitialY = null;

  const overlay = document.getElementById('arena-bg-overlay');
  if (overlay) overlay.style.opacity = 1;

  const sunEndEl = document.getElementById('sun-end');
  const sunStartEl = document.getElementById('sun-start');
  if (sunStartEl) sunStartEl.style.opacity = 1;
  if (sunEndEl?.classList.contains('active')) {
    const rect = sunEndEl.getBoundingClientRect();
    const y = (window.innerHeight - rect.height) / 2;
    sunEndEl.style.top = y + 'px';
    if (sunStartEl?.classList.contains('active')) sunStartEl.style.top = y + 'px';
  }
}

// Delay (ms) before health bar updates, coordinated with the damage animation frame
// punch → frame 2 of DAMAGE_LIGHT (150ms), kick/special → frame 3 of DAMAGE_HEAVY (300ms)
let healthUpdateDelay = 150;

// ---------------------------------------------------------------------------
// Screen management
// ---------------------------------------------------------------------------

let currentScreen = 'start';

function showScreen(id) {
  currentScreen = id;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`screen-${id}`);
  if (el) el.classList.add('active');
  const backBtn = document.getElementById('btn-back');
  if (backBtn) backBtn.classList.toggle('hidden', id !== 'lobby' && id !== 'character-select');
  if (id === 'character-select') triggerCharacterSelectAnim();
}

function triggerCharacterSelectAnim() {
  const screen = document.getElementById('screen-character-select');
  screen.classList.remove('cards-ready');
  void screen.offsetWidth;
  screen.classList.add('cards-ready');
  const cards = [...screen.querySelectorAll('.character-card')];
  const subtitle = screen.querySelector('.subtitle');
  const cleanAnim = (el, delay) => {
    el.style.opacity = '0';
    el.style.animationDelay = delay;
    el.classList.remove('card-intro');
    void el.offsetWidth;
    el.classList.add('card-intro');
    el.addEventListener('animationend', () => {
      el.classList.remove('card-intro');
      el.style.opacity = '1';
    }, { once: true });
  };
  if (subtitle) cleanAnim(subtitle, '0s');
  cards.forEach((card, i) => cleanAnim(card, `${i * 0.07}s`));
}

function onInitialInteraction() {
  if (state.initialInteractionDone) return;
  state.initialInteractionDone = true;
  playAudioLogoThenSelectMusic();
  renderTrackTitle();
}

// ---------------------------------------------------------------------------
// Game overlay (Round X / FIGHT! / KO / VICTORY)
// ---------------------------------------------------------------------------

let overlayTimer = null;

function showOverlay(mainText, subText, color, durationMs, subColor) {
  const overlay = document.getElementById('game-overlay');
  const mainEl = document.getElementById('game-overlay-main');
  const subEl = document.getElementById('game-overlay-sub');
  if (!overlay) return;

  clearTimeout(overlayTimer);

  // Re-trigger animation by replacing element clone
  if (mainEl) {
    mainEl.textContent = mainText;
    mainEl.style.color = color || '';
    mainEl.style.textShadow = '';
    // Force re-animation
    mainEl.classList.remove('pop-in');
    void mainEl.offsetWidth;
    mainEl.style.animation = 'none';
    void mainEl.offsetWidth;
    mainEl.style.animation = '';
  }
  if (subEl) {
    subEl.textContent = subText || '';
    subEl.style.color = subColor || '';
  }
  overlay.classList.remove('hidden');

  if (durationMs) {
    overlayTimer = setTimeout(hideOverlay, durationMs);
  }
}

function hideOverlay() {
  const overlay = document.getElementById('game-overlay');
  if (overlay) overlay.classList.add('hidden');
}

// ---------------------------------------------------------------------------
// Round timer countdown
// ---------------------------------------------------------------------------

function startRoundTimer(roundStartTime) {
  clearInterval(roundTimerInterval);
  const endTime = roundStartTime + 99000;
  const timerEl = document.getElementById('round-timer');

  function tick() {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    if (timerEl) {
      timerEl.textContent = String(remaining).padStart(2, '0');
      timerEl.classList.toggle('urgent', remaining <= 10);
    }
    if (remaining === 0) clearInterval(roundTimerInterval);
  }

  tick();
  roundTimerInterval = setInterval(tick, 250);
}

function stopRoundTimer() {
  clearInterval(roundTimerInterval);
  roundTimerInterval = null;
}

// ---------------------------------------------------------------------------
// Character loading + backgrounds
// ---------------------------------------------------------------------------

async function loadCharacters() {
  preloadAllTracks();
  try {
    const res = await fetch('/characters/characters.json?v=' + Date.now());
    state.characters = await res.json();
  } catch {
    state.characters = [
      { id: 'fighter1', name: 'Xiao Long', portraitPath: '/characters/fighter1/portrait.png' },
      { id: 'fighter2', name: 'Chuck',     portraitPath: '/characters/fighter2/portrait.png' },
    ];
  }
  renderCharacterSelect();
}

function applyBackground(backgroundId) {
  if (!backgroundId) return;
  const arena = getArena(backgroundId);
  if (!arena) return;

  // Background image on the screen element
  const screenEl = document.getElementById('screen-gameplay');
  if (screenEl) screenEl.style.backgroundImage = `url(${arena.background})`;

  // Ground asset
  const groundEl = document.getElementById('fight-ground');
  if (groundEl) groundEl.src = arena.ground;

  // Fade overlay (bgFadeOverlay path — kept for non-sun arenas)
  const bgOverlayEl = document.getElementById('arena-bg-overlay');
  if (bgOverlayEl) {
    if (arena.bgFadeOverlay) {
      bgOverlayEl.style.backgroundImage = `url(${arena.bgFadeOverlay})`;
      bgOverlayEl.classList.add('active');
    } else {
      bgOverlayEl.classList.remove('active');
      bgOverlayEl.style.backgroundImage = '';
    }
  }

  // Sun layers (sunset_end is always visible, sunset_start fades out)
  const sunEndEl = document.getElementById('sun-end');
  const sunStartEl = document.getElementById('sun-start');
  if (sunEndEl) {
    if (arena.sunEnd) {
      sunEndEl.src = arena.sunEnd;
      sunEndEl.classList.add('active');
    } else {
      sunEndEl.classList.remove('active');
      sunEndEl.src = '';
    }
  }
  if (sunStartEl) {
    if (arena.sunStart) {
      sunStartEl.src = arena.sunStart;
      sunStartEl.classList.add('active');
      // Only reset opacity/position if the animation hasn't started yet
      if (sunInitialY === null) sunStartEl.style.opacity = 1;
    } else {
      sunStartEl.classList.remove('active');
      sunStartEl.src = '';
    }
  }
  // Position suns at vertical centre only before the animation has started
  if (sunInitialY === null && sunEndEl?.classList.contains('active')) {
    const rect = sunEndEl.getBoundingClientRect();
    const y = (window.innerHeight - rect.height) / 2;
    sunEndEl.style.top = y + 'px';
    if (sunStartEl?.classList.contains('active')) sunStartEl.style.top = y + 'px';
  }

  // Overlays — show only those belonging to this arena, hide all others
  const allOverlayIds = new Set(ARENAS.flatMap(a => a.overlays.map(o => o.id)));
  const arenaOverlayIds = new Set(arena.overlays.map(o => o.id));
  allOverlayIds.forEach(id => {
    const overlayEl = document.getElementById(id);
    if (!overlayEl) return;
    const overlay = arena.overlays.find(o => o.id === id);
    if (arenaOverlayIds.has(id)) {
      overlayEl.src = overlay.src;
      overlayEl.style.display = 'block';
    } else {
      overlayEl.style.display = 'none';
    }
  });
}

function renderCharacterSelect() {
  const grid = document.getElementById('character-grid');
  grid.innerHTML = '';

  // Preload all portrait images to prevent flash of unstyled content
  state.characters.forEach(char => { new Image().src = char.portraitPath; });

  state.characters.forEach((char) => {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.innerHTML = `<img src="${char.portraitPath}" alt="${char.name}" /><div class="char-name">${char.name}</div>`;
    card.addEventListener('click', () => {
      document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.myCharacter = char.id;
      proceedToLobby();
    });
    grid.appendChild(card);
  });
}

// ---------------------------------------------------------------------------
// Grid rendering
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Score display + floating points
// ---------------------------------------------------------------------------

const scoreAnimations = [null, null];

function updateScoreDisplay(seat, score) {
  const el = document.getElementById(seat === 0 ? 'p1-score' : 'p2-score');
  if (!el) return;

  if (scoreAnimations[seat]) {
    clearInterval(scoreAnimations[seat]);
    scoreAnimations[seat] = null;
  }

  const currentText = el.textContent.replace(/[^0-9]/g, '');
  let current = parseInt(currentText) || 0;

  if (current >= score) {
    el.textContent = score.toLocaleString() + ' PTS';
    return;
  }

  // Step size: always a multiple of 5, scales to finish in ~20 ticks
  const stepSize = Math.max(5, Math.ceil((score - current) / 20) * 5);
  scoreAnimations[seat] = setInterval(() => {
    current = Math.min(current + stepSize, score);
    el.textContent = current.toLocaleString() + ' PTS';
    if (current >= score) {
      clearInterval(scoreAnimations[seat]);
      scoreAnimations[seat] = null;
    }
  }, 25);
}

function showFloatingPoints(row, col, delta) {
  const gridId = state.mySeat === 0 ? 'p1-grid' : 'p2-grid';
  const cell = getCell(gridId, row, col);
  if (!cell) return;
  const rect = cell.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'floating-points';
  el.textContent = '+' + delta;
  el.style.left = (rect.left + rect.width / 2) + 'px';
  el.style.top = rect.top + 'px';
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

// ---------------------------------------------------------------------------
// Completion ripple animation
// ---------------------------------------------------------------------------

function animateCompletionRipple(gridId, cells, triggerRow, triggerCol) {
  cells.forEach(({ row, col }) => {
    const dist = Math.max(Math.abs(row - triggerRow), Math.abs(col - triggerCol));
    const cell = getCell(gridId, row, col);
    if (!cell) return;
    setTimeout(() => {
      cell.classList.add('completion-flash');
      cell.addEventListener('animationend', () => cell.classList.remove('completion-flash'), { once: true });
    }, dist * 120);
  });
}

function clientIsRowComplete(r) {
  if (!state.myGrid || !state.mySolution) return false;
  return state.myGrid[r].every((v, c) => v !== null && v !== 0 && v === state.mySolution[r][c]);
}
function clientIsColComplete(c) {
  if (!state.myGrid || !state.mySolution) return false;
  return state.myGrid.every((row, r) => row[c] !== null && row[c] !== 0 && row[c] === state.mySolution[r][c]);
}
function clientIsBoxComplete(boxRow, boxCol) {
  if (!state.myGrid || !state.mySolution) return false;
  for (let r = boxRow; r < boxRow + 3; r++)
    for (let c = boxCol; c < boxCol + 3; c++)
      if (state.myGrid[r][c] !== state.mySolution[r][c]) return false;
  return true;
}

// ---------------------------------------------------------------------------

// Apply position-based border classes. Row/col 0 are handled by the outer grid border.
function applyPositionClasses(cell, r, c) {
  if (r > 0 && r % 3 === 0) cell.classList.add('box-top');
  if (c > 0 && c % 3 === 0) cell.classList.add('box-left');
  if (c === 2 || c === 5)   cell.classList.add('pre-box-right');
  if (r === 2 || r === 5)   cell.classList.add('pre-box-bottom');
}

function buildGrid(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      applyPositionClasses(cell, r, c);
      container.appendChild(cell);
    }
  }
}

function getCell(gridId, row, col) {
  return document.querySelector(`#${gridId} .cell[data-row="${row}"][data-col="${col}"]`);
}

function updateMyGrid() {
  if (!state.myGrid) return;
  const gridId = state.mySeat === 0 ? 'p1-grid' : 'p2-grid';
  const sel = state.selectedCell;
  const selVal = sel ? (state.myGrid[sel.row]?.[sel.col] ?? null) : null;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = getCell(gridId, r, c);
      if (!cell) continue;
      const isGiven = state.myPuzzle[r][c] !== null;
      const val = state.myGrid[r][c];
      cell.innerHTML = val ? `<span>${val}</span>` : '';
      cell.className = 'cell';
      applyPositionClasses(cell, r, c);

      if (isGiven) {
        cell.classList.add('given');
      } else if (val !== null && val !== 0) {
        if (state.mySolution && state.mySolution[r][c] === val) {
          cell.classList.add('correct');
        } else {
          cell.classList.add('danger');
        }
      }

      // Row/col/box highlight
      if (sel && (
        r === sel.row || c === sel.col ||
        (Math.floor(r / 3) === Math.floor(sel.row / 3) && Math.floor(c / 3) === Math.floor(sel.col / 3))
      )) {
        cell.classList.add('highlight');
      }

      // Same-number highlight (slightly stronger, applied after highlight)
      if (sel && selVal && selVal !== 0 && val === selVal && !(r === sel.row && c === sel.col)) {
        cell.classList.add('same-number');
      }

      // Selected cell (applied last — strongest)
      if (sel?.row === r && sel?.col === c) {
        cell.classList.add('selected');
      }
    }
  }
}

function renderOpponentCell(gridId, r, c) {
  const cell = getCell(gridId, r, c);
  if (!cell) return;
  const isGiven = state.opponentGivens?.[r][c] !== null && state.opponentGivens?.[r][c] !== undefined;
  const val = state.opponentGrid[r][c];
  cell.innerHTML = val ? `<span>${val}</span>` : '';
  cell.className = 'cell readonly';
  applyPositionClasses(cell, r, c);
  if (isGiven && val !== null) {
    cell.classList.add('opponent-given');
  } else if (val !== null && val !== 0) {
    cell.classList.add('opponent-filled');
  }
  // Preserve cursor position across re-renders
  if (state.opponentCursorPos?.row === r && state.opponentCursorPos?.col === c) {
    cell.classList.add('opponent-cursor');
  }
}

function updateOpponentGrid() {
  if (!state.opponentGrid) return;
  const gridId = state.mySeat === 0 ? 'p2-grid' : 'p1-grid';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      renderOpponentCell(gridId, r, c);
    }
  }
}

function initGrids(puzzle, opponentGivens) {
  state.myPuzzle = puzzle.map(r => [...r]);
  state.myGrid = puzzle.map(r => r.map(v => v));
  state.opponentGivens = opponentGivens ? opponentGivens.map(r => [...r]) : null;
  state.opponentGrid = opponentGivens
    ? opponentGivens.map(r => r.map(v => v))
    : Array.from({ length: 9 }, () => Array(9).fill(null));

  const myGridId = state.mySeat === 0 ? 'p1-grid' : 'p2-grid';
  const oppGridId = state.mySeat === 0 ? 'p2-grid' : 'p1-grid';
  buildGrid(myGridId);
  buildGrid(oppGridId);

  updateMyGrid();
  updateOpponentGrid();

  const myGridEl = document.getElementById(myGridId);
  myGridEl.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    selectCell(row, col);
  });

  // Send live cursor position on hover so the opponent sees the pointer move
  myGridEl.addEventListener('mousemove', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    if (state.lastSentCursor?.row === row && state.lastSentCursor?.col === col) return;
    state.lastSentCursor = { row, col };
    send('cursor_move', { row, col });
  });
}

function selectCell(row, col) {
  state.selectedCell = { row, col };
  updateMyGrid();
  send('cursor_move', { row, col });
}

// ---------------------------------------------------------------------------
// Cell input
// ---------------------------------------------------------------------------

document.addEventListener('keydown', (e) => {
  // Arrow key navigation
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault();
    if (!state.selectedCell) return;
    let { row, col } = state.selectedCell;
    if (e.key === 'ArrowUp')    row = Math.max(0, row - 1);
    if (e.key === 'ArrowDown')  row = Math.min(8, row + 1);
    if (e.key === 'ArrowLeft')  col = Math.max(0, col - 1);
    if (e.key === 'ArrowRight') col = Math.min(8, col + 1);
    selectCell(row, col);
    return;
  }

  if (!state.selectedCell) return;
  if (state.roundOver) return;
  const { row, col } = state.selectedCell;

  const num = parseInt(e.key);
  if (num >= 1 && num <= 9) {
    if (state.myPuzzle?.[row]?.[col] !== null) return;
    // Don't re-send if cell is already correctly filled (prevents points farming)
    if (state.mySolution?.[row]?.[col] != null && state.myGrid?.[row]?.[col] === state.mySolution[row][col]) return;
    state.myGrid[row][col] = num;
    updateMyGrid();
    // Play damage animation immediately if wrong — don't wait for server round-trip
    if (state.mySolution && state.mySolution[row][col] !== num) {
      const myAnim = state.mySeat === 0 ? state.animP1 : state.animP2;
      myAnim?.play(ANIM.DAMAGE_LIGHT);
      flashAttack('self');
      state.selfDamagePredicted = true;
    }
    send('cell_input', { row, col, value: num });
  }

  if (e.key === 'Backspace' || e.key === 'Delete') {
    if (state.myPuzzle?.[row]?.[col] !== null) return;
    state.myGrid[row][col] = null;
    updateMyGrid();
  }
});

// ---------------------------------------------------------------------------
// Mobile number pad
// ---------------------------------------------------------------------------

document.getElementById('mobile-numpad').addEventListener('pointerdown', e => {
  e.preventDefault(); // fire instantly; suppresses the synthetic click that follows
  const btn = e.target.closest('.numpad-btn');
  if (!btn) return;
  if (!state.selectedCell || state.roundOver) return;
  const { row, col } = state.selectedCell;
  const value = parseInt(btn.dataset.value);

  if (value === 0) {
    // Clear
    if (state.myPuzzle?.[row]?.[col] !== null) return;
    state.myGrid[row][col] = null;
    updateMyGrid();
  } else {
    if (state.myPuzzle?.[row]?.[col] !== null) return;
    if (state.mySolution?.[row]?.[col] != null && state.myGrid?.[row]?.[col] === state.mySolution[row][col]) return;
    state.myGrid[row][col] = value;
    updateMyGrid();
    if (state.mySolution && state.mySolution[row][col] !== value) {
      const myAnim = state.mySeat === 0 ? state.animP1 : state.animP2;
      myAnim?.play(ANIM.DAMAGE_LIGHT);
      flashAttack('self');
      state.selfDamagePredicted = true;
    }
    send('cell_input', { row, col, value });
  }
});

// ---------------------------------------------------------------------------
// Health bars
// ---------------------------------------------------------------------------

const MAX_HEALTH = 1800;

function updateHealthBar(seat, hp) {
  const barId = seat === 0 ? 'p1-health-bar' : 'p2-health-bar';
  const bar = document.getElementById(barId);
  if (!bar) return;
  const pct = Math.max(0, Math.min(100, (hp / MAX_HEALTH) * 100));
  bar.style.width = pct + '%';
  bar.classList.remove('mid', 'low');
  if (pct <= 30) bar.classList.add('low');
  else if (pct <= 60) bar.classList.add('mid');
}

function updateCombo(seat, combo) {
  const id = seat === 0 ? 'p1-combo' : 'p2-combo';
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = combo > 1 ? `${combo}x COMBO!` : '';
}

// ---------------------------------------------------------------------------
// Wipe animations — clears ALL cells including givens
// ---------------------------------------------------------------------------

function applyWipeToCell(targetSeat, gridId, r, c) {
  const cell = getCell(gridId, r, c);
  if (!cell) return;
  cell.classList.add('wiping');
  setTimeout(() => {
    if (targetSeat !== state.mySeat) {
      if (state.opponentGrid) state.opponentGrid[r][c] = null;
      renderOpponentCell(gridId, r, c);
    } else {
      // Clear from working grid AND mark given as wiped (editable)
      if (state.myGrid) state.myGrid[r][c] = null;
      if (state.myPuzzle) state.myPuzzle[r][c] = null; // given becomes editable
      updateMyGrid();
    }
  }, 400);
}

function wipeRow(targetSeat, row) {
  const gridId = targetSeat === 0 ? 'p1-grid' : 'p2-grid';
  for (let c = 0; c < 9; c++) applyWipeToCell(targetSeat, gridId, row, c);
}

function wipeCol(targetSeat, col) {
  const gridId = targetSeat === 0 ? 'p1-grid' : 'p2-grid';
  for (let r = 0; r < 9; r++) applyWipeToCell(targetSeat, gridId, r, col);
}

function wipeBox(targetSeat, boxRow, boxCol) {
  const gridId = targetSeat === 0 ? 'p1-grid' : 'p2-grid';
  for (let r = boxRow; r < boxRow + 3; r++)
    for (let c = boxCol; c < boxCol + 3; c++)
      applyWipeToCell(targetSeat, gridId, r, c);
}

// ---------------------------------------------------------------------------
// Attacker z-index boost — lifts attacker above defender during strike
// ---------------------------------------------------------------------------

let attackingZTimer = null;

function liftAttacker(attackerSeat) {
  clearTimeout(attackingZTimer);
  const p1Wrap = document.getElementById('p1-char-wrap');
  const p2Wrap = document.getElementById('p2-char-wrap');
  const attackerWrap = attackerSeat === 0 ? p1Wrap : p2Wrap;
  const defenderWrap = attackerSeat === 0 ? p2Wrap : p1Wrap;
  attackerWrap?.classList.add('attacking');
  defenderWrap?.classList.remove('attacking');
  // Hold for longest animation (subgrid_special = 5 frames × 120ms = 600ms)
  attackingZTimer = setTimeout(() => {
    attackerWrap?.classList.remove('attacking');
  }, 700);
}

// ---------------------------------------------------------------------------
// Attack flash overlay
// ---------------------------------------------------------------------------

function flashAttack(type) {
  const flash = document.getElementById('attack-flash');
  if (!flash) return;
  flash.className = 'attack-flash';
  const isHeavy = ['row_special','column_special','subgrid_special'].includes(type);
  flash.classList.add(isHeavy ? 'heavy-flash' : 'punch-flash');
  flash.addEventListener('animationend', () => {
    flash.className = 'attack-flash hidden';
  }, { once: true });
}

// ---------------------------------------------------------------------------
// Pre-round sequence — shows on gameplay screen as overlay
// ---------------------------------------------------------------------------

function showPreRound(roundNum, backgroundId) {
  showScreen('gameplay');
  applyBackground(backgroundId);
  showOverlay(`ROUND ${roundNum}`, '', '', 0);
  playRoundAnnouncer(roundNum);

  setTimeout(() => {
    showOverlay('FIGHT!', '', '#dc2626', 0);
    document.getElementById('game-overlay-main').style.textShadow = '4px 5px 0 #FF8B16';
    playFightAnnouncer();
    if (roundNum === 1) { startFightMusic(backgroundId).then(() => renderTrackTitle()); startBgFade(); }
    setTimeout(hideOverlay, 1000);
  }, 2000);
}

// ---------------------------------------------------------------------------
// WebSocket event handlers
// ---------------------------------------------------------------------------

const ANIM_MAP = {
  punch: ANIM.PUNCH, kick: ANIM.KICK,
  row_special: ANIM.ROW_SPECIAL, column_special: ANIM.COLUMN_SPECIAL, subgrid_special: ANIM.SUBGRID_SPECIAL,
};

on('connected', () => {});

on('waiting_for_opponent', ({ shareCode }) => {
  // Re-send arena preference now that socket is confirmed open
  send('set_arena_preference', { arenaId: state.preferredArenaId });
  if (shareCode) {
    state.shareCode = shareCode;
    document.getElementById('lobby-share-code').textContent = shareCode;
    document.getElementById('lobby-share-section').classList.remove('hidden');
  }
});

on('room_assigned', () => {});

function updateLobbySlot(seat, portraitPath, name, isReady) {
  const slotId = seat === 0 ? 'lobby-p1' : 'lobby-p2';
  const portraitEl = document.getElementById(seat === 0 ? 'lobby-p1-portrait' : 'lobby-p2-portrait');
  const nameEl = document.getElementById(seat === 0 ? 'lobby-p1-name' : 'lobby-p2-name');
  const statusEl = document.querySelector(`#${slotId} .lobby-status`);
  if (portraitEl && portraitPath) portraitEl.src = portraitPath;
  if (nameEl) nameEl.textContent = name.toUpperCase();
  if (statusEl) { statusEl.textContent = isReady ? 'READY' : 'WAITING...'; statusEl.className = `lobby-status ${isReady ? 'ready' : 'waiting'}`; }
}

on('player_joined', ({ playerId, seat, name, characterId, useAlt }) => {
  state.myPlayerId = playerId;
  state.mySeat = seat;
  state.myName = name;
  state.myCharacter = characterId;
  state.myUseAlt = !!useAlt;
  const char = state.characters.find(c => c.id === characterId);
  const portrait = (useAlt && char?.altPortraitPath) ? char.altPortraitPath : char?.portraitPath;
  // If we're seat 1, clear the optimistic pre-fill from lobby-p1 and place us in lobby-p2
  if (seat === 1) {
    document.getElementById('lobby-p1-portrait').src = '/characters/placeholder_fighter.svg';
    document.getElementById('lobby-p1-name').textContent = '---';
    document.querySelector('#lobby-p1 .lobby-status').textContent = 'WAITING...';
    document.querySelector('#lobby-p1 .lobby-status').className = 'lobby-status waiting';
    document.getElementById('lobby-p1').classList.remove('is-me');
  }
  updateLobbySlot(seat, portrait, name, true);
  document.getElementById(seat === 0 ? 'lobby-p1' : 'lobby-p2')?.classList.add('is-me');
  document.getElementById(seat === 0 ? 'p1-grid' : 'p2-grid')?.classList.add('is-me');
  document.getElementById(seat === 0 ? 'p1-panel' : 'p2-panel')?.classList.add('is-me');
});

on('opponent_joined', ({ name, characterId, useAlt }) => {
  state.opponentName = name;
  state.opponentCharacter = characterId;
  state.opponentUseAlt = !!useAlt;
  const char = state.characters.find(c => c.id === characterId);
  const portrait = (useAlt && char?.altPortraitPath) ? char.altPortraitPath : char?.portraitPath;
  updateLobbySlot(1 - state.mySeat, portrait, name, true);
  // Hide invite section — room is now full
  document.getElementById('lobby-share-section').classList.add('hidden');
});

on('game_start', ({ roundNumber, puzzle, solution, opponentGivens, opponentName, opponentCharacter, mySeat, myUseAlt, opponentUseAlt, roundStartTime, backgroundId }) => {
  // Sync arena carousel to the server-chosen arena
  const confirmedIndex = ARENAS.findIndex(a => a.id === backgroundId);
  if (confirmedIndex !== -1) {
    selectedArenaIndex = confirmedIndex;
    renderArenaTitle();
  }
  state.roundNumber = roundNumber;
  state.mySolution = solution;
  state.health = [MAX_HEALTH, MAX_HEALTH];
  state.combo = [0, 0];
  state.score = [0, 0];
  state.opponentCursorPos = null;
  state.lastCorrectCell = null;
  state.lastSentCursor = null;
  state.roundOver = false;
  updateScoreDisplay(0, 0);
  updateScoreDisplay(1, 0);

  if (mySeat !== undefined) state.mySeat = mySeat;
  if (opponentName) state.opponentName = opponentName;
  if (opponentCharacter) state.opponentCharacter = opponentCharacter;
  state.myUseAlt = !!myUseAlt;
  state.opponentUseAlt = !!opponentUseAlt;
  console.log('[game_start] mySeat:', state.mySeat, 'myUseAlt:', myUseAlt, 'opponentUseAlt:', opponentUseAlt, 'myChar:', state.myCharacter, 'oppChar:', state.opponentCharacter);

  // Which seat is which
  const p1UseAlt = state.mySeat === 0 ? state.myUseAlt : state.opponentUseAlt;
  const p2UseAlt = state.mySeat === 1 ? state.myUseAlt : state.opponentUseAlt;

  const p1CharId = state.mySeat === 0 ? state.myCharacter : state.opponentCharacter;
  const p2CharId = state.mySeat === 1 ? state.myCharacter : state.opponentCharacter;
  const p1Char = state.characters.find(c => c.id === p1CharId);
  const p2Char = state.characters.find(c => c.id === p2CharId);

  // Resolve display names (alt name overrides when flagged)
  const p1Name = (p1UseAlt && p1Char?.altName) ? p1Char.altName
    : (state.mySeat === 0 ? state.myName : state.opponentName) ?? 'P1';
  const p2Name = (p2UseAlt && p2Char?.altName) ? p2Char.altName
    : (state.mySeat === 1 ? state.myName : state.opponentName) ?? 'P2';

  document.getElementById('p1-name').textContent = p1Name;
  document.getElementById('p2-name').textContent = p2Name;
  document.getElementById('round-indicator').textContent = `ROUND ${roundNumber}`;

  // Character sprites — use altId when flagged
  const p1AnimId = p1UseAlt ? (p1Char?.altId ?? p1CharId) : p1CharId;
  const p2AnimId = p2UseAlt ? (p2Char?.altId ?? p2CharId) : p2CharId;

  const p1Img = document.getElementById('p1-char-img');
  const p2Img = document.getElementById('p2-char-img');
  if (p1Img && p1Char) p1Img.src = `/characters/${p1AnimId}/idle_frame1.svg`;
  if (p2Img && p2Char) p2Img.src = `/characters/${p2AnimId}/idle_frame1.svg`;

  state.animP1?.stop();
  state.animP2?.stop();
  if (p1Img) state.animP1 = new AnimationController(p1AnimId, p1Img);
  if (p2Img) state.animP2 = new AnimationController(p2AnimId, p2Img);
  state.animP1?.play(ANIM.IDLE);
  state.animP2?.play(ANIM.IDLE, 3); // start P2 at frame 3 to offset idle cycle

  // Health bars
  updateHealthBar(0, MAX_HEALTH);
  updateHealthBar(1, MAX_HEALTH);
  updateCombo(0, 0);
  updateCombo(1, 0);

  initGrids(puzzle, opponentGivens);

  if (roundStartTime) startRoundTimer(roundStartTime);

  if (roundNumber === 1) {
    // Apply alt portrait/name in the lobby if this is a mirror match
    const myChar = state.characters.find(c => c.id === state.myCharacter);
    const oppChar = state.characters.find(c => c.id === state.opponentCharacter);
    if (state.myUseAlt && myChar) {
      const myLobbyName = myChar.altName ?? state.myName;
      updateLobbySlot(state.mySeat, myChar.altPortraitPath ?? myChar.portraitPath, myLobbyName, true);
    }
    if (state.opponentUseAlt && oppChar) {
      const oppLobbyName = oppChar.altName ?? state.opponentName;
      updateLobbySlot(1 - state.mySeat, oppChar.altPortraitPath ?? oppChar.portraitPath, oppLobbyName, true);
    }

    // 3-second countdown — arena carousel stays live so last selection wins
    const hint = document.querySelector('#screen-lobby .lobby-hint');
    let countdown = 3;
    if (hint) hint.textContent = `FIGHTERS READY (${countdown})`;
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        if (hint) hint.textContent = `FIGHTERS READY (${countdown})`;
      } else {
        clearInterval(countdownInterval);
        if (hint) hint.textContent = '';
      }
    }, 1000);

    // Fade music just before the transition, enter with whichever arena is showing
    setTimeout(() => fadeOutMusic(500), 2500);
    setTimeout(() => showPreRound(roundNumber, ARENAS[selectedArenaIndex].id), 3000);
  } else {
    // Subsequent rounds — music keeps playing, jump straight in
    showPreRound(roundNumber, backgroundId);
  }
});

on('cell_update', ({ seat, row, col, value, isCorrect }) => {
  if (seat !== state.mySeat) {
    if (state.opponentGrid) state.opponentGrid[row][col] = isCorrect ? value : null;
    const oppGridId = state.mySeat === 0 ? 'p2-grid' : 'p1-grid';
    renderOpponentCell(oppGridId, row, col);
  } else {
    if (state.myGrid) state.myGrid[row][col] = value;
    updateMyGrid();

    if (isCorrect) {
      state.lastCorrectCell = { row, col };
      const myGridId = state.mySeat === 0 ? 'p1-grid' : 'p2-grid';
      if (clientIsRowComplete(row)) {
        animateCompletionRipple(myGridId, Array.from({ length: 9 }, (_, c) => ({ row, col: c })), row, col);
      }
      if (clientIsColComplete(col)) {
        animateCompletionRipple(myGridId, Array.from({ length: 9 }, (_, r) => ({ row: r, col })), row, col);
      }
      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;
      if (clientIsBoxComplete(boxRow, boxCol)) {
        const boxCells = [];
        for (let r = boxRow; r < boxRow + 3; r++)
          for (let c = boxCol; c < boxCol + 3; c++)
            boxCells.push({ row: r, col: c });
        animateCompletionRipple(myGridId, boxCells, row, col);
      }
    }
  }
});

on('cursor_update', ({ seat, row, col }) => {
  if (seat === state.mySeat) return;
  state.opponentCursorPos = { row, col };
  const oppGridId = state.mySeat === 0 ? 'p2-grid' : 'p1-grid';
  document.querySelectorAll(`#${oppGridId} .opponent-cursor`).forEach(c => c.classList.remove('opponent-cursor'));
  const cell = getCell(oppGridId, row, col);
  if (cell) cell.classList.add('opponent-cursor');
});

on('attack_incoming', ({ attackerSeat, type, delayMs }) => {
  if (delayMs > 0) {
    // Store type so counter_landed can play the correct attack animation
    state.pendingCounterAttackType = type;
  } else {
    const attackerAnim = attackerSeat === 0 ? state.animP1 : state.animP2;
    const defenderAnim = attackerSeat === 0 ? state.animP2 : state.animP1;
    const defenderSeat = 1 - attackerSeat;
    const isHeavy = ['row_special','column_special','subgrid_special'].includes(type);
    liftAttacker(attackerSeat);
    attackerAnim?.play(ANIM_MAP[type] ?? ANIM.PUNCH);
    defenderAnim?.play(isHeavy ? ANIM.DAMAGE_HEAVY : ANIM.DAMAGE_LIGHT);
    if (defenderSeat === state.mySeat) flashAttack(type);
  }
});

on('attack_landed', ({ attackerSeat, defenderSeat, type }) => {
  const attackerAnim = attackerSeat === 0 ? state.animP1 : state.animP2;
  const defenderAnim = defenderSeat === 0 ? state.animP1 : state.animP2;
  const isHeavy = ['kick', 'row_special', 'column_special', 'subgrid_special'].includes(type);
  // Health bar will sync to frame 3 of DAMAGE_HEAVY (300ms) or frame 2 of DAMAGE_LIGHT (150ms)
  healthUpdateDelay = isHeavy ? 300 : 150;
  liftAttacker(attackerSeat);
  attackerAnim?.play(ANIM_MAP[type] ?? ANIM.PUNCH);
  defenderAnim?.play(isHeavy ? ANIM.DAMAGE_HEAVY : ANIM.DAMAGE_LIGHT);
  if (defenderSeat === state.mySeat) flashAttack(type);
  playAttackSFX(type);
});

on('counter_window_active', ({ defenderSeat }) => {
  if (defenderSeat === state.mySeat) state.counterWindowActive = true;
  const defenderAnim = defenderSeat === 0 ? state.animP1 : state.animP2;
  defenderAnim?.play(ANIM.BLOCK); // loops while counter window is open
});

on('counter_landed', ({ counterSeat }) => {
  state.counterWindowActive = false;

  const attackerSeat = 1 - counterSeat;
  const attackerAnim = attackerSeat === 0 ? state.animP1 : state.animP2;
  const counterAnim  = counterSeat  === 0 ? state.animP1 : state.animP2;

  const type = state.pendingCounterAttackType ?? 'punch';
  state.pendingCounterAttackType = null;
  const isHeavy = ['kick', 'row_special', 'column_special', 'subgrid_special'].includes(type);

  // Player A executes their attack; Player B is already looping BLOCK
  liftAttacker(attackerSeat);
  attackerAnim?.play(ANIM_MAP[type] ?? ANIM.PUNCH);
  playAttackSFX(type);

  // Player B's health updates at Player A's hit frame (no damage animation)
  healthUpdateDelay = isHeavy ? 300 : 100;

  // After 2 BLOCK frames (400ms), Player B throws the counter punch
  setTimeout(() => {
    counterAnim?.play(ANIM.PUNCH);
    playAttackSFX('punch');
  }, 400);
});

on('self_damage', ({ seat }) => {
  if (seat === state.mySeat && state.selfDamagePredicted) {
    state.selfDamagePredicted = false;
    return; // animation + flash already played optimistically on keydown
  }
  const anim = seat === 0 ? state.animP1 : state.animP2;
  anim?.play(ANIM.DAMAGE_LIGHT);
  if (seat === state.mySeat) flashAttack('self');
});

on('health_update', ({ health }) => {
  state.health = health;
  const delay = healthUpdateDelay;
  healthUpdateDelay = 150; // reset to default
  setTimeout(() => {
    for (let seat = 0; seat < 2; seat++) {
      updateHealthBar(seat, health[seat]);
    }
  }, delay);
});

on('combo_update', ({ seat, combo }) => {
  state.combo[seat] = combo;
  updateCombo(seat, combo);
});

on('score_update', ({ seat, score }) => {
  const prev = state.score[seat];
  state.score[seat] = score;
  updateScoreDisplay(seat, score);
  if (seat === state.mySeat && score > prev && state.lastCorrectCell) {
    showFloatingPoints(state.lastCorrectCell.row, state.lastCorrectCell.col, score - prev);
  }
});

on('row_wiped', ({ targetSeat, row }) => { wipeRow(targetSeat, row); });
on('column_wiped', ({ targetSeat, col }) => { wipeCol(targetSeat, col); });
on('box_wiped', ({ targetSeat, boxRow, boxCol }) => { wipeBox(targetSeat, boxRow, boxCol); });

on('time_up', () => {
  stopRoundTimer();
  const timerEl = document.getElementById('round-timer');
  if (timerEl) { timerEl.textContent = '00'; timerEl.classList.add('urgent'); }
});

on('round_end', ({ winnerSeat, roundWins }) => {
  state.roundWins = roundWins;
  state.counterWindowActive = false;
  state.roundOver = true;
  stopRoundTimer();

  if (winnerSeat === -1) {
    // Tie round — both stay in idle
    state.animP1?.play(ANIM.IDLE);
    state.animP2?.play(ANIM.IDLE);
    setTimeout(() => {
      showOverlay('TIE', "IT'S A TIE", '#8B49FF', 0);
      setTimeout(() => {
        if (state.matchOver) return;
        hideOverlay();
        send('next_round', {});
      }, 2500);
    }, 400);
    return;
  }

  const winnerAnim = winnerSeat === 0 ? state.animP1 : state.animP2;
  const loserAnim  = winnerSeat === 0 ? state.animP2 : state.animP1;

  winnerAnim?.play(ANIM.WIN);
  // Wait for the loser's damage animation to finish before KO fall
  loserAnim?.queue(ANIM.KO);
  // Fallback for TKO/timeout where only idle (a loop) is playing — queue never fires
  setTimeout(() => {
    if (loserAnim?.currentState !== ANIM.KO) loserAnim?.play(ANIM.KO);
  }, 500);

  const loserSeat = 1 - winnerSeat;
  const isTrueKO = state.health[loserSeat] <= 0;
  const mainText = isTrueKO ? 'KO' : 'TKO';
  const mainColor = '#F00013';
  const wName = winnerSeat === state.mySeat ? state.myName : state.opponentName;
  const subText = (wName ?? 'Player').toUpperCase() + ' WINS!';

  setTimeout(() => {
    if (isTrueKO) playKOAnnouncer(); else playTKOAnnouncer();
    showOverlay(mainText, subText, mainColor, 0);
    setTimeout(() => {
      if (state.matchOver) return;
      hideOverlay();
      send('next_round', {});
    }, 2500);
  }, 400);
});

on('match_end', ({ winnerSeat, winnerName }) => {
  stopRoundTimer();
  stopBgFade(); // pause in place — don't reset
  state.roundOver = true;
  state.matchOver = true;
  document.getElementById('btn-surrender').classList.add('hidden');

  if (winnerSeat === -1) {
    // Tie match — both stay in idle
    state.animP1?.play(ANIM.IDLE);
    state.animP2?.play(ANIM.IDLE);
    setTimeout(() => {
      showOverlay('TIE', "IT'S A TIE", '#8B49FF', 0);
      document.getElementById('overlay-btn-row').classList.remove('hidden');
    }, 400);
    return;
  }

  const isWinner = winnerSeat === state.mySeat;
  if (!state.opponentDisconnected) {
    if (isWinner) playVictoryAnnouncer(); else playDevastationAnnouncer();
  }

  const winnerCharId = winnerSeat === state.mySeat ? state.myCharacter : state.opponentCharacter;
  const winnerChar = state.characters.find(c => c.id === winnerCharId);
  const winnerUseAlt = winnerSeat === state.mySeat ? state.myUseAlt : state.opponentUseAlt;
  const winnerAnimId = winnerUseAlt ? (winnerChar?.altId ?? winnerCharId) : winnerCharId;
  const winnerDisplayName = (winnerUseAlt && winnerChar?.altName)
    ? winnerChar.altName
    : (winnerName ?? 'Unknown');

  // Ensure winner plays WIN loop; loser stays frozen on KO frame 2
  if (winnerSeat === 0) {
    state.animP1 = new AnimationController(winnerAnimId, document.getElementById('p1-char-img'));
    state.animP1.play(ANIM.WIN);
  } else {
    state.animP2 = new AnimationController(winnerAnimId, document.getElementById('p2-char-img'));
    state.animP2.play(ANIM.WIN);
  }

  const mainText = isWinner ? 'VICTORY!' : 'DEVASTATION!';
  const mainColor = isWinner ? '#FF8B16' : '#F00013';
  const subText = state.opponentDisconnected
    ? 'OPPONENT DISCONNECTED'
    : winnerDisplayName.toUpperCase() + ' WINS!';
  state.opponentDisconnected = false;

  setTimeout(() => {
    if (isWinner) {
      showOverlay(mainText, subText, mainColor, 0, '#FFCA00');
      document.getElementById('game-overlay-main').style.textShadow = '4px 5px 0 #8B49FF';
    } else {
      showOverlay(mainText, subText, mainColor, 0);
      document.getElementById('game-overlay-main').style.textShadow = '4px 5px 0 #FF8B16';
    }
    document.getElementById('overlay-btn-row').classList.remove('hidden');
  }, 400);
});

on('opponent_disconnected', () => { state.opponentDisconnected = true; });

// ---------------------------------------------------------------------------
// UI wiring
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers: state reset + lobby UI reset
// ---------------------------------------------------------------------------

function resetLobbyUI() {
  document.getElementById('lobby-p1-portrait').src = '/characters/placeholder_fighter.svg';
  document.getElementById('lobby-p2-portrait').src = '/characters/placeholder_fighter.svg';
  document.getElementById('lobby-p1-name').textContent = '---';
  document.getElementById('lobby-p2-name').textContent = '---';
  ['#lobby-p1', '#lobby-p2'].forEach(sel => {
    document.querySelector(`${sel} .lobby-status`).className = 'lobby-status waiting';
    document.querySelector(`${sel} .lobby-status`).textContent = 'WAITING...';
    document.querySelector(sel).classList.remove('is-me');
  });
  document.getElementById('lobby-share-section').classList.add('hidden');
}

function resetGameState() {
  state.mySeat = null;
  state.myCharacter = null;
  state.myUseAlt = false;
  state.myName = null;
  state.opponentName = null;
  state.selectedCell = null;
  state.counterWindowActive = false;
  state.roundOver = false;
  state.matchOver = false;
  state.opponentDisconnected = false;
  state.health = [100, 100];
  state.roundWins = [0, 0];
  state.animP1 = null;
  state.animP2 = null;
  state.shareCode = null;
  stopRoundTimer();
  document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('btn-select-char').disabled = true;
  document.getElementById('btn-surrender').classList.remove('hidden');
}

// ---------------------------------------------------------------------------
// proceedToLobby — dispatches on gameMode
// ---------------------------------------------------------------------------

function proceedToLobby() {
  if (!state.myCharacter) return;
  const char = state.characters.find(c => c.id === state.myCharacter);
  const name = char?.name?.toUpperCase() ?? 'FIGHTER';
  state.myName = name;

  if (char) {
    document.getElementById('lobby-p1-portrait').src = char.portraitPath;
    document.getElementById('lobby-p1-name').textContent = name;
    document.querySelector('#lobby-p1 .lobby-status').className = 'lobby-status ready';
    document.querySelector('#lobby-p1 .lobby-status').textContent = 'READY';
    document.getElementById('lobby-p1').classList.add('is-me');
  }

  showScreen('lobby');

  if (state.gameMode === 'quick') {
    function sendFindMatch() {
      off('_connected', sendFindMatch);
      send('find_match', { characterId: state.myCharacter, name, preferredArenaId: state.preferredArenaId });
    }
    connect();
    on('_connected', sendFindMatch);

  } else if (state.gameMode === 'friend' && state.friendCreating) {
    function sendCreateRoom() {
      off('_connected', sendCreateRoom);
      send('create_room', { characterId: state.myCharacter, name });
    }
    connect();
    on('_connected', sendCreateRoom);

  } else if (state.gameMode === 'friend' && !state.friendCreating) {
    function sendJoinRoom() {
      off('_connected', sendJoinRoom);
      send('join_room', { shareCode: state.pendingJoinCode, characterId: state.myCharacter, name });
    }
    connect();
    on('_connected', sendJoinRoom);
  }
}

document.getElementById('btn-select-char').addEventListener('click', () => proceedToLobby());

// ---------------------------------------------------------------------------
// Start screen handlers + URL param
// ---------------------------------------------------------------------------

function readUrlRoomCode() {
  const params = new URLSearchParams(location.search);
  const code = params.get('room');
  if (code) {
    const input = document.getElementById('input-join-code');
    if (input) input.value = code.toUpperCase();
    state.pendingJoinCode = code.toUpperCase();
  }
}

function showStartError(msg) {
  const el = document.getElementById('start-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

document.getElementById('btn-quick-play').addEventListener('click', () => {
  onInitialInteraction();
  state.gameMode = 'quick';
  showScreen('character-select');
});

document.getElementById('btn-create-room').addEventListener('click', () => {
  onInitialInteraction();
  state.gameMode = 'friend';
  state.friendCreating = true;
  showScreen('character-select');
});

document.getElementById('btn-join-room').addEventListener('click', () => {
  const code = document.getElementById('input-join-code').value.trim().toUpperCase();
  if (!code || code.length < 4) return;
  state.pendingJoinCode = code;
  onInitialInteraction();
  state.gameMode = 'friend';
  state.friendCreating = false;
  showScreen('character-select');
});

// Allow pressing Enter in the join input to trigger join
document.getElementById('input-join-code').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-join-room').click();
});

// ---------------------------------------------------------------------------
// New WS event handlers (share codes, private rooms)
// ---------------------------------------------------------------------------

on('room_created', ({ shareCode }) => {
  state.shareCode = shareCode;
  document.getElementById('lobby-share-code').textContent = shareCode;
  document.getElementById('lobby-share-section').classList.remove('hidden');
});

on('room_not_found', () => {
  disconnect();
  showStartError('Room not found. Check the code and try again.');
  showScreen('start');
});

on('room_full', () => {
  disconnect();
  showStartError('That room is already full.');
  showScreen('start');
});

on('opponent_left_lobby', () => {
  document.getElementById('lobby-p2-portrait').src = '/characters/placeholder_fighter.svg';
  document.getElementById('lobby-p2-name').textContent = '---';
  document.querySelector('#lobby-p2 .lobby-status').className = 'lobby-status waiting';
  document.querySelector('#lobby-p2 .lobby-status').textContent = 'WAITING...';
  document.getElementById('lobby-p2').classList.remove('is-me');
  if (state.shareCode) document.getElementById('lobby-share-section').classList.remove('hidden');
});

document.getElementById('btn-copy-link').addEventListener('click', () => {
  const url = `${location.origin}?room=${state.shareCode}`;
  navigator.clipboard.writeText(url).then(() => {
    const c = document.getElementById('lobby-copy-confirm');
    c.classList.remove('hidden');
    setTimeout(() => c.classList.add('hidden'), 2000);
  }).catch(() => prompt('Copy this link:', url));
});

// ---------------------------------------------------------------------------
// Back button (context-aware)
// ---------------------------------------------------------------------------

document.getElementById('btn-back').addEventListener('click', () => {
  if (currentScreen === 'lobby') {
    disconnect();
    resetLobbyUI();
    state.myCharacter = null;
    state.myName = null;
    state.shareCode = null;
    document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('btn-select-char').disabled = true;
    showScreen('character-select');
  } else if (currentScreen === 'character-select') {
    showScreen('start');
  }
});

// ---------------------------------------------------------------------------
// Play Again + Leave
// ---------------------------------------------------------------------------

document.getElementById('btn-play-again').addEventListener('click', () => {
  hideOverlay();
  resetBgFade();
  document.getElementById('overlay-btn-row').classList.add('hidden');
  // Re-enter the same flow: friend mode re-creates a room after char select
  state.friendCreating = state.gameMode === 'friend';
  resetGameState();
  showScreen('character-select');
});

document.getElementById('btn-leave').addEventListener('click', () => {
  hideOverlay();
  resetBgFade();
  disconnect();
  document.getElementById('overlay-btn-row').classList.add('hidden');
  resetLobbyUI();
  resetGameState();
  state.gameMode = null;
  state.friendCreating = false;
  state.pendingJoinCode = null;
  showScreen('start');
});

// ---------------------------------------------------------------------------
// Settings panel
// ---------------------------------------------------------------------------

const settingsBtn   = document.getElementById('btn-settings');
const settingsPanel = document.getElementById('settings-panel');

function toggleSettings(e) {
  e.stopPropagation();
  settingsPanel.classList.toggle('hidden');
}

settingsBtn.addEventListener('click', toggleSettings);
document.getElementById('btn-settings-gameplay').addEventListener('click', toggleSettings);

document.getElementById('btn-surrender').addEventListener('click', () => {
  if (state.matchOver || state.roundOver) return;
  send('surrender', {});
});

document.addEventListener('click', () => settingsPanel.classList.add('hidden'));
settingsPanel.addEventListener('click', e => e.stopPropagation()); // keep panel open when clicking inside

// Track carousel
const trackTitleEl = document.getElementById('track-title');
function renderTrackTitle() {
  trackTitleEl.textContent = TRACKS[getSelectedTrackIndex()].title;
}
renderTrackTitle();

document.getElementById('track-prev').addEventListener('click', () => {
  setTrackIndex(getSelectedTrackIndex() - 1);
  renderTrackTitle();
});
document.getElementById('track-next').addEventListener('click', () => {
  setTrackIndex(getSelectedTrackIndex() + 1);
  renderTrackTitle();
});

// Arena carousel (lobby)
let selectedArenaIndex = 0;
const arenaTitleEl = document.getElementById('arena-title');

function renderArenaTitle() {
  arenaTitleEl.textContent = ARENAS[selectedArenaIndex].name;
}
renderArenaTitle();

function setArenaIndex(index) {
  selectedArenaIndex = ((index % ARENAS.length) + ARENAS.length) % ARENAS.length;
  state.preferredArenaId = ARENAS[selectedArenaIndex].id;
  renderArenaTitle();
  send('set_arena_preference', { arenaId: state.preferredArenaId });
}

document.getElementById('arena-prev').addEventListener('click', () => setArenaIndex(selectedArenaIndex - 1));
document.getElementById('arena-next').addEventListener('click', () => setArenaIndex(selectedArenaIndex + 1));

// preferredArenaId stays null until the user explicitly changes it,
// so an untouched default doesn't compete with the opponent's deliberate choice.
state.preferredArenaId = null;

document.getElementById('toggle-music').addEventListener('change', e => {
  setMusicEnabled(e.target.checked);
});

document.getElementById('toggle-sfx').addEventListener('change', e => {
  setSfxEnabled(e.target.checked);
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

readUrlRoomCode();
loadCharacters();
