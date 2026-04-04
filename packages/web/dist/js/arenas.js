export const ARENAS = [
  {
    id: 'bg_1',
    name: 'El Tropical',
    background: '/assets/arenas/el-tropical/sunset_end.svg',
    bgFadeOverlay: '/assets/arenas/el-tropical/sunset_start.svg',
    sunEnd: '/assets/arenas/el-tropical/sun_end.svg',
    sunStart: '/assets/arenas/el-tropical/sun_start.svg',
    ground: '/assets/arenas/el-tropical/ground.svg',
    overlays: [
      { id: 'palm-trees', src: '/assets/arenas/el-tropical/palm_trees.svg' },
    ],
    trackIndex: 0,
  },
  {
    id: 'bg_2',
    name: 'Paradiso',
    background: '/assets/arenas/paradiso/bg.svg',
    ground: '/assets/arenas/paradiso/ground.svg',
    overlays: [],
    trackIndex: 2,
  },
  {
    id: 'bg_3',
    name: 'Derelict',
    background: '/assets/arenas/derelict/bg.svg',
    ground: '/assets/arenas/derelict/ground.svg',
    overlays: [
      { id: 'buildings', src: '/assets/arenas/derelict/buildings.svg' },
    ],
    trackIndex: 3,
  },
];

export function getArena(id) {
  return ARENAS.find(a => a.id === id);
}
