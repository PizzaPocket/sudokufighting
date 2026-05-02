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
// ---------------------------------------------------------------------------
// Master Chow intro — keyed by player character ID
// ---------------------------------------------------------------------------
export const MASTER_CHOW_INTRO = {
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
export const MATCH_DIALOGUE = {
    // ── Playing as Xiao Long (fighter1) ──────────────────────────────────────
    fighter1: {
        fighter1_alt: { speaker: 'Brace', lines: [
                "You cling too tightly to control.",
                "Sometimes you have to let go and trust yourself.",
            ] },
        fighter2: { speaker: 'Chuck', lines: [
                "You look like you're carrying the whole world on your shoulders.",
                "Relax a little, yeah? This is meant to be fun.",
            ] },
        fighter2_alt: { speaker: 'Nun', lines: [
                "You move with discipline, but there is tension in you.",
                "Silence alone will not bring you balance.",
            ] },
        fighter3: { speaker: 'Jonathan', lines: [
                "Quiet and serious. You're not going to make this very entertaining.",
                "I suppose I'll have to carry the show for both of us.",
            ] },
        fighter3_alt: { speaker: 'Johan', lines: [
                "You aim to be perfect, don't you?",
                "Let's see if you can live up to that.",
            ] },
        fighter4: { speaker: 'Senna', lines: [
                "You move like everything is planned out in advance.",
                "Let's see how you handle someone unpredictable.",
            ] },
        fighter4_alt: { speaker: 'Ninja S', lines: [
                "Your movements are precise, almost too precise.",
                "I will find the gap you are hiding.",
            ] },
        fighter5: { speaker: 'Boombox', lines: [
                "You fight like someone who has trained their whole life.",
                "I wonder what happens when that training is pushed too far.",
            ] },
        fighter5_alt: { speaker: 'Icebox', lines: [
                "You've shut everything down inside yourself.",
                "Let's see if anything is still there beneath the surface.",
            ] },
    },
    // ── Playing as Brace (fighter1_alt) ──────────────────────────────────────
    fighter1_alt: {
        fighter1: { speaker: 'Xiao Long', lines: [
                "You've traded discipline for instinct.",
                "Let's see how that holds when it counts.",
            ] },
        fighter2: { speaker: 'Chuck', lines: [
                "No plan, no strategy, just going on vibes, yeah?",
                "Same approach I use, honestly. But I'm better at it.",
            ] },
        fighter2_alt: { speaker: 'Nun', lines: [
                "You move without thinking.",
                "Speed without direction only leads you in circles.",
            ] },
        fighter3: { speaker: 'Jonathan', lines: [
                "All energy, no craft. You fight like a rough draft.",
                "Let me show you how it's done properly.",
            ] },
        fighter3_alt: { speaker: 'Johan', lines: [
                "No structure, no refinement. Just instinct.",
                "I have already moved past that.",
            ] },
        fighter4: { speaker: 'Senna', lines: [
                "Now you're more my style.",
                "Don't hold back, I won't.",
            ] },
        fighter4_alt: { speaker: 'Ninja S', lines: [
                "All that loose energy with no direction.",
                "Precision will cut straight through it.",
            ] },
        fighter5: { speaker: 'Boombox', lines: [
                "Pure instinct, no map. Respect that, mate.",
                "Let's see how far it gets ya.",
            ] },
        fighter5_alt: { speaker: 'Icebox', lines: [
                "All impulse, no structure.",
                "I've already run this scenario.",
            ] },
    },
    // ── Playing as Chuck (fighter2) ───────────────────────────────────────────
    fighter2: {
        fighter1: { speaker: 'Xiao Long', lines: [
                "You rely too much on jokes and distractions.",
                "Focus yourself, or this will end quickly.",
            ] },
        fighter1_alt: { speaker: 'Brace', lines: [
                "You think letting go makes you stronger.",
                "It only makes you careless.",
            ] },
        fighter2_alt: { speaker: 'Nun', lines: [
                "You hide behind laughter instead of facing yourself.",
                "It is time you stood still.",
            ] },
        fighter3: { speaker: 'Jonathan', lines: [
                "This is not a game, no matter how you treat it.",
                "Keep up, or fall behind.",
            ] },
        fighter3_alt: { speaker: 'Johan', lines: [
                "Your lack of seriousness is a flaw, not a style.",
                "I will make sure you understand the difference.",
            ] },
        fighter4: { speaker: 'Senna', lines: [
                "You smile now, but you will not for long.",
                "I do not go easy on anyone.",
            ] },
        fighter4_alt: { speaker: 'Ninja S', lines: [
                "Your movements lack discipline and structure.",
                "I will correct that.",
            ] },
        fighter5: { speaker: 'Boombox', lines: [
                "All that energy and not a worry in the world, eh?",
                "Try to stay focused long enough to make it interesting.",
            ] },
        fighter5_alt: { speaker: 'Icebox', lines: [
                "Emotional, impulsive, unpredictable.",
                "I have already accounted for each of those variables.",
            ] },
    },
    // ── Playing as Nun (fighter2_alt) ─────────────────────────────────────────
    fighter2_alt: {
        fighter1: { speaker: 'Xiao Long', lines: [
                "Your quiet is real.",
                "I only wonder what it's protecting.",
            ] },
        fighter1_alt: { speaker: 'Brace', lines: [
                "All that stillness, and you call it strength?",
                "Sometimes you have to move to find the answer.",
            ] },
        fighter2: { speaker: 'Chuck', lines: [
                "You're the quietest person I've ever faced.",
                "Come on, lighten up! Even a little?",
            ] },
        fighter3: { speaker: 'Jonathan', lines: [
                "All that stillness and not a word. Confident, or just waiting?",
                "Either way, I don't lose to patience.",
            ] },
        fighter3_alt: { speaker: 'Johan', lines: [
                "Stillness is not a method.",
                "Perfection requires constant refinement, not waiting.",
            ] },
        fighter4: { speaker: 'Senna', lines: [
                "What is with all the quiet?! You're just standing there.",
                "I'll give you something to react to.",
            ] },
        fighter4_alt: { speaker: 'Ninja S', lines: [
                "Your stillness is controlled.",
                "But stillness without precision is only waiting.",
            ] },
        fighter5: { speaker: 'Boombox', lines: [
                "Blimey, you're quiet. Not even gonna say g'day?",
                "Fair enough. I'll let the game do the talking.",
            ] },
        fighter5_alt: { speaker: 'Icebox', lines: [
                "You have found quiet. But quiet is not the same as clarity.",
                "Something still persists within you.",
            ] },
    },
    // ── Playing as Jonathan (fighter3) ───────────────────────────────────────
    fighter3: {
        fighter1: { speaker: 'Xiao Long', lines: [
                "You treat this like a performance.",
                "Let's see if the substance matches the show.",
            ] },
        fighter1_alt: { speaker: 'Brace', lines: [
                "All that style and showmanship.",
                "I'm just here to fight.",
            ] },
        fighter2: { speaker: 'Chuck', lines: [
                "Pretty sure of yourself for someone who hasn't won yet, yeah?",
                "Let's find out if the confidence is actually earned.",
            ] },
        fighter2_alt: { speaker: 'Nun', lines: [
                "Your confidence fills the space before you arrive.",
                "That noise leaves nowhere for clarity to take root.",
            ] },
        fighter3_alt: { speaker: 'Johan', lines: [
                "You look like me, but sharper somehow.",
                "I suppose I'll have to prove which one is better.",
            ] },
        fighter4: { speaker: 'Senna', lines: [
                "All that confidence.",
                "Hope it holds when things get ugly.",
            ] },
        fighter4_alt: { speaker: 'Ninja S', lines: [
                "Your precision is impressive.",
                "Let's see how you handle pressure.",
            ] },
        fighter5: { speaker: 'Boombox', lines: [
                "Big entrance, nice hair. Love the commitment, mate.",
                "Hope the fight's as good as the show.",
            ] },
        fighter5_alt: { speaker: 'Icebox', lines: [
                "The presentation is noted.",
                "Now let's see what's underneath it.",
            ] },
    },
    // ── Playing as Johan (fighter3_alt) ──────────────────────────────────────
    fighter3_alt: {
        fighter1: { speaker: 'Xiao Long', lines: [
                "Your control is solid, but it lacks refinement.",
                "There is still another level beyond you.",
            ] },
        fighter1_alt: { speaker: 'Brace', lines: [
                "Everything so controlled, so refined.",
                "You've planned for everything except someone who doesn't bother.",
            ] },
        fighter2: { speaker: 'Chuck', lines: [
                "Everything about you is so polished and serious.",
                "Have you ever just... had fun with it?",
            ] },
        fighter2_alt: { speaker: 'Nun', lines: [
                "You have refined yourself endlessly.",
                "And yet you are still restless. What are you searching for?",
            ] },
        fighter3: { speaker: 'Jonathan', lines: [
                "You strive to become something greater.",
                "I am already there.",
            ] },
        fighter4: { speaker: 'Senna', lines: [
                "So polished it's almost boring.",
                "Let's put some scratches on that finish.",
            ] },
        fighter4_alt: { speaker: 'Ninja S', lines: [
                "You are efficient, which I respect.",
                "But efficiency is only the beginning.",
            ] },
        fighter5: { speaker: 'Boombox', lines: [
                "Every move calculated, every choice deliberate.",
                "Let's see if you've accounted for someone who doesn't do that.",
            ] },
        fighter5_alt: { speaker: 'Icebox', lines: [
                "You remove emotion, but not imperfection.",
                "I will expose it.",
            ] },
    },
    // ── Playing as Senna (fighter4) ───────────────────────────────────────────
    fighter4: {
        fighter1: { speaker: 'Xiao Long', lines: [
                "No pattern, no plan. Pure instinct.",
                "I have trained for this too.",
            ] },
        fighter1_alt: { speaker: 'Brace', lines: [
                "Now that's more like it.",
                "Let's see how far you can push it.",
            ] },
        fighter2: { speaker: 'Chuck', lines: [
                "Okay! You fight like you're angry at the whole world.",
                "I'm just here for a good time. Try not to take it personally?",
            ] },
        fighter2_alt: { speaker: 'Nun', lines: [
                "You move like a storm with no direction.",
                "That energy will exhaust you before it reaches me.",
            ] },
        fighter3: { speaker: 'Jonathan', lines: [
                "You look good when everything goes your way.",
                "Let's see how you handle pressure.",
            ] },
        fighter3_alt: { speaker: 'Johan', lines: [
                "Unpredictable is another word for untrained.",
                "I have no patience for it.",
            ] },
        fighter4_alt: { speaker: 'Ninja S', lines: [
                "You're the version of me that never hesitates.",
                "Let's see which one wins.",
            ] },
        fighter5: { speaker: 'Boombox', lines: [
                "Scrappy and quick. Credit where it's due.",
                "Still going down though.",
            ] },
        fighter5_alt: { speaker: 'Icebox', lines: [
                "Loud, emotional, chaotic.",
                "You're giving me a lot to work with.",
            ] },
    },
    // ── Playing as Ninja S (fighter4_alt) ────────────────────────────────────
    fighter4_alt: {
        fighter1: { speaker: 'Xiao Long', lines: [
                "Silent, precise, nothing wasted.",
                "Let's see whose training runs deeper.",
            ] },
        fighter1_alt: { speaker: 'Brace', lines: [
                "So precise, so controlled.",
                "Wonder what happens when you lose the script.",
            ] },
        fighter2: { speaker: 'Chuck', lines: [
                "You look like you've never laughed once in your life.",
                "That seems exhausting. I could teach you, you know.",
            ] },
        fighter2_alt: { speaker: 'Nun', lines: [
                "Your discipline is sharp.",
                "But sharpness that never rests will eventually break.",
            ] },
        fighter3: { speaker: 'Jonathan', lines: [
                "No entrance, no warmup, no words.",
                "All business. I can respect that. Still won't be enough.",
            ] },
        fighter3_alt: { speaker: 'Johan', lines: [
                "You are efficient, but not optimal.",
                "I will prove the difference.",
            ] },
        fighter4: { speaker: 'Senna', lines: [
                "All those years of training.",
                "I learned mine in an alley. Let's see what sticks.",
            ] },
        fighter5: { speaker: 'Boombox', lines: [
                "Not a word, not a wink.",
                "Alright then, I'll make enough noise for both of us.",
            ] },
        fighter5_alt: { speaker: 'Icebox', lines: [
                "Your logic is sound.",
                "We will test its limits.",
            ] },
    },
    // ── Playing as Boombox (fighter5) ────────────────────────────────────────
    fighter5: {
        fighter1: { speaker: 'Xiao Long', lines: [
                "You carry a lot more than just strength.",
                "I wonder if you've decided what to do with it.",
            ] },
        fighter1_alt: { speaker: 'Brace', lines: [
                "Big, loud, and direct.",
                "I've got no plan either. Should be interesting.",
            ] },
        fighter2: { speaker: 'Chuck', lines: [
                "Wow. Okay. You are really big.",
                "I'm going to need to be extra charming to get through this one.",
            ] },
        fighter2_alt: { speaker: 'Nun', lines: [
                "You carry a great deal of force.",
                "But force without stillness cannot hold its own weight.",
            ] },
        fighter3: { speaker: 'Jonathan', lines: [
                "You've got confidence for days.",
                "Hope you've got the strength to match it.",
            ] },
        fighter3_alt: { speaker: 'Johan', lines: [
                "You reckon you're the finished product, yeah?",
                "Let's test that theory.",
            ] },
        fighter4: { speaker: 'Senna', lines: [
                "Okay. You're big. Real big.",
                "Good thing I don't fight fair.",
            ] },
        fighter4_alt: { speaker: 'Ninja S', lines: [
                "Big and loud and not subtle about it.",
                "Power without precision is easy to read.",
            ] },
        fighter5_alt: { speaker: 'Icebox', lines: [
                "All heat, no calculation.",
                "I've already mapped where this leads.",
            ] },
    },
    // ── Playing as Icebox (fighter5_alt) ────────────────────────────────────
    fighter5_alt: {
        fighter1: { speaker: 'Xiao Long', lines: [
                "You rely on discipline to guide you.",
                "I will test how far that can take you.",
            ] },
        fighter1_alt: { speaker: 'Brace', lines: [
                "Everything mapped out, every angle covered.",
                "Let me introduce some variables.",
            ] },
        fighter2: { speaker: 'Chuck', lines: [
                "You are extremely intense right now.",
                "Ever try smiling? Just once? It's free.",
            ] },
        fighter2_alt: { speaker: 'Nun', lines: [
                "You have emptied yourself.",
                "But emptiness is not the same as stillness.",
            ] },
        fighter3: { speaker: 'Jonathan', lines: [
                "Cold and blank. You're not going to give me anything to work with.",
                "Fine. I can improvise.",
            ] },
        fighter3_alt: { speaker: 'Johan', lines: [
                "Efficient, cold, no wasted motion.",
                "Optimised is not the same as perfected. I will show you the difference.",
            ] },
        fighter4: { speaker: 'Senna', lines: [
                "All blueprint, no feeling.",
                "I wonder if that's actually a weakness.",
            ] },
        fighter4_alt: { speaker: 'Ninja S', lines: [
                "Efficient. Optimised for different constraints.",
                "We'll see which ones matter today.",
            ] },
        fighter5: { speaker: 'Boombox', lines: [
                "Oi. That's a bit unsettling.",
                "What happened to all the fun?",
            ] },
    },
};
// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
export function getMatchDialogue(playerCharId, opponentCharId) {
    return MATCH_DIALOGUE[playerCharId]?.[opponentCharId] ?? null;
}
