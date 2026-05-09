export type CreditLineType = 'logo' | 'name' | 'body' | 'copyright' | 'spacer';

export interface CreditLine {
  type: CreditLineType;
  text?: string;
  i18nKey?: string;
}

export const CREDITS: CreditLine[] = [
  { type: 'logo' },

  { type: 'spacer' },

  { type: 'body', text: 'Created By', i18nKey: 'credits.created_by' },
  { type: 'name', text: 'Leonard Downs Reese IV' },
  { type: 'name', text: 'Kaius Lu Reese', i18nKey: 'credits.name_kaius' },

  { type: 'spacer' },

  { type: 'body', text: 'Game Design and Programming', i18nKey: 'credits.game_design' },
  { type: 'name', text: 'Leonard Downs Reese IV' },

  { type: 'spacer' },

  { type: 'body', text: 'Character Design, Creative Direction, and Musical Contribution', i18nKey: 'credits.char_design' },
  { type: 'name', text: 'Kaius Lu Reese', i18nKey: 'credits.name_kaius' },

  { type: 'spacer' },

  { type: 'body', text: 'Original soundtrack composed by', i18nKey: 'credits.ost_by' },
  { type: 'name', text: 'Leonard Downs Reese IV' },

  { type: 'spacer' },

  { type: 'body', text: 'All music created exclusively for Sudoku Fighting', i18nKey: 'credits.all_music' },

  { type: 'spacer' },

  { type: 'body', text: 'Special Thanks', i18nKey: 'credits.special_thanks' },
  { type: 'name', text: 'Tingting Lu', i18nKey: 'credits.name_tingting' },
  { type: 'body', text: 'For your love and support', i18nKey: 'credits.for_support' },

  { type: 'spacer' },

  { type: 'body', text: 'Created to keep our active minds sharp.', i18nKey: 'credits.tagline' },

  { type: 'spacer' },

  { type: 'copyright', text: '© 2026 Leonard Downs Reese IV and Kaius Lu Reese' },
  { type: 'copyright', text: 'All rights reserved.' },
];

export const CREDITS_SCROLL_DURATION_MS = 24000;
