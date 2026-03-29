// Animation state machine for pixel-art characters

export const ANIM = {
  IDLE:            'idle',
  PUNCH:           'punch',
  KICK:            'kick',
  ROW_SPECIAL:     'row_special',
  COLUMN_SPECIAL:  'column_special',
  SUBGRID_SPECIAL: 'subgrid_special',
  DAMAGE_LIGHT:    'damage_light',
  DAMAGE_HEAVY:    'damage_heavy',
  BLOCK:           'block',
  KO:              'ko',
  WIN:             'win',
};

const ANIMATION_CONFIG = {
  [ANIM.IDLE]:            { frames: 4, frameDuration: 200, loop: true,  priority: 1 },
  [ANIM.PUNCH]:           { frames: 3, frameDuration: 100, loop: false, priority: 3 },
  [ANIM.KICK]:            { frames: 4, frameDuration: 100, loop: false, priority: 3 },
  [ANIM.ROW_SPECIAL]:     { frames: 4, frameDuration: 120, loop: false, priority: 3 },
  [ANIM.COLUMN_SPECIAL]:  { frames: 4, frameDuration: 120, loop: false, priority: 3 },
  [ANIM.SUBGRID_SPECIAL]: { frames: 5, frameDuration: 120, loop: false, priority: 3 },
  [ANIM.DAMAGE_LIGHT]:    { frames: 2, frameDuration: 150, loop: false, priority: 3 },
  [ANIM.DAMAGE_HEAVY]:    { frames: 3, frameDuration: 150, loop: false, priority: 3 },
  [ANIM.BLOCK]:           { frames: 2, frameDuration: 200, loop: true,  priority: 2 },
  [ANIM.KO]:              { frames: 2, frameDuration: 400, loop: false, priority: 5, freeze: true },
  [ANIM.WIN]:             { frames: 2, frameDuration: 300, loop: true,  priority: 4 },
};

export class AnimationController {
  constructor(characterId, imgElement) {
    this.characterId = characterId;
    this.img = imgElement;
    this.currentState = null;
    this.currentFrame = 1;
    this.frameTimer = null;
    this.queued = null; // next one-shot to play after current finishes
  }

  play(state, startFrame = 1) {
    const cfg = ANIMATION_CONFIG[state];
    if (!cfg) return;

    const currentCfg = this.currentState ? ANIMATION_CONFIG[this.currentState] : null;

    // KO is terminal — nothing interrupts it
    if (this.currentState === ANIM.KO) return;

    // Only interrupt if new state has >= priority
    if (currentCfg && cfg.priority < currentCfg.priority) {
      return;
    }

    // If same or higher priority, interrupt
    clearTimeout(this.frameTimer);
    this.currentState = state;
    this.currentFrame = Math.max(1, Math.min(startFrame, cfg.frames));
    this.queued = null;
    this._step();
  }

  queue(state) {
    // Queue to play after current one-shot finishes
    this.queued = state;
  }

  _step() {
    this._updateSrc();
    const cfg = ANIMATION_CONFIG[this.currentState];
    if (!cfg) return;

    this.frameTimer = setTimeout(() => {
      this.currentFrame++;
      if (this.currentFrame > cfg.frames) {
        if (cfg.loop) {
          this.currentFrame = 1;
          this._step();
        } else if (cfg.freeze) {
          // Stay frozen on the last frame — don't advance, don't reset state
          this.currentFrame = cfg.frames;
          this._updateSrc();
        } else {
          // One-shot finished
          const next = this.queued ?? ANIM.IDLE;
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
    if (this.img && this.img.src !== src) {
      this.img.src = src;
    }
  }

  stop() {
    clearTimeout(this.frameTimer);
    this.currentState = null;
  }

  reset() {
    this.stop();
    this.queued = null;
    this.play(ANIM.IDLE);
  }
}
