// ---------------------------------------------------------------------------
// Campaign Dialogue Data
// ---------------------------------------------------------------------------
// Keyed by character IDs (fighter1, fighter1_alt, etc.)
// Character name → ID mapping:
//   Xiao Long = fighter1    Brace   = fighter1_alt
//   Chuck     = fighter2    Nun     = fighter2_alt
//   Jonathan  = fighter3    Johan   = fighter3_alt
//   Senna     = fighter4    Ninja S = fighter4_alt
//   Boombox   = fighter5    Icebox  = fighter5_alt

export interface DialogueEntry {
  speakerName: string;
  portraitPath: string;
  lines: string[];
  /** Arena bg.svg to show behind the speaker. null = solid black. */
  backgroundSrc: string | null;
}

// ---------------------------------------------------------------------------
// Master Chow intro — keyed by player character ID
// ---------------------------------------------------------------------------

export const MASTER_CHOW_INTRO: Record<string, string[]> = {
  fighter1: [
    "Xiao Long, the time has come.",
    "Travel the world and face the greatest Sudoku Fighters.",
    "Show them the strength of your discipline.",
  ],
  fighter1_alt: [
    "Brace, your path is less certain.",
    "Travel the world and face the greatest Sudoku Fighters.",
    "Let your instincts guide you, but do not lose yourself.",
  ],
  fighter2: [
    "Chuck, your spirit carries you far.",
    "Travel the world and face the greatest Sudoku Fighters.",
    "Perhaps now you will learn when to be serious.",
  ],
  fighter2_alt: [
    "Nun, you have chosen a quieter path.",
    "Travel the world and face the greatest Sudoku Fighters.",
    "Let silence sharpen your mind.",
  ],
  fighter3: [
    "Jonathan, your confidence shines brightly.",
    "Travel the world and face the greatest Sudoku Fighters.",
    "Now prove that your strength matches your ambition.",
  ],
  fighter3_alt: [
    "Johan, you stand as a champion already.",
    "Travel the world and face the greatest Sudoku Fighters.",
    "Show them why you deserve that title.",
  ],
  fighter4: [
    "Senna, you fight with raw instinct.",
    "Travel the world and face the greatest Sudoku Fighters.",
    "Now learn to control the chaos within you.",
  ],
  fighter4_alt: [
    "Ninja S, your discipline is precise.",
    "Travel the world and face the greatest Sudoku Fighters.",
    "Let no movement be wasted.",
  ],
  fighter5: [
    "Boombox, you walk your own path now.",
    "Travel the world and face the greatest Sudoku Fighters.",
    "Show them you are more than what you were made to be.",
  ],
  fighter5_alt: [
    "Icebox, your focus is unwavering.",
    "Travel the world and face the greatest Sudoku Fighters.",
    "Let nothing distract you from your purpose.",
  ],
};

// ---------------------------------------------------------------------------
// Match dialogue — MATCH_DIALOGUE[playerCharId][opponentCharId]
// The opponent always speaks; the player never speaks.
// ---------------------------------------------------------------------------

