import type { Arena } from './types/arena.js';

export const ARENAS: Arena[] = [
  {
    id: 'bg_1',
    name: 'El Tropical',
    background: '/assets/arenas/el-tropical/sunset_end.svg',
    bgFadeOverlay: '/assets/arenas/el-tropical/sunset_start.svg',
    sunEnd: '/assets/arenas/el-tropical/sun_end.svg',
    sunStart: '/assets/arenas/el-tropical/sun_start.svg',
    ground: '/assets/arenas/el-tropical/ground.svg',
    overlays: [
      { id: 'palm-trees', src: '/assets/arenas/el-tropical/palm_trees_wide.svg' },
    ],
    trackIndex: 0,
    dialogueBg: '/assets/arenas/el-tropical/bg_cutscene.svg',
  },
  {
    id: 'bg_2',
    name: 'Paradiso',
    background: '/assets/arenas/paradiso/bg.svg',
    ground: '/assets/arenas/paradiso/ground.svg',
    hasBirds: true,
    hasClouds: true,
    overlays: [],
    trackIndex: 2,
    dialogueBg: '/assets/arenas/paradiso/bg.svg',
  },
  {
    id: 'bg_3',
    name: 'Sky City',
    background: '/assets/arenas/derelict/bg.svg',
    ground: '/assets/arenas/derelict/ground.svg',
    overlays: [
      { id: 'buildings', src: '/assets/arenas/derelict/buildings.svg' },
    ],
    trackIndex: 3,
    dialogueBg: '/assets/arenas/derelict/bg.svg',
  },
  {
    id: 'bg_4',
    name: 'Shinobi Alley',
    background: '/assets/arenas/shinobi-alley/bg.svg',
    ground: '/assets/arenas/shinobi-alley/ground.svg',
    overlays: [
      { id: 'alley', src: '/assets/arenas/shinobi-alley/alley_wide.svg' },
    ],
    trackIndex: 5,
    dialogueBg: '/assets/arenas/shinobi-alley/bg.svg',
  },
  {
    id: 'bg_5',
    name: 'The Big Time',
    background: '/assets/arenas/the-big-time/bg.svg',
    ground: '/assets/arenas/the-big-time/ground.svg',
    overlays: [],
    trackIndex: 4,
    dialogueBg: '/assets/arenas/the-big-time/bg.svg',
  },
];

export function getArena(id: string): Arena | undefined {
  return ARENAS.find(a => a.id === id);
}
