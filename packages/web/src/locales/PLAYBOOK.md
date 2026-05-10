# Localisation Playbook

Reference for adding a new language to Sudoku Fighting. Follow this guide before writing a single translation string.

---

## Technical checklist

Six steps to add a locale:

1. Add the locale code to `SUPPORTED_LOCALES` in `packages/web/src/i18n.ts`
2. Add a `normaliseLocale()` branch mapping browser language codes (e.g. `'fr'`, `'fr-FR'`) to the new locale
3. Create three files: `locales/<code>/ui.json`, `locales/<code>/dialogue.json`, `locales/<code>/characters.json`
4. Import all three in `i18n.ts` and add them to the `resources` object
5. Add the locale to `LOCALE_LABELS` in `packages/web/src/components/layout/ContextualMenu.tsx` — use the locale's own native-script name (e.g. `한국어`, not `Korean`)
6. **Non-Latin scripts only** (Arabic, Hindi, Thai, etc.): add the matching Noto Sans variant to the Google Fonts URL in `packages/web/index.html` and add a CSS token override in `packages/web/src/styles/tokens.css`:
   ```css
   html[lang="XX"], [data-lang="XX"] { --font-display: 'Noto Sans XX', sans-serif; }
   ```

---

## Script & spacing classification

| Script family | Current locales | Spaces between words? | `--font-display` override? |
|---|---|---|---|
| Latin | en, es, ms | Yes | No (Barlow Condensed) |
| CJK — no spaces | zh-CN, ja | **No** | Yes (Noto Sans SC / JP) |
| Hangul | ko | Yes | Yes (Noto Sans KR) |
| Tamil | ta | Yes | Yes (Noto Sans Tamil) |

**CJK spacing is handled automatically.** An i18next post-processor in `i18n.ts` strips spaces adjacent to Han/Hiragana/Katakana characters after interpolation. This means zh-CN and ja strings can be written naturally in the JSON (e.g. `第 {{number}} 战`) and will render correctly (`第1战`) at runtime. Do not manually remove these spaces — the post-processor is the single source of truth.

Korean (Hangul) and Tamil intentionally use spaces between words and are excluded from this post-processing.

---

## Fighter names — `characters.json`

- **Latin-script locales** (en, es, ms): keep the original English names exactly as-is
- **Non-Latin locales**: transliterate into local script using the most natural/standard form for that script
- If a name has a direct native equivalent, prefer it over a phonetic transliteration — e.g. Xiao Long → 小龙 (Chinese, literal meaning) rather than a pure phonetic rendition
- Reference transliterations across existing locales:

| English | zh-CN | ja | ko |
|---|---|---|---|
| Xiao Long | 小龙 | シャオロン | 샤오롱 |
| Brace | 布雷斯 | ブレイス | 브레이스 |
| Chuck | 查克 | チャック | 척 |
| Nun | 纳恩 | ナン | 눈 |
| Jonathan | 乔纳森 | ジョナサン | 조나단 |
| Johan | 约翰 | ヨハン | 요한 |
| Senna | 赛纳 | セナ | 세나 |
| Ninja S | 忍者S | ニンジャS | 닌자 S |
| Boombox | 音爆 | ブームボックス | 붐박스 |
| Icebox | 冰封 | アイスボックス | 아이스박스 |
| Master Chow | 周师傅 | マスター・チョウ | 차우 사범 |

---

## Arena names — `ui.json` → `arenas` section

All locales must provide arena names under the keys `bg_1`–`bg_5`. Non-Latin locales **must** use local script — a Chinese speaker cannot read "El Tropical". Latin locales may use culturally adapted names rather than strict translations.

| Key | English | Setting |
|---|---|---|
| bg_1 | El Tropical | Tropical beach |
| bg_2 | Paradiso | Italian-origin paradise |
| bg_3 | Sky City | Futuristic skyline |
| bg_4 | Shinobi Alley | Ninja-themed alley |
| bg_5 | The Big Time | Final/climactic arena |

Reference translations:

