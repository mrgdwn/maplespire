import type { BiomeId, MutationId } from '../types.ts';

export type BiomeMechanicId =
  | 'mitosis'
  | 'permafrost_armor'
  | 'overheat_aura'
  | 'smoke_bomb'
  | 'enrage_timer';

export type MiniBossSpriteVariant = 'miniboss_0' | 'miniboss_1' | 'miniboss_2';

export type MiniBossRosterEntry = {
  readonly name: string;
  readonly title: string;
  readonly spriteKey: MiniBossSpriteVariant;
  readonly tintHex: number;
  readonly mechanicId: BiomeMechanicId;
};

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
  miniBossRoster: readonly MiniBossRosterEntry[];
  endBossName: string;
  endBossTitle: string;
  endBossRoster: readonly string[];
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
    skyTopHex: 0x142622,
    skyBottomHex: 0x284d40,
    hillColorHex: 0x1a362c,
    pillarColorHex: 0x3d6b52,
    floorTopHex: 0x5f9e78,
    floorBodyHex: 0x352b27,
    accentHex: '#5f9e78',
    mobNames: ['Venom Disciple', 'Serpent Initiate', 'Toad-Sect Guard'],
    mobColors: [0x5f9e78, 0xc98a3a, 0x75528a],
    miniBossName: 'White Camel Hall Master',
    miniBossTitle: 'Silver-Staff Serpent Elder',
    miniBossRoster: [
      {
        name: 'White Camel Hall Master',
        title: 'Silver-Staff Serpent Elder',
        spriteKey: 'miniboss_0',
        tintHex: 0x5f9e78,
        mechanicId: 'mitosis',
      },
      {
        name: 'Five-Venom Toad Elder',
        title: 'Emerald Palm Poison Sovereign',
        spriteKey: 'miniboss_2',
        tintHex: 0x3d6b52,
        mechanicId: 'smoke_bomb',
      },
      {
        name: 'Centipede Iron-Claw Matriarch',
        title: 'Miasma Marsh Executioner',
        spriteKey: 'miniboss_1',
        tintHex: 0x75528a,
        mechanicId: 'permafrost_armor',
      },
    ],
    endBossName: 'Venom Patriarch Ouyang',
    endBossTitle: 'Supreme Cult Leader',
    endBossRoster: [
      'Venom Patriarch Ouyang',
      'Western Wastes Sovereign',
      'Nine-Serpent Cult Ancestor',
    ],
    mechanicId: 'mitosis',
    mechanicName: 'Split-Shadow Art',
    mechanicDescription: 'Splits into 2 venomous phantom clones at 50% HP.',
    counterTip: 'Rewards AoE Palm Waves & Whirling Staff arts.',
  },
  {
    id: 'glacial_spire',
    name: 'Ancient Tomb Frost Sect',
    subtitle: 'Jade Coffin Sanctum / Cold Cavern',
    skyTopHex: 0x122230,
    skyBottomHex: 0x284c63,
    hillColorHex: 0x1a3647,
    pillarColorHex: 0x568296,
    floorTopHex: 0xa3c2c4,
    floorBodyHex: 0x2d3c4d,
    accentHex: '#6c99ab',
    mobNames: ['Frost Novice', 'Silk-Whip Acolyte', 'Tomb Cold Guard'],
    mobColors: [0x9bbec2, 0x5a7fa3, 0x7ca5b8],
    miniBossName: 'Red-Silk Sect Elder',
    miniBossTitle: 'Chilled Whisk Enforcer',
    miniBossRoster: [
      {
        name: 'Jade-Bee Swarm Matriarch',
        title: 'Tomb Frost Enforcer',
        spriteKey: 'miniboss_1',
        tintHex: 0x6fa4b5,
        mechanicId: 'permafrost_armor',
      },
      {
        name: 'Cold-Jade Twin-Saber Elder',
        title: 'Glacial Meridian Guard',
        spriteKey: 'miniboss_0',
        tintHex: 0x7b9ec2,
        mechanicId: 'permafrost_armor',
      },
      {
        name: 'Red-Silk Whip Hall Master',
        title: 'Chilled Whisk Enforcer',
        spriteKey: 'miniboss_2',
        tintHex: 0xb55d6d,
        mechanicId: 'smoke_bomb',
      },
    ],
    endBossName: 'Frost Palm Matriarch',
    endBossTitle: 'Grand Cult Leader',
    endBossRoster: [
      'Frost Palm Matriarch',
      'Jade Coffin Sovereign',
      'Glacial Abyss Grandmaster',
    ],
    mechanicId: 'permafrost_armor',
    mechanicName: 'Cold Jade Qi Veil',
    mechanicDescription: 'Forms an icy meridian hit-shield every 10s.',
    counterTip: 'Shatter rapidly with Jade Swords or Frost Needles.',
  },
  {
    id: 'volcanic_caldera',
    name: 'Ming Flame Lotus Cult',
    subtitle: 'Bright Peak / Holy Fire Altar',
    skyTopHex: 0x240c0b,
    skyBottomHex: 0x59201c,
    hillColorHex: 0x361412,
    pillarColorHex: 0x9e2a2b,
    floorTopHex: 0xc4684b,
    floorBodyHex: 0x241616,
    accentHex: '#d46a3e',
    mobNames: ['Fire Herald', 'Cinder Bannerman', 'Brass Altar Zealot'],
    mobColors: [0xd4762c, 0xb0302a, 0xd9a44a],
    miniBossName: 'Golden Lion Envoy',
    miniBossTitle: 'Sacred Flame Commander',
    miniBossRoster: [
      {
        name: 'Golden Lion Envoy',
        title: 'Sacred Flame Commander',
        spriteKey: 'miniboss_2',
        tintHex: 0xd9823b,
        mechanicId: 'overheat_aura',
      },
      {
        name: 'Blood-Blade Hall Master',
        title: 'Bright Peak Vanguard',
        spriteKey: 'miniboss_0',
        tintHex: 0xb8403b,
        mechanicId: 'enrage_timer',
      },
      {
        name: 'Purple-Shirt Dragon King',
        title: 'Abyssal Flame Elder',
        spriteKey: 'miniboss_1',
        tintHex: 0xa63a4b,
        mechanicId: 'overheat_aura',
      },
    ],
    endBossName: 'Bright Peak Sovereign',
    endBossTitle: 'Holy Fire Cult Leader',
    endBossRoster: [
      'Bright Peak Sovereign',
      'Pure-Yang Flame Patriarch',
      'Holy Fire Grand Leader',
    ],
    mechanicId: 'overheat_aura',
    mechanicName: 'Scorching Yang Aura',
    mechanicDescription: 'Radiates searing flame qi to nearby fighters.',
    counterTip: 'Counter with Nine Yang Barrier, Lifesteal, or Dodge.',
  },
  {
    id: 'shadow_alley',
    name: 'Blood Blade Demon Sect',
    subtitle: 'Raven Courtyard / Midnight Pavilion',
    skyTopHex: 0x12101c,
    skyBottomHex: 0x261d36,
    hillColorHex: 0x1b1529,
    pillarColorHex: 0x3a2845,
    floorTopHex: 0x5a7fa3,
    floorBodyHex: 0x1c1824,
    accentHex: '#9e3438',
    mobNames: ['Shadow Assassin', 'Iron-Claw Zealot', 'Night Watch Blade'],
    mobColors: [0x6e517d, 0x9e3438, 0x5a7fa3],
    miniBossName: 'Copper-Corpse Elder',
    miniBossTitle: 'Nine-Claw Hall Master',
    miniBossRoster: [
      {
        name: 'Phantom-Step Night Envoy',
        title: 'Black-Wind Shadow Elder',
        spriteKey: 'miniboss_1',
        tintHex: 0x6e517d,
        mechanicId: 'smoke_bomb',
      },
      {
        name: 'Copper-Corpse Nine-Claw',
        title: 'Peach Blossom Renegade',
        spriteKey: 'miniboss_0',
        tintHex: 0x9e3438,
        mechanicId: 'enrage_timer',
      },
      {
        name: 'Seven-Kill Dagger Master',
        title: 'Crimson Veil Executioner',
        spriteKey: 'miniboss_2',
        tintHex: 0x5a7fa3,
        mechanicId: 'smoke_bomb',
      },
    ],
    endBossName: 'Demonic Saber Monarch',
    endBossTitle: 'Nightfall Cult Leader',
    endBossRoster: [
      'Demonic Saber Monarch',
      'Nine-Claw Shade Sovereign',
      'Blood-Moon Cult Ancestor',
    ],
    mechanicId: 'smoke_bomb',
    mechanicName: 'Ghostly Footwork',
    mechanicDescription: 'Gains +50% Dodge in shadowy bursts.',
    counterTip: 'Counter with Homing Needles, Flute Echoes, or AoE.',
  },
  {
    id: 'temple_of_time',
    name: 'Heavenly Dragon Pagoda',
    subtitle: 'Cloud Summit / Grand Spire Hall',
    skyTopHex: 0x161422,
    skyBottomHex: 0x342a4a,
    hillColorHex: 0x241d36,
    pillarColorHex: 0xb88b58,
    floorTopHex: 0xc9a55a,
    floorBodyHex: 0x262430,
    accentHex: '#d6ae5c',
    mobNames: ['Robed Sentinel', 'Copper Bell Monk', 'Wheel-Sect Champion'],
    mobColors: [0xd6ae5c, 0x8eaeb3, 0x9c7ea8],
    miniBossName: 'Golden-Wheel Master',
    miniBossTitle: 'Five-Wheel High Lama',
    miniBossRoster: [
      {
        name: 'Golden-Wheel High Lama',
        title: 'Five-Wheel Dharma Sovereign',
        spriteKey: 'miniboss_2',
        tintHex: 0xd6ae5c,
        mechanicId: 'enrage_timer',
      },
      {
        name: 'Iron-Palm Qiu Envoy',
        title: 'Summit Pagoda Enforcer',
        spriteKey: 'miniboss_0',
        tintHex: 0xc47e32,
        mechanicId: 'permafrost_armor',
      },
      {
        name: 'Bronze-Bell Guardian Abbot',
        title: 'Vajra Meridian Elder',
        spriteKey: 'miniboss_1',
        tintHex: 0x5a8f76,
        mechanicId: 'mitosis',
      },
    ],
    endBossName: 'Spire Cult Patriarch',
    endBossTitle: 'Immortal Cult Leader',
    endBossRoster: [
      'Spire Cult Patriarch',
      'Heavenly Dragon Sovereign',
      'East-West Martial Overlord',
    ],
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
    icon: '',
    colorHex: '#d8b25c',
    tintHex: 0xd8b25c,
    visualTell: 'Shiny gold tint + coin sparkles',
    effectText: 'Boss takes +15% more damage and showers bonus Gold every 10% HP lost.',
    twistText: 'Jackpot roll! Pure loot pinata.',
  },
  {
    id: 'juggernaut',
    name: 'Juggernaut',
    icon: '',
    colorHex: '#94a3b8',
    tintHex: 0x94a3b8,
    visualTell: 'Giant size (+25% sprite scale)',
    effectText: '+30% Max HP and heavy knockback resistance, attacks 20% slower.',
    twistText: 'Longer fight; rewards sustained DPS.',
  },
  {
    id: 'hasted',
    name: 'Hasted',
    icon: '',
    colorHex: '#5a8ca8',
    tintHex: 0x5a8ca8,
    visualTell: 'Blue wind trails + rapid animation',
    effectText: '+30% Attack Speed and faster skill cycles, -20% Max HP.',
    twistText: 'Fast, frantic glass-cannon brawl.',
  },
  {
    id: 'vampiric',
    name: 'Vampiric',
    icon: '',
    colorHex: '#b53a38',
    tintHex: 0xb53a38,
    visualTell: 'Crimson bat aura',
    effectText: 'Boss heals for 15% of the damage it deals to you.',
    twistText: 'Punishes face-tanking; rewards Dodge & Shields.',
  },
  {
    id: 'volatile',
    name: 'Volatile',
    icon: '',
    colorHex: '#cf7538',
    tintHex: 0xcf7538,
    visualTell: 'Glowing orange cracks',
    effectText: 'Periodically spawns ticking magma bombs on the floor (2s fuse).',
    twistText: 'Adds timing & burst windows to the fight.',
  },
  {
    id: 'twin_soul',
    name: 'Twin-Soul',
    icon: '',
    colorHex: '#8b699e',
    tintHex: 0x8b699e,
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

export const getBiomeForFloor = (
  baseBiomeId: BiomeId,
  floor: number,
  seed: number
): BiomeDefinition => {
  const baseIdx = Math.max(
    0,
    BIOME_CATALOG.findIndex((b) => b.id === baseBiomeId)
  );
  const bracket = Math.floor(Math.max(0, floor - 1) / 10);
  let idx = baseIdx;
  for (let b = 1; b <= bracket; b++) {
    const h = Math.abs(Math.imul(seed ^ (b * 0x9e3779b9), 0x85ebca6b)) >>> 0;
    const step = 1 + (h % Math.max(1, BIOME_CATALOG.length - 1));
    idx = (idx + step) % BIOME_CATALOG.length;
  }
  return BIOME_CATALOG[idx] ?? getBiomeById(baseBiomeId);
};

export const getMiniBossForFloor = (
  baseBiomeId: BiomeId,
  floor: number,
  seed: number
): MiniBossRosterEntry => {
  const floorBiome = getBiomeForFloor(baseBiomeId, floor, seed);
  const interleavedPool: MiniBossRosterEntry[] = [];
  for (let variant = 0; variant < 3; variant++) {
    for (const biome of BIOME_CATALOG) {
      const entry = biome.miniBossRoster[variant];
      if (entry) interleavedPool.push(entry);
    }
  }
  if (interleavedPool.length === 0) {
    const fallback = floorBiome.miniBossRoster[0];
    if (fallback) return fallback;
    return {
      name: floorBiome.miniBossName,
      title: floorBiome.miniBossTitle,
      spriteKey: 'miniboss_0',
      tintHex: floorBiome.mobColors[0],
      mechanicId: floorBiome.mechanicId,
    };
  }
  const biomeStartIdx = Math.max(
    0,
    BIOME_CATALOG.findIndex((b) => b.id === floorBiome.id)
  );
  const salt = Math.abs((seed * 31 + floor * 17) | 0);
  const variantOffset = ((floor + Math.abs(seed)) % 3) * BIOME_CATALOG.length;
  const idx =
    (biomeStartIdx + variantOffset + ((floor * 3 + salt) % BIOME_CATALOG.length)) %
    interleavedPool.length;
  const picked = interleavedPool[idx];
  if (picked) return picked;
  const fallback = floorBiome.miniBossRoster[0];
  if (fallback) return fallback;
  return {
    name: floorBiome.miniBossName,
    title: floorBiome.miniBossTitle,
    spriteKey: 'miniboss_0',
    tintHex: floorBiome.mobColors[0],
    mechanicId: floorBiome.mechanicId,
  };
};

export const getEndBossNameForFloor = (
  baseBiomeId: BiomeId,
  floor: number,
  seed: number
): string => {
  const floorBiome = getBiomeForFloor(baseBiomeId, floor, seed);
  const bracketIdx = Math.max(0, Math.floor(floor / 10) - 1);
  const roster = floorBiome.endBossRoster;
  if (roster.length === 0) return floorBiome.endBossName;
  const idx = (bracketIdx + Math.abs(seed)) % roster.length;
  return roster[idx] ?? floorBiome.endBossName;
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
