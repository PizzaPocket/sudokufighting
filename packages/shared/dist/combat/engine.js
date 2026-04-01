// Pure combat engine — no server, no DOM, no UUID dependency.
// Used by the client for VS AI mode. The server uses its own copy in backend/game.js.
// Caller is responsible for scheduling attack timers and providing unique IDs.
import { WRONG_GUESS_DAMAGE, COUNTER_DAMAGE_TO_ATTACKER, ATTACK_DELAY_MS } from '../constants.js';
import { speedMultiplier, comboMultiplier, cellDamage, completionDamage } from './damage.js';
import { isRowComplete, isColComplete, isBoxComplete, isPuzzleComplete } from '../puzzle/validate.js';
import { wipeRow, wipeCol, wipeBox } from './wipe.js';
// Simple counter for generating unique attack IDs client-side
let _attackIdCounter = 0;
function nextAttackId() {
    return `atk_${++_attackIdCounter}_${Date.now()}`;
}
/**
 * Process a cell input from one player.
 * Returns an array of ServerMessage events (same shape as server broadcasts).
 * The caller must:
 *   1. Dispatch events into the game state immediately.
 *   2. For attack_incoming events: schedule a setTimeout(ATTACK_DELAY_MS) that
 *      calls applyDamageFromAttack() and dispatches the resulting events.
 */