| Key | es | ms | ja | ko | zh-CN | ta |
|---|---|---|---|---|---|---|
| bg_1 | El Tropical | Tropika Pantai | トロピカルビーチ | 트로피컬 비치 | 热带海滩 | வெப்பமண்டல கடற்கரை |
| bg_2 | Paradiso | Paradiso | パラディーゾ | 파라디소 | 帕拉迪索 | பரடிசோ |
| bg_3 | Ciudad Celeste | Kota Langit | スカイシティ | 스카이 시티 | 天空之城 | ஸ்கை சிட்டி |
| bg_4 | Callejón Shinobi | Lorong Shinobi | 忍び横丁 | 시노비 골목 | 忍者巷 | ஷினோபி சந்து |
| bg_5 | El Gran Combate | Pertarungan Utama | ビッグタイム | 빅타임 | 巅峰对决 | இறுதி மோதல் |

---

## What to keep in English on all locales

These are genre-established fighting game terms. They appear stylistically correct in English regardless of the player's locale and should **not** be translated:

- `FIGHT!` — round start call
- `ROUND 1`, `ROUND 2` — round announcements
- `KO`, `TKO` — knockout labels
- `3× COMBO!` — combo announcements
- `▶▶` — speed-up symbol in dialogue (skip to end of typing animation)

Everything else user-facing should be translated.

---

## About & Credits — `about` and `credits` keys in `ui.json`

- Developer proper names (**Leonard Downs Reese IV**, **Kaius Lu Reese**) stay in Latin script across all locales
- Chinese names **吕婷婷** and **吕恺** are used in zh-CN (and may also be used in ja, as Japanese can render Chinese hanzi)
- All other locales keep Chinese names in Latin script (Tingting Lu, Kaius Lu Reese)
- The surrounding descriptive copy should be fully translated for each locale

---

## Share messages — `lobby.share_quick_text` and `lobby.share_invite_text`

Both are in `ui.json` under the `lobby` section. Translate naturally — don't carry over English sentence structure literally. Both strings end with `:` because the platform appends the URL separately in the share sheet.

| Locale | share_quick_text | share_invite_text |
|---|---|---|
| en | Play Sudoku Fighting — real-time competitive puzzle battles: | Come fight me in Sudoku Fighting! Join my room: |
| es | ¡Juega Sudoku Fighting — batallas de puzles en tiempo real: | ¡Pelea conmigo en Sudoku Fighting! Únete a mi sala: |
| ms | Main Sudoku Fighting — pertarungan teka-teki masa nyata: | Lawan aku dalam Sudoku Fighting! Sertai bilik aku: |
| ja | 数独ファイティングで遊ぼう — リアルタイム対戦パズルゲーム: | 数独ファイティングで対戦しよう！ルームに参加して: |
| ko | 스도쿠 파이팅을 플레이하세요 — 실시간 경쟁 퍼즐 배틀: | 스도쿠 파이팅에서 저와 싸워요! 방에 참가하세요: |
| zh-CN | 来玩数独格斗 — 实时竞技解谜游戏: | 来数独格斗和我对战！加入我的房间: |
| ta | சுடோகு ஃபைட்டிங் விளையாடுங்கள் — நேரடி போட்டி புதிர் சண்டை: | சுடோகு ஃபைட்டிங்கில் என்னுடன் சண்டையிடு! என் அறையில் சேர்: |

---

## Dialogue — `dialogue.json`

The largest translation volume. Two sections:

- **`chow_intro`** — Master Chow's intro speech for each of the 10 fighter variants (5 fighters × main + alt). Establishes the fighter's character before a campaign fight.
- **`match`** — Pre-fight banter between all fighter pairings. Each fighter has lines against every other fighter they can face.

**Tone**: dramatic, slightly theatrical fighting game style. Each character has a distinct voice — read the English file to understand their personality before translating. LLM-assisted translation is appropriate; review for naturalness in the target language.

**Spacing note for zh-CN and ja**: spaces around variables in dialogue strings are handled by the post-processor. Write strings naturally.

---

## Testing a new locale

After implementing all files:

1. `pnpm tsc --noEmit` — must pass with no errors
2. Switch to the new locale in the language selector
3. Verify: start screen, character select, lobby, campaign lobby (arena name), win overlay (`{{name}}` in the wins string), campaign victory screen, auth screens, settings, about/credits
4. Verify fighting game terms (FIGHT!, KO, etc.) still appear in English
5. If non-Latin script: verify heading font (VICTORY!, character names in lobby) renders in Noto Sans, not a system fallback
