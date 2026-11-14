import type { BiomeId, MutationId } from '../types.ts';

export type BiomeMechanicId =
  | 'mitosis'
  | 'permafrost_armor'
  | 'overheat_aura'
  | 'smoke_bomb'
  | 'enrage_timer';

export type BiomeDefinition = {
  id: BiomeId;
  name: string;
  subtitle: string;
  skyTopHex: number;
  skyBottomHex: number;
  hillColorHex: number;
  pillarColorHex: number;
  floorTopHex: number;
  floorBodyHex: number;
  accentHex: string;
  mobNames: readonly [string, string, string];
  mobColors: readonly [number, number, number];
  miniBossName: string;
  miniBossTitle: string;
  endBossName: string;
  endBossTitle: string;
  mechanicId: BiomeMechanicId;
  mechanicName: string;
  mechanicDescription: string;
  counterTip: string;
};

export type BossMutationDefinition = {
  id: MutationId;
  name: string;
  icon: string;
  colorHex: string;
  tintHex: number;
  visualTell: string;
  effectText: string;
  twistText: string;
};

export const BIOME_CATALOG: readonly BiomeDefinition[] = [
  {
    id: 'slime_bog',
    name: 'White Camel Venom Cult',
    subtitle: 'Serpent Marsh / Western Wastes',
    skyTopHex: 0x163832,
    skyBottomHex: 0x2d6a4f,
    hillColorHex: 0x1b4332,
    pillarColorHex: 0x40916c,
    floorTopHex: 0x52b788,
    floorBodyHex: 0x3b2f2f,
    accentHex: '#52b788',
    mobNames: ['Venom Disciple', 'Serpent Initiate', 'Toad-Sect Guard'],
    mobColors: [0x6ede8a, 0xff9f1c, 0x9b5de5],
    miniBossName: 'White Camel Hall Master',
    miniBossTitle: 'Silver-Staff Serpent Elder',
    endBossName: 'Venom Patriarch Ouyang',
    endBossTitle: 'Supreme Cult Leader',
    mechanicId: 'mitosis',
    mechanicName: 'Split-Shadow Art',
    mechanicDescription: 'Splits into 2 venomous phantom clones at 50% HP.',
    counterTip: 'Rewards AoE Palm Waves & Whirling Staff arts.',
  },
  {
    id: 'glacial_spire',
    name: 'Ancient Tomb Frost Sect',
    subtitle: 'Jade Coffin Sanctum / Cold Cavern',
    skyTopHex: 0x0f2537,
    skyBottomHex: 0x2c698d,
    hillColorHex: 0x1b4965,
    pillarColorHex: 0x62b6cb,
    floorTopHex: 0xbee9e8,
    floorBodyHex: 0x3d5a80,
    accentHex: '#62b6cb',
    mobNames: ['Frost Novice', 'Silk-Whip Acolyte', 'Tomb Cold Guard'],
    mobColors: [0xa8dadc, 0x4cc9f0, 0x90e0ef],
    miniBossName: 'Red-Silk Sect Elder',
    miniBossTitle: 'Chilled Whisk Enforcer',
    endBossName: 'Frost Palm Matriarch',
    endBossTitle: 'Grand Cult Leader',
    mechanicId: 'permafrost_armor',
    mechanicName: 'Cold Jade Qi Veil',
    mechanicDescription: 'Forms an icy meridian hit-shield every 10s.',
    counterTip: 'Shatter rapidly with Jade Swords or Frost Needles.',
  },
  {
    id: 'volcanic_caldera',
    name: 'Ming Flame Lotus Cult',
    subtitle: 'Bright Peak / Holy Fire Altar',
    skyTopHex: 0x2b0909,
    skyBottomHex: 0x6a1b1b,
    hillColorHex: 0x3d0c0c,
    pillarColorHex: 0x9e2a2b,
    floorTopHex: 0xe07a5f,
    floorBodyHex: 0x241616,
    accentHex: '#ff6b35',
    mobNames: ['Fire Herald', 'Cinder Bannerman', 'Brass Altar Zealot'],
    mobColors: [0xf77f00, 0xd62828, 0xfcbf49],
    miniBossName: 'Golden Lion Envoy',
    miniBossTitle: 'Sacred Flame Commander',
    endBossName: 'Bright Peak Sovereign',
    endBossTitle: 'Holy Fire Cult Leader',
    mechanicId: 'overheat_aura',
    mechanicName: 'Scorching Yang Aura',
    mechanicDescription: 'Radiates searing flame qi to nearby fighters.',
    counterTip: 'Counter with Nine Yang Barrier, Lifesteal, or Dodge.',
  },
  {
    id: 'shadow_alley',
    name: 'Blood Blade Demon Sect',
    subtitle: 'Raven Courtyard / Midnight Pavilion',
    skyTopHex: 0x0d0b21,
    skyBottomHex: 0x241654,
    hillColorHex: 0x16113a,
    pillarColorHex: 0x5e2ca5,
    floorTopHex: 0x4cc9f0,
    floorBodyHex: 0x1a1a2e,
    accentHex: '#c77dff',
    mobNames: ['Shadow Assassin', 'Iron-Claw Zealot', 'Night Watch Blade'],
    mobColors: [0x9d4edd, 0xf72585, 0x4cc9f0],
    miniBossName: 'Copper-Corpse Elder',
    miniBossTitle: 'Nine-Claw Hall Master',
    endBossName: 'Demonic Saber Monarch',
    endBossTitle: 'Nightfall Cult Leader',
    mechanicId: 'smoke_bomb',
    mechanicName: 'Ghostly Footwork',
    mechanicDescription: 'Gains +50% Dodge in shadowy bursts.',
    counterTip: 'Counter with Homing Needles, Flute Echoes, or AoE.',
  },
  {
    id: 'temple_of_time',
    name: 'Heavenly Dragon Pagoda',
    subtitle: 'Cloud Summit / Grand Spire Hall',
    skyTopHex: 0x12132e,
    skyBottomHex: 0x3b2f63,
    hillColorHex: 0x261f47,
    pillarColorHex: 0xd4a373,
    floorTopHex: 0xe9c46a,
    floorBodyHex: 0x2b2d42,
    accentHex: '#ffd166',
    mobNames: ['Robed Sentinel', 'Copper Bell Monk', 'Wheel-Sect Champion'],
    mobColors: [0xffd166, 0xa8dadc, 0xe0aaff],
    miniBossName: 'Golden-Wheel Master',
    miniBossTitle: 'Five-Wheel High Lama',
    endBossName: 'Spire Cult Patriarch',
    endBossTitle: 'Immortal Cult Leader',
    mechanicId: 'enrage_timer',
    mechanicName: 'Bloodline Surge',
    mechanicDescription: 'Gains +15% Strike Speed every 5s in combat.',
    counterTip: 'Awaken a Secret Peerless Synergy to overwhelm.',
  },
];

