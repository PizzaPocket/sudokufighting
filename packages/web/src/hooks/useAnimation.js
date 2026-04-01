// AnimationController — direct port of frontend/js/animation.js to TypeScript
import { ANIMATION_CONFIG } from '@sudoku-fighting/shared';
const _spriteCache = new Map();
export function preloadCharacterSprites(characterId) {
    for (const [animName, cfg] of Object.entries(ANIMATION_CONFIG)) {
        for (let f = 1; f <= cfg.frames; f++) {
            const src = `/characters/${characterId}/${animName}_frame${f}.svg`;
            if (!_spriteCache.has(src)) {
                const img = new Image();
                img.src = src;
                _spriteCache.set(src, img);
            }
        }
    }
}
export class AnimationController {
    characterId;
    img;
    currentState = null;
    currentFrame = 1;
    frameTimer = null;
    queued = null;
    _lastSrc = null;
    constructor(characterId, imgElement) {
        this.characterId = characterId;
        this.img = imgElement;
    }
    setImage(img) {
        this.img = img;
    }
    play(state, startFrame = 1) {
        const cfg = ANIMATION_CONFIG[state];
        if (!cfg)
            return;
        const currentCfg = this.currentState ? ANIMATION_CONFIG[this.currentState] : null;
        // KO is terminal
        if (this.currentState === 'ko')
            return;
        // Only interrupt if new priority >= current
        if (currentCfg && cfg.priority < currentCfg.priority)
            return;
        if (this.frameTimer)
            clearTimeout(this.frameTimer);
        this.currentState = state;
        this.currentFrame = Math.max(1, Math.min(startFrame, cfg.frames));
        this.queued = null;
        this._step();
    }
    queue(state) {
        this.queued = state;
    }
    _step() {
        this._updateSrc();
        const cfg = this.currentState ? ANIMATION_CONFIG[this.currentState] : null;
        if (!cfg || !this.currentState)
            return;
        const state = this.currentState;
        this.frameTimer = setTimeout(() => {
            this.currentFrame++;
            if (this.currentFrame > cfg.frames) {
                if (cfg.loop) {
                    this.currentFrame = 1;
                    this._step();
                }
                else if (cfg.freeze) {
                    this.currentFrame = cfg.frames;
                    this._updateSrc();
                }
                else {
                    const next = this.queued ?? 'idle';
                    this.queued = null;
                    this.currentState = null;
                    this.play(next);
                }
                return;
            }
            this._step();
        }, cfg.frameDuration);
    }
    _updateSrc() {
        const src = `/characters/${this.characterId}/${this.currentState}_frame${this.currentFrame}.svg`;
        if (this.img && this._lastSrc !== src) {
            this._lastSrc = src;
            this.img.src = src;
        }
    }
    stop() {
        if (this.frameTimer)
            clearTimeout(this.frameTimer);
        this.currentState = null;
    }
    reset() {
        this.stop();
        this.queued = null;
        this.play('idle');
    }
    setCharacter(characterId) {
        this.characterId = characterId;
        this.reset();
    }
}