export function handleCellInput(round, attackerSeat, row, col, value) {
    const defenderSeat = (1 - attackerSeat);
    const puzz = round.puzzles[attackerSeat];
    // Validate: given cells blocked unless wiped (playerGrid === null)
    if (puzz.given[row][col] !== null && puzz.playerGrid[row][col] !== null)
        return [];
    // Already correctly filled — ignore
    if (puzz.playerGrid[row][col] === puzz.solution[row][col])
        return [];
    // Same wrong value already in cell — don't penalise again
    if (puzz.playerGrid[row][col] === value && value !== puzz.solution[row][col])
        return [];
    const correct = puzz.solution[row][col] === value;
    puzz.playerGrid[row][col] = value;
    const events = [];
    events.push({ type: 'cell_update', payload: { seat: attackerSeat, row, col, value, isCorrect: correct } });
    if (!correct) {
        round.consecutiveCorrect[attackerSeat] = 0;
        round.combo[attackerSeat] = 0;
        round.health[attackerSeat] = Math.max(0, round.health[attackerSeat] - WRONG_GUESS_DAMAGE);
        events.push({ type: 'self_damage', payload: { seat: attackerSeat, damage: WRONG_GUESS_DAMAGE } });
        events.push({ type: 'health_update', payload: { health: [...round.health] } });
        events.push({ type: 'combo_update', payload: { seat: attackerSeat, combo: 0 } });
        return events;
    }
    // Correct — multipliers
    const now = Date.now();
    const elapsed = round.lastCorrectTime[attackerSeat] !== null
        ? now - round.lastCorrectTime[attackerSeat]
        : Infinity;
    round.lastCorrectTime[attackerSeat] = now;
    const speedMult = speedMultiplier(elapsed);
    const comboMult = comboMultiplier(round.combo[attackerSeat]);
    puzz.correctCount++;
    round.consecutiveCorrect[attackerSeat]++;
    const attackType = round.consecutiveCorrect[attackerSeat] % 3 === 0 ? 'kick' : 'punch';
    const dmg = cellDamage(speedMult, comboMult);
    round.score[attackerSeat] += dmg;
    round.combo[attackerSeat]++;
    events.push({ type: 'combo_update', payload: { seat: attackerSeat, combo: round.combo[attackerSeat] } });
    events.push({ type: 'score_update', payload: { seat: attackerSeat, score: round.score[attackerSeat] } });
    // Completions
    const completions = [];
    if (isRowComplete(puzz, row))
        completions.push({ kind: 'row', index: row });
    if (isColComplete(puzz, col))
        completions.push({ kind: 'col', index: col });
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    if (isBoxComplete(puzz, boxRow, boxCol))
        completions.push({ kind: 'box', boxRow, boxCol });
    let compAttackType = null;
    let compDmg = 0;
    if (completions.length > 0) {
        const n = completions.length;
        compDmg = completionDamage(n, speedMult, comboMult);
        round.score[attackerSeat] += compDmg;
        compAttackType = n === 1
            ? (completions[0].kind === 'row' ? 'row_special'
                : completions[0].kind === 'col' ? 'column_special'
                    : 'subgrid_special')
            : 'subgrid_special';
        events.push({ type: 'score_update', payload: { seat: attackerSeat, score: round.score[attackerSeat] } });
        const defPuzz = round.puzzles[defenderSeat];
        for (const comp of completions) {
            if (comp.kind === 'row') {
                wipeRow(defPuzz, comp.index);
                events.push({ type: 'row_wiped', payload: { targetSeat: defenderSeat, row: comp.index } });
            }
            else if (comp.kind === 'col') {
                wipeCol(defPuzz, comp.index);
                events.push({ type: 'column_wiped', payload: { targetSeat: defenderSeat, col: comp.index } });
            }
            else {
                wipeBox(defPuzz, comp.boxRow, comp.boxCol);
                events.push({ type: 'box_wiped', payload: { targetSeat: defenderSeat, boxRow: comp.boxRow, boxCol: comp.boxCol } });
            }
        }
    }
    // Auto-counter check
    const myWindow = round.counterWindows[attackerSeat];
    let didCounter = false;
    if (myWindow.active && myWindow.expiry !== null && Date.now() < myWindow.expiry) {
        const counterTarget = round.pendingAttacks.find(a => a.defenderSeat === attackerSeat && !a.counterUsed);
        if (counterTarget) {
            counterTarget.counterUsed = true;
            myWindow.active = false;
            events.push({ type: 'auto_counter', payload: { attackId: counterTarget.id } });
            didCounter = true;
        }
    }
    // Queue outgoing attack
    if (!didCounter) {
        const finalType = completions.length > 0 ? compAttackType : attackType;
        const finalDmg = completions.length > 0 ? compDmg : dmg;
        const attackId = nextAttackId();
        round.counterWindows[defenderSeat] = { active: true, expiry: now + ATTACK_DELAY_MS, attackId };
        round.pendingAttacks.push({ id: attackId, attackerSeat, defenderSeat, type: finalType, damage: finalDmg, counterUsed: false });
        events.push({ type: 'attack_incoming', payload: { attackerSeat, type: finalType, damage: finalDmg, attackId, delayMs: ATTACK_DELAY_MS } });
        events.push({ type: 'counter_window_active', payload: { defenderSeat, expiresAt: now + ATTACK_DELAY_MS, attackId } });
    }
    if (isPuzzleComplete(puzz)) {
        events.push({ type: 'puzzle_complete', payload: { seat: attackerSeat } });
    }
    return events;
}
export function applyDamageFromAttack(round, attackId) {
    const idx = round.pendingAttacks.findIndex(a => a.id === attackId);
    if (idx === -1)
        return null;
    const attack = round.pendingAttacks.splice(idx, 1)[0];
    if (attack.counterUsed)
        return null;
    round.health[attack.defenderSeat] = Math.max(0, round.health[attack.defenderSeat] - attack.damage);
    round.combo[attack.defenderSeat] = 0;
    round.counterWindows[attack.defenderSeat].active = false;
    const events = [
        { type: 'attack_landed', payload: { attackerSeat: attack.attackerSeat, defenderSeat: attack.defenderSeat, type: attack.type, damage: attack.damage } },
        { type: 'health_update', payload: { health: [...round.health] } },
        { type: 'combo_update', payload: { seat: attack.defenderSeat, combo: 0 } },
    ];
    return { events, attackType: attack.type, attackerSeat: attack.attackerSeat, defenderSeat: attack.defenderSeat };
}
export function applyCounterDamage(round, attackId) {
    const idx = round.pendingAttacks.findIndex(a => a.id === attackId);
    if (idx === -1)
        return null;
    const attack = round.pendingAttacks.splice(idx, 1)[0];
    const reducedDamage = Math.ceil(attack.damage * 0.5);
    round.health[attack.defenderSeat] = Math.max(0, round.health[attack.defenderSeat] - reducedDamage);
    round.health[attack.attackerSeat] = Math.max(0, round.health[attack.attackerSeat] - COUNTER_DAMAGE_TO_ATTACKER);
    round.combo[attack.attackerSeat] = 0;
    round.counterWindows[attack.defenderSeat].active = false;
    const counterSeat = attack.defenderSeat;
    const events = [
        { type: 'counter_landed', payload: { counterSeat, reducedDamage, counterDamage: COUNTER_DAMAGE_TO_ATTACKER } },
        { type: 'health_update', payload: { health: [...round.health] } },
        { type: 'combo_update', payload: { seat: attack.attackerSeat, combo: 0 } },
    ];
    return { events, counterSeat };
}
