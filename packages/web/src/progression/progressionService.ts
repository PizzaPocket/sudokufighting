export interface ProgressionData {
  unlockedCharacterIds: string[];
  campaignClearCount: number;
}

export const BASE_UNLOCKED = ['fighter1', 'fighter2', 'fighter3', 'fighter4'];

export function loadProgression(): ProgressionData {
  // TODO: replace with localStorage.getItem / server fetch
  return { unlockedCharacterIds: [...BASE_UNLOCKED], campaignClearCount: 0 };
}

export function saveProgression(_data: ProgressionData): void {
  // TODO: replace with localStorage.setItem / server POST
}
