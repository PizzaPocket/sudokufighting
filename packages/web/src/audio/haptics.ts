import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import type { AttackType } from '@sudoku-fighting/shared';

const isNative = Capacitor.isNativePlatform();
let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean) { hapticsEnabled = enabled; }

function impact(style: ImpactStyle) {
  if (!isNative || !hapticsEnabled) return;
  Haptics.impact({ style }).catch(() => {});
}

function vibrate(duration: number) {
  if (!isNative || !hapticsEnabled) return;
  Haptics.vibrate({ duration }).catch(() => {});
}

function delayed(fn: () => void, ms: number) {
  if (ms <= 0) { fn(); return; }
  setTimeout(fn, ms);
}

// Frame at which impact lands, per special (must match SPECIAL_HIT_FRAME in audioManager)
const SPECIAL_HIT_MS: Partial<Record<AttackType, number>> = {
  row_special:     120,  // frame 2 → 1 × 120ms
  column_special:  240,  // frame 3 → 2 × 120ms
  subgrid_special: 240,
};

export function hapticHit(heavy: boolean) {
  if (!isNative) return;
  // Red flash appears on frame 2 of damage_light (150ms) and frame 3 of damage_heavy (300ms)
  const ms = heavy ? 300 : 150;
  delayed(() => impact(heavy ? ImpactStyle.Heavy : ImpactStyle.Medium), ms);
}

export function hapticCorrectCell() {
  if (!isNative) return;
  impact(ImpactStyle.Light);
}

export function hapticWrongCell() {
  if (!isNative) return;
  Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
}

// Staggered light taps mirroring the visual ripple (120ms per wave, matching CSS).
// waveCount = max Chebyshev distance in the ripple's byDist map.
export function hapticRipple(waveCount: number) {
  if (!isNative) return;
  for (let wave = 0; wave <= waveCount; wave++) {
    delayed(() => impact(wave === 0 ? ImpactStyle.Medium : ImpactStyle.Light), wave * 120);
  }
}

export function hapticAttack(type: AttackType, leadMs = 0) {
  if (!isNative) return;

  switch (type) {
    case 'punch':
      // Single sharp tap on impact
      delayed(() => impact(ImpactStyle.Medium), leadMs);
      break;

    case 'kick':
      // Heavier single thud on impact
      delayed(() => impact(ImpactStyle.Heavy), leadMs);
      break;

    case 'row_special':
    case 'column_special':
    case 'subgrid_special': {
      // Short buzz as the special winds up, then heavy thud on hit frame
      delayed(() => vibrate(30), leadMs);
      const hitMs = SPECIAL_HIT_MS[type] ?? 120;
      delayed(() => impact(ImpactStyle.Heavy), hitMs);
      break;
    }

    default:
      delayed(() => impact(ImpactStyle.Light), leadMs);
  }
}