export const MATCH_DIALOGUE: Record<string, Record<string, { speaker: string; lines: string[] }>> = {

  // ── Playing as Xiao Long (fighter1) ──────────────────────────────────────
  fighter1: {
    fighter1_alt: { speaker: 'Brace', lines: [
      "You cling too tightly to control.",
      "Sometimes you have to let go and trust yourself.",
    ]},
    fighter2: { speaker: 'Chuck', lines: [
      "You look like you're carrying the whole world on your shoulders.",
      "Relax a little, yeah? This is meant to be fun.",
    ]},
    fighter2_alt: { speaker: 'Nun', lines: [
      "You move with discipline, but there is tension in you.",
      "Silence alone will not bring you balance.",
    ]},
    fighter3: { speaker: 'Jonathan', lines: [
      "You are steady and focused, I will give you that.",
      "Let's see how you handle real pressure.",
    ]},
    fighter3_alt: { speaker: 'Johan', lines: [
      "You aim to be perfect, don't you?",
      "Let's see if you can live up to that.",
    ]},
    fighter4: { speaker: 'Senna', lines: [
      "You move like everything is planned out in advance.",
      "Let's see how you handle someone unpredictable.",
    ]},
    fighter4_alt: { speaker: 'Ninja S', lines: [
      "Your movements are precise, almost too precise.",
      "I will find the gap you are hiding.",
    ]},
    fighter5: { speaker: 'Boombox', lines: [
      "You fight like someone who has trained their whole life.",
      "I wonder what happens when that training is pushed too far.",
    ]},
    fighter5_alt: { speaker: 'Icebox', lines: [
      "You've shut everything down inside yourself.",
      "Let's see if anything is still there beneath the surface.",
    ]},
  },

  // ── Playing as Brace (fighter1_alt) ──────────────────────────────────────
  fighter1_alt: {
    fighter1: { speaker: 'Xiao Long', lines: [
      "You're still holding back, even now.",
      "Let go for once and see what happens.",
    ]},
    fighter2: { speaker: 'Chuck', lines: [
      "You take everything a bit too lightly.",
      "Let's see if you can keep smiling after this.",
    ]},
    fighter2_alt: { speaker: 'Nun', lines: [
      "All that quiet discipline, and yet you still feel stuck.",
      "Maybe you need to break your own rules.",
    ]},
    fighter3: { speaker: 'Jonathan', lines: [
      "Confidence is easy when things go your way.",
      "Let's see how you handle a little chaos.",
    ]},
    fighter3_alt: { speaker: 'Johan', lines: [
      "You call yourself the perfect version, yeah?",
      "Sounds a bit boring if you ask me.",
    ]},
    fighter4: { speaker: 'Senna', lines: [
      "Now you're more my style.",
      "Don't hold back, I won't.",
    ]},
    fighter4_alt: { speaker: 'Ninja S', lines: [
      "You're wound up way too tight.",
      "Try loosening up before you snap.",
    ]},
    fighter5: { speaker: 'Boombox', lines: [
      "Hey mate, now that's some proper strength.",
      "Let's make this a good one.",
    ]},
    fighter5_alt: { speaker: 'Icebox', lines: [
      "You're cold as ice, but also stiff as a board.",
      "I'll shake you out of that.",
    ]},
  },

  // ── Playing as Chuck (fighter2) ───────────────────────────────────────────
  fighter2: {
    fighter1: { speaker: 'Xiao Long', lines: [
      "You rely too much on jokes and distractions.",
      "Focus yourself, or this will end quickly.",
    ]},
    fighter1_alt: { speaker: 'Brace', lines: [
      "You think letting go makes you stronger.",
      "It only makes you careless.",
    ]},
    fighter2_alt: { speaker: 'Nun', lines: [
      "You hide behind laughter instead of facing yourself.",
      "It is time you stood still.",
    ]},
    fighter3: { speaker: 'Jonathan', lines: [
      "This is not a game, no matter how you treat it.",
      "Keep up, or fall behind.",
    ]},
    fighter3_alt: { speaker: 'Johan', lines: [
      "You aim high, but your footing is unstable.",
      "I will show you the difference.",
    ]},
    fighter4: { speaker: 'Senna', lines: [
      "You smile now, but you will not for long.",
      "I do not go easy on anyone.",
    ]},
    fighter4_alt: { speaker: 'Ninja S', lines: [
      "Your movements lack discipline and structure.",
      "I will correct that.",
    ]},
    fighter5: { speaker: 'Boombox', lines: [
      "You are loud, reckless, and unfocused.",
      "I will meet you with greater force.",
    ]},
    fighter5_alt: { speaker: 'Icebox', lines: [
      "You cast aside emotion, but not your flaws.",
      "That will cost you.",
    ]},
  },

  // ── Playing as Nun (fighter2_alt) ─────────────────────────────────────────
  fighter2_alt: {
    fighter1: { speaker: 'Xiao Long', lines: [
      "Your discipline is admirable, but it is incomplete.",
      "You have not yet found stillness.",
    ]},
    fighter1_alt: { speaker: 'Brace', lines: [
      "You chase freedom without understanding it.",
      "Control is not your enemy.",
    ]},
    fighter2: { speaker: 'Chuck', lines: [
      "Your laughter is constant, but it is empty.",
      "Be still and listen to yourself.",
    ]},
    fighter3: { speaker: 'Jonathan', lines: [
      "Your confidence creates noise within you.",
      "Silence would serve you better.",
    ]},
    fighter3_alt: { speaker: 'Johan', lines: [
      "You present yourself as perfection.",
      "But perfection requires stillness.",
    ]},
    fighter4: { speaker: 'Senna', lines: [
      "Your chaos is inefficient and unfocused.",
      "It must be corrected.",
    ]},
    fighter4_alt: { speaker: 'Ninja S', lines: [
      "You are close to clarity.",
      "But you have not reached it.",
    ]},
    fighter5: { speaker: 'Boombox', lines: [
      "You rely on force and instinct alone, mate.",
      "You lack inner calm.",
    ]},
    fighter5_alt: { speaker: 'Icebox', lines: [
      "You remove emotion, yet something remains.",
      "You have not fully let go.",
    ]},
  },

  // ── Playing as Jonathan (fighter3) ───────────────────────────────────────
  fighter3: {
    fighter1: { speaker: 'Xiao Long', lines: [
      "Your control is impressive, but it feels rigid.",
      "Let's see how it holds under pressure.",
    ]},
    fighter1_alt: { speaker: 'Brace', lines: [
      "You abandon control too easily.",
      "That will be your downfall.",
    ]},
    fighter2: { speaker: 'Chuck', lines: [
      "You rely on charm instead of discipline.",
      "That will not carry you far here.",
    ]},
    fighter2_alt: { speaker: 'Nun', lines: [
      "Silence alone does not make you strong.",
      "You still need presence.",
    ]},
    fighter3_alt: { speaker: 'Johan', lines: [
      "You look like me, but sharper somehow.",
      "I suppose I'll have to prove which one is better.",
    ]},
    fighter4: { speaker: 'Senna', lines: [
      "You fight like you have nothing to lose.",
      "That makes you dangerous, but predictable.",
    ]},
    fighter4_alt: { speaker: 'Ninja S', lines: [
      "Your precision is impressive.",
      "Let's see how you handle pressure.",
    ]},
    fighter5: { speaker: 'Boombox', lines: [
      "Raw power, huh? I like that.",
      "But can you control it under fire?",
    ]},
    fighter5_alt: { speaker: 'Icebox', lines: [
      "You've stripped everything down to pure focus.",
      "Let's see if that's enough.",
    ]},
  },

  // ── Playing as Johan (fighter3_alt) ──────────────────────────────────────
  fighter3_alt: {
    fighter1: { speaker: 'Xiao Long', lines: [
      "Your control is solid, but it lacks refinement.",
      "There is still another level beyond you.",
    ]},
    fighter1_alt: { speaker: 'Brace', lines: [
      "You mistake chaos for freedom.",
      "It only reveals your limits.",
    ]},
    fighter2: { speaker: 'Chuck', lines: [
      "You are careless where you should be precise.",
      "That will not suffice.",
    ]},
    fighter2_alt: { speaker: 'Nun', lines: [
      "You approach stillness, but do not embody it.",
      "There is more to achieve.",
    ]},
    fighter3: { speaker: 'Jonathan', lines: [
      "You strive to become something greater.",
      "I am already there.",
    ]},
    fighter4: { speaker: 'Senna', lines: [
      "Your movements are unrefined and scattered.",
      "I will bring them to an end.",
    ]},
    fighter4_alt: { speaker: 'Ninja S', lines: [
      "You are efficient, which I respect.",
      "But efficiency is only the beginning.",
    ]},
    fighter5: { speaker: 'Boombox', lines: [
      "You possess great strength, but lack polish, mate.",
      "That is your weakness.",
    ]},
    fighter5_alt: { speaker: 'Icebox', lines: [
      "You remove emotion, but not imperfection.",
      "I will expose it.",
    ]},
  },

  // ── Playing as Senna (fighter4) ───────────────────────────────────────────
  fighter4: {
    fighter1: { speaker: 'Xiao Long', lines: [
      "You move like everything's planned out ahead of time.",
      "Let's see what happens when things get messy.",
    ]},
    fighter1_alt: { speaker: 'Brace', lines: [
      "Now that's more like it.",
      "Let's see how far you can push it.",
    ]},
    fighter2: { speaker: 'Chuck', lines: [
      "You joke too much for someone in a fight.",
      "I'll wipe that grin off your face.",
    ]},
    fighter2_alt: { speaker: 'Nun', lines: [
      "All that quiet focus, but you still feel tense.",
      "You're not as calm as you think.",
    ]},
    fighter3: { speaker: 'Jonathan', lines: [
      "You look good when everything goes your way.",
      "Let's see how you handle pressure.",
    ]},
    fighter3_alt: { speaker: 'Johan', lines: [
      "You think you're perfect or something?",
      "I'd like to see that crack.",
    ]},
    fighter4_alt: { speaker: 'Ninja S', lines: [
      "You're the version of me that never hesitates.",
      "Let's see which one wins.",
    ]},
    fighter5: { speaker: 'Boombox', lines: [
      "Big, loud, and strong.",
      "Yeah, I've taken down worse.",
    ]},
    fighter5_alt: { speaker: 'Icebox', lines: [
      "You feel… empty.",
      "Let's see if I can shake something loose.",
    ]},
  },

  // ── Playing as Ninja S (fighter4_alt) ────────────────────────────────────
  fighter4_alt: {
    fighter1: { speaker: 'Xiao Long', lines: [
      "Your form is rigid and predictable.",
      "I will dismantle it.",
    ]},
    fighter1_alt: { speaker: 'Brace', lines: [
      "You lack discipline and structure.",
      "You will fall quickly.",
    ]},
    fighter2: { speaker: 'Chuck', lines: [
      "Your noise and movement are inefficient.",
      "I will silence both.",
    ]},
    fighter2_alt: { speaker: 'Nun', lines: [
      "You approach control, but lack execution.",
      "I will surpass you.",
    ]},
    fighter3: { speaker: 'Jonathan', lines: [
      "Your patterns are visible and exploitable.",
      "I have already adapted.",
    ]},
    fighter3_alt: { speaker: 'Johan', lines: [
      "You are efficient, but not optimal.",
      "I will prove the difference.",
    ]},
    fighter4: { speaker: 'Senna', lines: [
      "You hesitate where I do not.",
      "That is why I will win.",
    ]},
    fighter5: { speaker: 'Boombox', lines: [
      "How ya' goin'? If strength and instinct carries you,",
      "Both can be countered.",
    ]},
    fighter5_alt: { speaker: 'Icebox', lines: [
      "Your logic is sound.",
      "We will test its limits.",
    ]},
  },

  // ── Playing as Boombox (fighter5) ────────────────────────────────────────
  fighter5: {
    fighter1: { speaker: 'Xiao Long', lines: [
      "You've got that calm, disciplined thing going on.",
      "Let's see how long it holds up under pressure.",
    ]},
    fighter1_alt: { speaker: 'Brace', lines: [
      "You fight loose, I like that.",
      "Let's see if you can back it up.",
    ]},
    fighter2: { speaker: 'Chuck', lines: [
      "You're having a good time, aren't you?",
      "Let's see if you're still smiling after this.",
    ]},
    fighter2_alt: { speaker: 'Nun', lines: [
      "You're quiet, but there's something going on under that.",
      "I'll dig it out.",
    ]},
    fighter3: { speaker: 'Jonathan', lines: [
      "You've got confidence for days.",
      "Hope you've got the strength to match it.",
    ]},
    fighter3_alt: { speaker: 'Johan', lines: [
      "You reckon you're the finished product, yeah?",
      "Let's test that theory.",
    ]},
    fighter4: { speaker: 'Senna', lines: [
      "Scrappy fighter, I respect that.",
      "Let's see how you handle real power.",
    ]},
    fighter4_alt: { speaker: 'Ninja S', lines: [
      "You're sharp and precise.",
      "This'll be a good one.",
    ]},
    fighter5_alt: { speaker: 'Icebox', lines: [
      "You've gone all cold on me, huh?",
      "Let's see which version comes out on top.",
    ]},
  },

  // ── Playing as Icebox (fighter5_alt) ────────────────────────────────────
  fighter5_alt: {
    fighter1: { speaker: 'Xiao Long', lines: [
      "You rely on discipline to guide you.",
      "I will test how far that can take you.",
    ]},
    fighter1_alt: { speaker: 'Brace', lines: [
      "You act on instinct without restraint.",
      "That makes you predictable.",
    ]},
    fighter2: { speaker: 'Chuck', lines: [
      "You mask your intent behind humor.",
      "It will not protect you.",
    ]},
    fighter2_alt: { speaker: 'Nun', lines: [
      "You pursue stillness and control.",
      "You are closer than most.",
    ]},
    fighter3: { speaker: 'Jonathan', lines: [
      "Your confidence is evident.",
      "It will be evaluated.",
    ]},
    fighter3_alt: { speaker: 'Johan', lines: [
      "You strive for perfection.",
      "I will measure the result.",
    ]},
    fighter4: { speaker: 'Senna', lines: [
      "Your movements are erratic.",
      "I will impose order.",
    ]},
    fighter4_alt: { speaker: 'Ninja S', lines: [
      "Your efficiency is acceptable.",
      "We will determine superiority.",
    ]},
    fighter5: { speaker: 'Boombox', lines: [
      "Hey mate, you look familiar.",
      "Let's throw a shrimp on this barbie",
    ]},
  },
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export function getMatchDialogue(
  playerCharId: string,
  opponentCharId: string,
): { speaker: string; lines: string[] } | null {
  return MATCH_DIALOGUE[playerCharId]?.[opponentCharId] ?? null;
}
