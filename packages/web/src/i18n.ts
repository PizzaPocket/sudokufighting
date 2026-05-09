import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import enUi from './locales/en/ui.json';
import enDialogue from './locales/en/dialogue.json';
import enCharacters from './locales/en/characters.json';
import zhCNUi from './locales/zh-CN/ui.json';
import zhCNDialogue from './locales/zh-CN/dialogue.json';
import zhCNCharacters from './locales/zh-CN/characters.json';
import jaUi from './locales/ja/ui.json';
import jaDialogue from './locales/ja/dialogue.json';
import jaCharacters from './locales/ja/characters.json';
import taUi from './locales/ta/ui.json';
import taDialogue from './locales/ta/dialogue.json';
import taCharacters from './locales/ta/characters.json';
import msUi from './locales/ms/ui.json';
import msDialogue from './locales/ms/dialogue.json';
import msCharacters from './locales/ms/characters.json';
import koUi from './locales/ko/ui.json';
import koDialogue from './locales/ko/dialogue.json';
import koCharacters from './locales/ko/characters.json';
import esUi from './locales/es/ui.json';
import esDialogue from './locales/es/dialogue.json';
import esCharacters from './locales/es/characters.json';

export const SUPPORTED_LOCALES = ['en', 'zh-CN', 'ja', 'ta', 'ms', 'ko', 'es'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

function normaliseLocale(raw: string): SupportedLocale {
  const lower = raw.toLowerCase();
  if (lower.startsWith('zh')) return 'zh-CN';
  if (lower.startsWith('ja')) return 'ja';
  if (lower.startsWith('ta')) return 'ta';
  if (lower.startsWith('ms')) return 'ms';
  if (lower.startsWith('ko')) return 'ko';
  if (lower.startsWith('es')) return 'es';
  return 'en';
}

function getInitialLocale(): SupportedLocale {
  try {
    const saved = localStorage.getItem('language') as SupportedLocale | null;
    if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) return saved;
  } catch { /* ignore */ }
  try {
    return normaliseLocale(navigator.language ?? 'en');
  } catch {
    return 'en';
  }
}

i18next
  .use(initReactI18next)
  .init({
    lng: getInitialLocale(),
    fallbackLng: 'en',
    ns: ['ui', 'dialogue', 'characters'],
    defaultNS: 'ui',
    resources: {
      en:      { ui: enUi,      dialogue: enDialogue,      characters: enCharacters },
      'zh-CN': { ui: zhCNUi,    dialogue: zhCNDialogue,    characters: zhCNCharacters },
      ja:      { ui: jaUi,      dialogue: jaDialogue,      characters: jaCharacters },
      ta:      { ui: taUi,      dialogue: taDialogue,      characters: taCharacters },
      ms:      { ui: msUi,      dialogue: msDialogue,      characters: msCharacters },
      ko:      { ui: koUi,      dialogue: koDialogue,      characters: koCharacters },
      es:      { ui: esUi,      dialogue: esDialogue,      characters: esCharacters },
    },
    interpolation: { escapeValue: false },
  });

export function setLocale(locale: SupportedLocale): void {
  i18next.changeLanguage(locale);
  try { localStorage.setItem('language', locale); } catch { /* ignore */ }
}

export default i18next;
