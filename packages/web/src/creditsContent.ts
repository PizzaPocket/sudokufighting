export type CreditLineType = 'logo' | 'name' | 'body' | 'spacer';

export interface CreditLine {
  type: CreditLineType;
  text?: string;
}

export const CREDITS: CreditLine[] = [
  { type: 'logo' },

  { type: 'spacer' },

  { type: 'body', text: 'Created By' },
  { type: 'name', text: 'Leonard Downs Reese IV' },
  { type: 'name', text: 'Kaius Lu Reese' },

  { type: 'spacer' },

  { type: 'body', text: 'Game Design, Programming, Writing, Music' },
  { type: 'name', text: 'Leonard Downs Reese IV' },

  { type: 'spacer' },

  { type: 'body', text: 'Character Design, Art, Creative Design' },
  { type: 'name', text: 'Kaius Lu Reese' },

  { type: 'spacer' },

  { type: 'body', text: 'Original soundtrack composed by' },
  { type: 'name', text: 'Leonard Downs Reese IV' },

  { type: 'spacer' },

  { type: 'body', text: 'All music created exclusively for Sudoku Fighting' },

  { type: 'spacer' },

  { type: 'body', text: 'Special Thanks' },
  { type: 'name', text: 'Tinting Lu' },
  { type: 'body', text: 'For love and support' },

  { type: 'spacer' },

  { type: 'body', text: 'Made to keep our active minds strong.' },

  { type: 'spacer' },

  { type: 'body', text: '© 2026 Leonard Downs Reese IV and Kaius Lu Reese' },
  { type: 'body', text: 'All rights reserved.' },
];

export const CREDITS_SCROLL_DURATION_MS = 24000;
