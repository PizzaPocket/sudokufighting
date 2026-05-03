// AnimationController — direct port of frontend/js/animation.js to TypeScript
import { ANIMATION_CONFIG } from '@sudoku-fighting/shared';
import type { AnimationState } from '@sudoku-fighting/shared';

const _spriteCache = new Map<string, HTMLImageElement>();

export function preloadCharacterSprites(characterId: string) {
  for (const [animName, cfg] of Object.entries(ANIMATION_CONFIG)) {
    const srcName = cfg.srcOverride ?? animName;
    for (let f = 1; f <= cfg.frames; f++) {
      const src = `/characters/${characterId}/${srcName}_frame${f}.svg`;
      if (!_spriteCache.has(src)) {
        const img = new Image();
        img.src = src;
        _spriteCache.set(src, img);
      }
    }
  }
}

export class AnimationController {
  private characterId: string;
  private img: HTMLImageElement | null;
  private currentState: AnimationState | null = null;
  private currentFrame = 1;
  private frameTimer: ReturnType<typeof setTimeout> | null = null;
  private queued: AnimationState | null = null;
  private _lastSrc: string | null = null;
  private _paused = false;
  private _pendingResumeMs: number | null = null; // ms remaining on current frame when paused

  constructor(characterId: string, imgElement: HTMLImageElement | null) {
    this.characterId = characterId;
    this.img = imgElement;
  }

  setImage(img: HTMLImageElement) {
    this.img = img;
  }

  play(state: AnimationState, startFrame = 1) {
    const cfg = ANIMATION_CONFIG[state];
    if (!cfg) return;

    const currentCfg = this.currentState ? ANIMATION_CONFIG[this.currentState] : null;

    // KO is terminal
    if (this.currentState === 'ko') return;

    // Only interrupt if new priority >= current
    if (currentCfg && cfg.priority < currentCfg.priority) return;

    if (this.frameTimer) clearTimeout(this.frameTimer);
    this.currentState = state;
    this.currentFrame = Math.max(1, Math.min(startFrame, cfg.frames));
    this.queued = null;
    this._step();
  }

  queue(state: AnimationState) {
    this.queued = state;
  }

  private _step(overrideDuration?: number) {
    this._updateSrc();
    const cfg = this.currentState ? ANIMATION_CONFIG[this.currentState] : null;
    if (!cfg || !this.currentState) return;

    const duration = overrideDuration ?? cfg.frameDuration;
    const startedAt = Date.now();

    this.frameTimer = setTimeout(() => {
      if (this._paused) return; // timer fired while paused — _resume() will re-schedule
      this.currentFrame++;
      if (this.currentFrame > cfg.frames) {
        if (cfg.loop) {
          this.currentFrame = 1;
          this._step();
        } else if (cfg.freeze) {
          this.currentFrame = cfg.frames;
          this._updateSrc();
        } else {
          const next = this.queued ?? ('idle' as AnimationState);
          this.queued = null;
          this.currentState = null;
          this.play(next);
        }
        return;
      }
      this._step();
    }, duration);

    // Store when we started so pause() can calculate remaining time
    (this as any)._frameStartedAt = startedAt;
    (this as any)._frameDuration = duration;
  }

  pause() {
    if (this._paused) return;
    this._paused = true;
    if (this.frameTimer) {
      clearTimeout(this.frameTimer);
      this.frameTimer = null;
      const elapsed = Date.now() - ((this as any)._frameStartedAt ?? Date.now());
      const remaining = Math.max(0, ((this as any)._frameDuration ?? 0) - elapsed);
      this._pendingResumeMs = remaining;
    }
  }

  resume() {
    if (!this._paused) return;
    this._paused = false;
    const remaining = this._pendingResumeMs ?? 0;
    this._pendingResumeMs = null;
    this._step(remaining);
  }

  private _updateSrc() {
    const cfg = this.currentState ? ANIMATION_CONFIG[this.currentState] : null;
    const srcName = cfg?.srcOverride ?? this.currentState;
    const src = `/characters/${this.characterId}/${srcName}_frame${this.currentFrame}.svg`;
    if (this.img && this._lastSrc !== src) {
      this._lastSrc = src;
      this.img.src = src;
    }
  }

  stop() {
    if (this.frameTimer) clearTimeout(this.frameTimer);
    this.currentState = null;
  }

  reset(idleStartFrame = 1) {
    this.stop();
    this.queued = null;
    this.play('idle', idleStartFrame);
  }

  setCharacter(characterId: string) {
    this.characterId = characterId;
    this.reset();
  }
}