export const BOSS_MUTATIONS: readonly BossMutationDefinition[] = [
  {
    id: 'golden_gilded',
    name: 'Golden-Gilded',
    icon: '💰',
    colorHex: '#ffd700',
    tintHex: 0xffd700,
    visualTell: 'Shiny gold tint + coin sparkles',
    effectText: 'Boss takes +15% more damage and showers bonus Gold every 10% HP lost.',
    twistText: 'Jackpot roll! Pure loot pinata.',
  },
  {
    id: 'juggernaut',
    name: 'Juggernaut',
    icon: '🛡️',
    colorHex: '#94a3b8',
    tintHex: 0x94a3b8,
    visualTell: 'Giant size (+25% sprite scale)',
    effectText: '+30% Max HP and heavy knockback resistance, attacks 20% slower.',
    twistText: 'Longer fight; rewards sustained DPS.',
  },
  {
    id: 'hasted',
    name: 'Hasted',
    icon: '⚡',
    colorHex: '#38bdf8',
    tintHex: 0x38bdf8,
    visualTell: 'Blue wind trails + rapid animation',
    effectText: '+30% Attack Speed and faster skill cycles, -20% Max HP.',
    twistText: 'Fast, frantic glass-cannon brawl.',
  },
  {
    id: 'vampiric',
    name: 'Vampiric',
    icon: '🦇',
    colorHex: '#ef4444',
    tintHex: 0xef4444,
    visualTell: 'Crimson bat aura',
    effectText: 'Boss heals for 15% of the damage it deals to you.',
    twistText: 'Punishes face-tanking; rewards Dodge & Shields.',
  },
  {
    id: 'volatile',
    name: 'Volatile',
    icon: '💣',
    colorHex: '#fb923c',
    tintHex: 0xfb923c,
    visualTell: 'Glowing orange cracks',
    effectText: 'Periodically spawns ticking magma bombs on the floor (2s fuse).',
    twistText: 'Adds timing & burst windows to the fight.',
  },
  {
    id: 'twin_soul',
    name: 'Twin-Soul',
    icon: '👯',
    colorHex: '#c084fc',
    tintHex: 0xc084fc,
    visualTell: 'Faint purple spectral shadow',
    effectText: 'Boss spawns at 65% HP alongside a spectral copy (35% HP).',
    twistText: 'Turns a single-target boss into a 2-target fight.',
  },
];

export const getBiomeById = (id: BiomeId): BiomeDefinition => {
  const found = BIOME_CATALOG.find((b) => b.id === id);
  if (found) return found;
  const first = BIOME_CATALOG[0];
  if (first) return first;
  throw new Error('BIOME_CATALOG is empty');
};

export const getMutationById = (id: MutationId): BossMutationDefinition => {
  const found = BOSS_MUTATIONS.find((m) => m.id === id);
  if (found) return found;
  const first = BOSS_MUTATIONS[0];
  if (first) return first;
  throw new Error('BOSS_MUTATIONS is empty');
};

export const rollBossMutations = (
  rng: () => number,
  count: number,
  exclude: readonly MutationId[] = []
): MutationId[] => {
  const result: MutationId[] = [];
  const pool = BOSS_MUTATIONS.filter((m) => !exclude.includes(m.id));
  const available = [...pool];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(rng() * available.length);
    const chosen = available[idx];
    if (chosen) {
      result.push(chosen.id);
      available.splice(idx, 1);
    }
  }
  return result;
};
