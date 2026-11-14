export type WuxiaManualKind = 'active' | 'inner_qi' | 'synergy' | 'enlightenment';

export type WuxiaManualRarity = 'martial' | 'esoteric' | 'ultimate' | 'peerless' | 'enlightenment';

export type WuxiaArtStyle =
  | 'palm_wave'
  | 'jade_swords'
  | 'staff_spin'
  | 'iron_cleave'
  | 'flute_sonic'
  | 'venom_needles';

export type WuxiaStatBundle = {
  readonly hpPct?: number;
  readonly atkPct?: number;
  readonly speedPct?: number;
  readonly armorFlat?: number;
  readonly critChance?: number;
  readonly critDamage?: number;
  readonly dodgeChance?: number;
  readonly cooldownReduction?: number;
  readonly lifesteal?: number;
  readonly goldBonusPct?: number;
  readonly shieldOnFloor?: number;
};

export type WuxiaActiveArt = {
  readonly id: string;
  readonly kind: 'active';
  readonly name: string;
  readonly shortName: string;
  readonly icon: string;
  readonly sectOrigin: string;
  readonly colorHex: number;
  readonly style: WuxiaArtStyle;
  readonly cooldownsMs: readonly [number, number, number];
  readonly powerMults: readonly [number, number, number];
  readonly projectileCounts: readonly [number, number, number];
  readonly levelDescriptions: readonly [string, string, string];
  readonly pairedQiId: string;
  readonly synergyId: string;
};

export type WuxiaInnerQi = {
  readonly id: string;
  readonly kind: 'inner_qi';
  readonly name: string;
  readonly shortName: string;
  readonly icon: string;
  readonly sectOrigin: string;
  readonly colorHex: number;
  readonly levelDescriptions: readonly [string, string, string];
  readonly levelStats: readonly [WuxiaStatBundle, WuxiaStatBundle, WuxiaStatBundle];
};

export type WuxiaSecretSynergy = {
  readonly id: string;
  readonly kind: 'synergy';
  readonly name: string;
  readonly shortName: string;
  readonly icon: string;
  readonly colorHex: number;
  readonly activeId: string;
  readonly innerQiId: string;
  readonly riddleHint: string;
  readonly description: string;
  readonly powerMult: number;
  readonly projectileCount: number;
  readonly cooldownMs: number;
  readonly bonusStats: WuxiaStatBundle;
};

export type WuxiaEnlightenmentScroll = {
  readonly id: string;
  readonly kind: 'enlightenment';
  readonly name: string;
  readonly shortName: string;
  readonly icon: string;
  readonly colorHex: number;
  readonly description: string;
  readonly bonusStats: WuxiaStatBundle;
};

export type WuxiaManualEntry =
  | WuxiaActiveArt
  | WuxiaInnerQi
  | WuxiaSecretSynergy
  | WuxiaEnlightenmentScroll;

export type WuxiaSlotEntry = {
  readonly id: string;
  readonly level: number;
};

export type WuxiaLoadoutSummary = {
  readonly actives: readonly WuxiaSlotEntry[];
  readonly innerQis: readonly WuxiaSlotEntry[];
  readonly activeLevels: Readonly<Record<string, number>>;
  readonly innerQiLevels: Readonly<Record<string, number>>;
  readonly awakenedSynergies: readonly string[];
  readonly availableSynergies: readonly WuxiaSecretSynergy[];
  readonly enlightenmentCounts: Readonly<Record<string, number>>;
  readonly aggregatedStats: Required<WuxiaStatBundle>;
};

export type WuxiaDraftOption = {
  readonly id: string;
  readonly kind: WuxiaManualKind;
  readonly rarity: WuxiaManualRarity;
  readonly name: string;
  readonly icon: string;
  readonly currentLevel: number;
  readonly nextLevel: number;
  readonly maxLevel: number;
  readonly badge: string;
  readonly description: string;
  readonly isSecretAwakening: boolean;
  readonly tags: readonly string[];
};

export const WUXIA_MAX_ACTIVE_SLOTS = 3;
export const WUXIA_MAX_INNER_QI_SLOTS = 3;
export const WUXIA_MAX_MANUAL_LEVEL = 3;

export const WUXIA_ACTIVE_ARTS: readonly WuxiaActiveArt[] = [
  {
    id: 'art_dragon_palm',
    kind: 'active',
    name: '18 Dragon-Subduing Palms',
    shortName: 'Dragon Palms',
    icon: '🐉',
    sectOrigin: 'Beggar Sect Stance',
    colorHex: 0xf59e0b,
    style: 'palm_wave',
    cooldownsMs: [2800, 2450, 2050],
    powerMults: [1.35, 1.75, 2.3],
    projectileCounts: [1, 2, 3],
    levelDescriptions: [
      'Unleash 1 golden dragon-qi palm wave forward (1.35x ATK + knockback).',
      'Sweep 2 roaring dragon palms in a wider arc (1.75x ATK + knockback).',
      'ULTIMATE: 3 piercing golden dragon palms crush cult lines (2.30x ATK).',
    ],
    pairedQiId: 'qi_nine_yang',
    synergyId: 'syn_sovereign_dragon',
  },
  {
    id: 'art_jade_sword',
    kind: 'active',
    name: 'Jade Maiden Swordplay',
    shortName: 'Jade Sword',
    icon: '🗡️',
    sectOrigin: 'Ancient Tomb Lineage',
    colorHex: 0x38bdf8,
    style: 'jade_swords',
    cooldownsMs: [2300, 1950, 1600],
    powerMults: [1.1, 1.42, 1.8],
    projectileCounts: [2, 3, 4],
    levelDescriptions: [
      'Project 2 swift jade sword-qi blades toward nearby cultists (1.10x ATK).',
      'Launch 3 crescent jade blades with swift meridian tempo (1.42x ATK).',
      'ULTIMATE: 4 synchronized moon-jade blades carve crowds (1.80x ATK).',
    ],
    pairedQiId: 'qi_nine_yin',
    synergyId: 'syn_melancholic_sword',
  },
  {
    id: 'art_dog_staff',
    kind: 'active',
    name: 'Beggar Dog-Beating Staff',
    shortName: 'Emerald Staff',
    icon: '🎋',
    sectOrigin: 'Chief Rod Forms',
    colorHex: 0x10b981,
    style: 'staff_spin',
    cooldownsMs: [2600, 2250, 1850],
    powerMults: [1.2, 1.58, 2.05],
    projectileCounts: [1, 2, 3],
    levelDescriptions: [
      'Whirl an emerald bamboo arc hitting all adjacent cultists (1.20x ATK).',
      'Double sweeping staff vortex expands reach and staggers foes (1.58x ATK).',
      'ULTIMATE: Tempest Bamboo Wheel breaks guard & slows hordes (2.05x ATK).',
    ],
    pairedQiId: 'qi_heaven_earth',
    synergyId: 'syn_all_dogs_bow',
  },
  {
    id: 'art_heavy_iron',
    kind: 'active',
    name: 'Xuantie Heavy Iron Cleave',
    shortName: 'Iron Cleave',
    icon: '⚔️',
    sectOrigin: 'Sword Tomb Valley',
    colorHex: 0xa855f7,
    style: 'iron_cleave',
    cooldownsMs: [3400, 3000, 2600],
    powerMults: [1.85, 2.4, 3.15],
    projectileCounts: [1, 1, 2],
    levelDescriptions: [
      'Slam a blunt black-iron shockwave ahead (1.85x ATK + brief stun).',
      'Massive obsidian quake ruptures frontline cult guards (2.40x ATK).',
      'ULTIMATE: Twin Sword-Tomb fissures crush cult packs (3.15x ATK).',
    ],
    pairedQiId: 'qi_solitary_sword',
    synergyId: 'syn_sword_tomb_unbroken',
  },
  {
    id: 'art_jade_flute',
    kind: 'active',
    name: 'Peach Blossom Jade Flute',
    shortName: 'Jade Flute',
    icon: '🪈',
    sectOrigin: 'Eastern Sea Pavilion',
    colorHex: 0x2dd4bf,
    style: 'flute_sonic',
    cooldownsMs: [2500, 2150, 1750],
    powerMults: [1.05, 1.35, 1.72],
    projectileCounts: [2, 3, 4],
    levelDescriptions: [
      'Send 2 sonic flute notes that ricochet cleanly between foes (1.05x ATK).',
      'Play 3 harmonic qi notes bouncing deeper through waves (1.35x ATK).',
      'ULTIMATE: 4 Tide-Song echoes shatter inner guards (1.72x ATK).',
    ],
    pairedQiId: 'qi_bagua_harmony',
    synergyId: 'syn_azure_sea_symphony',
  },
  {
    id: 'art_ice_needle',
    kind: 'active',
    name: 'Soul-Chilling Ice Needles',
    shortName: 'Ice Needles',
    icon: '❄️',
    sectOrigin: 'Red-Silk Frost Art',
    colorHex: 0x818cf8,
    style: 'venom_needles',
    cooldownsMs: [2400, 2050, 1700],
    powerMults: [0.95, 1.22, 1.55],
    projectileCounts: [3, 5, 7],
    levelDescriptions: [
      'Loose 3 homing silver frost needles that chill targets (0.95x ATK).',
      'Fire 5 tracking chill needles across the chamber (1.22x ATK).',
      'ULTIMATE: 7 Frozen Silk needles lock onto cultists (1.55x ATK).',
    ],
    pairedQiId: 'qi_toad_venom',
    synergyId: 'syn_thousand_venom_lotus',
  },
];

export const WUXIA_INNER_QI: readonly WuxiaInnerQi[] = [
  {
    id: 'qi_nine_yang',
    kind: 'inner_qi',
    name: 'Nine Yang Divine Qi',
    shortName: 'Nine Yang',
    icon: '☀️',
    sectOrigin: 'Shaolin Lantern Scroll',
    colorHex: 0xf97316,
    levelDescriptions: [
      '+12% Max HP, +10 Armor, +45 Floor Qi Barrier.',
      '+24% Max HP, +22 Armor, +95 Floor Qi Barrier.',
      '+38% Max HP, +36 Armor, +160 Floor Qi Barrier.',
    ],
    levelStats: [
      { hpPct: 0.12, armorFlat: 10, shieldOnFloor: 45 },
      { hpPct: 0.24, armorFlat: 22, shieldOnFloor: 95 },
      { hpPct: 0.38, armorFlat: 36, shieldOnFloor: 160 },
    ],
  },
  {
    id: 'qi_nine_yin',
    kind: 'inner_qi',
    name: 'Nine Yin True Scripture',
    shortName: 'Nine Yin',
    icon: '🌙',
    sectOrigin: 'Huang Yaoshi Vault',
    colorHex: 0x60a5fa,
    levelDescriptions: [
      '+12% ATK, +8% Crit Chance, +10% Tempo.',
      '+24% ATK, +16% Crit Chance, +20% Tempo.',
      '+38% ATK, +25% Crit Chance, +32% Tempo.',
    ],
    levelStats: [
      { atkPct: 0.12, critChance: 0.08, speedPct: 0.1 },
      { atkPct: 0.24, critChance: 0.16, speedPct: 0.2 },
      { atkPct: 0.38, critChance: 0.25, speedPct: 0.32 },
    ],
  },
  {
    id: 'qi_heaven_earth',
    kind: 'inner_qi',
    name: 'Void Step Qinggong',
    shortName: 'Void Qinggong',
    icon: '💨',
    sectOrigin: 'Quanzhen Cloud Path',
    colorHex: 0x34d399,
    levelDescriptions: [
      '+12% Skill Haste (CDR), +7% Dodge, +10% Speed.',
      '+24% Skill Haste (CDR), +14% Dodge, +20% Speed.',
      '+36% Skill Haste (CDR), +22% Dodge, +32% Speed.',
    ],
    levelStats: [
      { cooldownReduction: 0.12, dodgeChance: 0.07, speedPct: 0.1 },
      { cooldownReduction: 0.24, dodgeChance: 0.14, speedPct: 0.2 },
      { cooldownReduction: 0.36, dodgeChance: 0.22, speedPct: 0.32 },
    ],
  },
  {
    id: 'qi_solitary_sword',
    kind: 'inner_qi',
    name: 'Dugu Sword Intent',
    shortName: 'Sword Intent',
    icon: '⚡',
    sectOrigin: 'Sword Demon Hermitage',
    colorHex: 0xc084fc,
    levelDescriptions: [
      '+25% Crit DMG, +10% ATK, +6% Crit Chance.',
      '+55% Crit DMG, +22% ATK, +12% Crit Chance.',
      '+90% Crit DMG, +36% ATK, +18% Crit Chance.',
    ],
    levelStats: [
      { critDamage: 0.25, atkPct: 0.1, critChance: 0.06 },
      { critDamage: 0.55, atkPct: 0.22, critChance: 0.12 },
      { critDamage: 0.9, atkPct: 0.36, critChance: 0.18 },
    ],
  },
  {
    id: 'qi_bagua_harmony',
    kind: 'inner_qi',
    name: 'Eight Trigram Meridian Art',
    shortName: 'Bagua Qi',
    icon: '☯️',
    sectOrigin: 'Peach Blossom Isle',
    colorHex: 0x2dd4bf,
    levelDescriptions: [
      '+10% CDR, +10% Max HP, +18% Silver Taels.',
      '+20% CDR, +20% Max HP, +36% Silver Taels.',
      '+32% CDR, +32% Max HP, +55% Silver Taels.',
    ],
    levelStats: [
      { cooldownReduction: 0.1, hpPct: 0.1, goldBonusPct: 0.18 },
      { cooldownReduction: 0.2, hpPct: 0.2, goldBonusPct: 0.36 },
      { cooldownReduction: 0.32, hpPct: 0.32, goldBonusPct: 0.55 },
    ],
  },
  {
    id: 'qi_toad_venom',
    kind: 'inner_qi',
    name: 'Western Toad Stance',
    shortName: 'Toad Stance',
    icon: '🐸',
    sectOrigin: 'White Camel Peak',
    colorHex: 0xa3e635,
    levelDescriptions: [
      '+4% Lifesteal, +12 Armor, +10% ATK.',
      '+8% Lifesteal, +26 Armor, +22% ATK.',
      '+13% Lifesteal, +42 Armor, +36% ATK.',
    ],
    levelStats: [
      { lifesteal: 0.04, armorFlat: 12, atkPct: 0.1 },
      { lifesteal: 0.08, armorFlat: 26, atkPct: 0.22 },
      { lifesteal: 0.13, armorFlat: 42, atkPct: 0.36 },
    ],
  },
  {
    id: 'qi_iron_cloth',
    kind: 'inner_qi',
    name: 'Golden Bell Iron Shirt',
    shortName: 'Golden Bell',
    icon: '🔔',
    sectOrigin: 'External Body Refinement',
    colorHex: 0xfbbf24,
    levelDescriptions: [
      '+18 Armor, +15% Max HP.',
      '+38 Armor, +30% Max HP.',
      '+65 Armor, +50% Max HP.',
    ],
    levelStats: [
      { armorFlat: 18, hpPct: 0.15 },
      { armorFlat: 38, hpPct: 0.3 },
      { armorFlat: 65, hpPct: 0.5 },
    ],
  },
  {
    id: 'qi_star_absorb',
    kind: 'inner_qi',
    name: 'Northern Abyss Qi Absorption',
    shortName: 'Abyss Qi',
    icon: '🌀',
    sectOrigin: 'Carefree Ravine',
    colorHex: 0xf472b6,
    levelDescriptions: [
      '+5% Lifesteal, +12% Crit DMG, +18% Silver Taels.',
      '+10% Lifesteal, +28% Crit DMG, +36% Silver Taels.',
      '+16% Lifesteal, +45% Crit DMG, +60% Silver Taels.',
    ],
    levelStats: [
      { lifesteal: 0.05, critDamage: 0.12, goldBonusPct: 0.18 },
      { lifesteal: 0.1, critDamage: 0.28, goldBonusPct: 0.36 },
      { lifesteal: 0.16, critDamage: 0.45, goldBonusPct: 0.6 },
    ],
  },
];

export const WUXIA_SECRET_SYNERGIES: readonly WuxiaSecretSynergy[] = [
  {
    id: 'syn_sovereign_dragon',
    kind: 'synergy',
    name: 'True Dragon Sovereign Palm',
    shortName: 'Sovereign Dragon',
    icon: '🐲',
    colorHex: 0xfef08a,
    activeId: 'art_dragon_palm',
    innerQiId: 'qi_nine_yang',
    riddleHint:
      'When eighteen palms roar beside scorching solar heat, a golden sovereign shakes the spire.',
    description:
      'PEERLESS SYNERGY: Unleashes 5 blazing Imperial Dragon Waves (3.40x ATK) + +22% ATK & +25 Armor.',
    powerMult: 3.4,
    projectileCount: 5,
    cooldownMs: 1750,
    bonusStats: { atkPct: 0.22, armorFlat: 25, shieldOnFloor: 120 },
  },
  {
    id: 'syn_melancholic_sword',
    kind: 'synergy',
    name: 'Melancholic Sword of Parting',
    shortName: 'Parting Sword',
    icon: '🌸',
    colorHex: 0x7dd3fc,
    activeId: 'art_jade_sword',
    innerQiId: 'qi_nine_yin',
    riddleHint:
      'Let Tomb swordplay cross currents with the cold Moon Scripture, and parting longing turns into six phantom blades.',
    description:
      'PEERLESS SYNERGY: Twin Condor Aura fires 6 phantom blades (2.75x ATK) + +18% Crit Chance & +20% Speed.',
    powerMult: 2.75,
    projectileCount: 6,
    cooldownMs: 1350,
    bonusStats: { critChance: 0.18, speedPct: 0.2, atkPct: 0.16 },
  },
  {
    id: 'syn_all_dogs_bow',
    kind: 'synergy',
    name: 'Thirty-Six Forms: Heaven Under Staff',
    shortName: 'Heaven Under Staff',
    icon: '👑',
    colorHex: 0x6ee7b7,
    activeId: 'art_dog_staff',
    innerQiId: 'qi_heaven_earth',
    riddleHint:
      'Tread weightless clouds while gripping the beggar chief rod, and every beast beneath Heaven bows.',
    description:
      'PEERLESS SYNERGY: Grand emerald whirlwind sweeps the chamber (3.10x ATK, wide stun) + +15% Dodge & +15% CDR.',
    powerMult: 3.1,
    projectileCount: 4,
    cooldownMs: 1500,
    bonusStats: { dodgeChance: 0.15, cooldownReduction: 0.15, speedPct: 0.16 },
  },
  {
    id: 'syn_sword_tomb_unbroken',
    kind: 'synergy',
    name: 'Nine-Sword Tomb Resonance',
    shortName: 'Sword Tomb',
    icon: '🗡️',
    colorHex: 0xe879f9,
    activeId: 'art_heavy_iron',
    innerQiId: 'qi_solitary_sword',
    riddleHint:
      'Pair the heavy unedged black iron blade with formless Solitary Intent to wake buried legends.',
    description:
      'PEERLESS SYNERGY: Crushes crowds with 6 spectral orbiting blades & tremors (4.20x ATK) + +55% Crit DMG.',
    powerMult: 4.2,
    projectileCount: 6,
    cooldownMs: 2100,
    bonusStats: { critDamage: 0.55, atkPct: 0.24 },
  },
  {
    id: 'syn_azure_sea_symphony',
    kind: 'synergy',
    name: 'Azure Tide Peerless Symphony',
    shortName: 'Azure Symphony',
    icon: '🌊',
    colorHex: 0x5eead4,
    activeId: 'art_jade_flute',
    innerQiId: 'qi_bagua_harmony',
    riddleHint:
      'Align the eight trigrams to a lone bamboo flute and the Eastern Tide Shatters every cult pulse.',
    description:
      'PEERLESS SYNERGY: 6 golden-azure notes chain rapidly across cult ranks (2.65x ATK) + +15% CDR & +30% Taels.',
    powerMult: 2.65,
    projectileCount: 6,
    cooldownMs: 1450,
    bonusStats: { cooldownReduction: 0.15, goldBonusPct: 0.3, hpPct: 0.18 },
  },
  {
    id: 'syn_thousand_venom_lotus',
    kind: 'synergy',
    name: 'Thousand-Frost Lotus Volley',
    shortName: 'Frost Lotus',
    icon: '🪷',
    colorHex: 0xc4b5fd,
    activeId: 'art_ice_needle',
    innerQiId: 'qi_toad_venom',
    riddleHint:
      'Temper venomous Toad breath inside silver frost needles until a thousand winter petals bloom.',
    description:
      'PEERLESS SYNERGY: Fires 10 homing frost-venom lotus needles (2.35x ATK) + +6% Lifesteal & +20% ATK.',
    powerMult: 2.35,
    projectileCount: 10,
    cooldownMs: 1400,
    bonusStats: { lifesteal: 0.06, atkPct: 0.2, armorFlat: 20 },
  },
];

export const WUXIA_ENLIGHTENMENT_SCROLLS: readonly WuxiaEnlightenmentScroll[] = [
  {
    id: 'enlighten_qi_surge',
    kind: 'enlightenment',
    name: 'Dantian Breakthrough',
    shortName: 'Dantian Surge',
    icon: '✨',
    colorHex: 0xfbbf24,
    description: 'Endless Cultivation: +14% ATK & +12% Max HP (stackable).',
    bonusStats: { atkPct: 0.14, hpPct: 0.12 },
  },
  {
    id: 'enlighten_steel_will',
    kind: 'enlightenment',
    name: 'Vajra Meridian Polish',
    shortName: 'Vajra Polish',
    icon: '🛡️',
    colorHex: 0x38bdf8,
    description: 'Endless Cultivation: +14 Armor & +22% Crit DMG (stackable).',
    bonusStats: { armorFlat: 14, critDamage: 0.22 },
  },
  {
    id: 'enlighten_treasury',
    kind: 'enlightenment',
    name: 'Jianghu Spoils Instinct',
    shortName: 'Spoils Instinct',
    icon: '🪙',
    colorHex: 0x10b981,
    description: 'Endless Cultivation: +20% Silver Taels & +5% Lifesteal (stackable).',
    bonusStats: { goldBonusPct: 0.2, lifesteal: 0.05 },
  },
];

export const ALL_WUXIA_MANUALS: readonly WuxiaManualEntry[] = [
  ...WUXIA_ACTIVE_ARTS,
  ...WUXIA_INNER_QI,
  ...WUXIA_SECRET_SYNERGIES,
  ...WUXIA_ENLIGHTENMENT_SCROLLS,
];

export const getWuxiaManualById = (id: string): WuxiaManualEntry | null =>
  ALL_WUXIA_MANUALS.find((entry) => entry.id === id) ?? null;

export const getWuxiaActiveArtById = (id: string): WuxiaActiveArt | null =>
  WUXIA_ACTIVE_ARTS.find((entry) => entry.id === id) ?? null;

export const getWuxiaInnerQiById = (id: string): WuxiaInnerQi | null =>
  WUXIA_INNER_QI.find((entry) => entry.id === id) ?? null;

export const getWuxiaSynergyById = (id: string): WuxiaSecretSynergy | null =>
  WUXIA_SECRET_SYNERGIES.find((entry) => entry.id === id) ?? null;

const emptyStats = (): {
  hpPct: number;
  atkPct: number;
  speedPct: number;
  armorFlat: number;
  critChance: number;
  critDamage: number;
  dodgeChance: number;
  cooldownReduction: number;
  lifesteal: number;
  goldBonusPct: number;
  shieldOnFloor: number;
} => ({
  hpPct: 0,
  atkPct: 0,
  speedPct: 0,
  armorFlat: 0,
  critChance: 0,
  critDamage: 0,
  dodgeChance: 0,
  cooldownReduction: 0,
  lifesteal: 0,
  goldBonusPct: 0,
  shieldOnFloor: 0,
});

const addBundle = (
  acc: ReturnType<typeof emptyStats>,
  bundle: WuxiaStatBundle
): void => {
  acc.hpPct += bundle.hpPct ?? 0;
  acc.atkPct += bundle.atkPct ?? 0;
  acc.speedPct += bundle.speedPct ?? 0;
  acc.armorFlat += bundle.armorFlat ?? 0;
  acc.critChance += bundle.critChance ?? 0;
  acc.critDamage += bundle.critDamage ?? 0;
  acc.dodgeChance += bundle.dodgeChance ?? 0;
  acc.cooldownReduction += bundle.cooldownReduction ?? 0;
  acc.lifesteal += bundle.lifesteal ?? 0;
  acc.goldBonusPct += bundle.goldBonusPct ?? 0;
  acc.shieldOnFloor += bundle.shieldOnFloor ?? 0;
};

export const computeWuxiaLoadout = (draftedIds: readonly string[]): WuxiaLoadoutSummary => {
  const activeOrder: string[] = [];
  const innerQiOrder: string[] = [];
  const activeLevels: Record<string, number> = {};
  const innerQiLevels: Record<string, number> = {};
  const awakenedSynergies: string[] = [];
  const enlightenmentCounts: Record<string, number> = {};

  for (const id of draftedIds) {
    const manual = getWuxiaManualById(id);
    if (!manual) continue;
    if (manual.kind === 'active') {
      const prev = activeLevels[id] ?? 0;
      if (prev === 0) {
        if (activeOrder.length >= WUXIA_MAX_ACTIVE_SLOTS) continue;
        activeOrder.push(id);
      }
      activeLevels[id] = Math.min(WUXIA_MAX_MANUAL_LEVEL, prev + 1);
    } else if (manual.kind === 'inner_qi') {
      const prev = innerQiLevels[id] ?? 0;
      if (prev === 0) {
        if (innerQiOrder.length >= WUXIA_MAX_INNER_QI_SLOTS) continue;
        innerQiOrder.push(id);
      }
      innerQiLevels[id] = Math.min(WUXIA_MAX_MANUAL_LEVEL, prev + 1);
    } else if (manual.kind === 'synergy') {
      if (!awakenedSynergies.includes(id)) {
        awakenedSynergies.push(id);
      }
    } else if (manual.kind === 'enlightenment') {
      enlightenmentCounts[id] = (enlightenmentCounts[id] ?? 0) + 1;
    }
  }

  const aggregatedStats = emptyStats();

  for (const qiId of innerQiOrder) {
    const qi = getWuxiaInnerQiById(qiId);
    const lv = innerQiLevels[qiId] ?? 0;
    if (qi && lv >= 1) {
      const idx = Math.min(2, Math.max(0, lv - 1));
      const bundle = qi.levelStats[idx];
      if (bundle) addBundle(aggregatedStats, bundle);
    }
  }

  for (const synId of awakenedSynergies) {
    const syn = getWuxiaSynergyById(synId);
    if (syn) {
      addBundle(aggregatedStats, syn.bonusStats);
    }
  }

  for (const scroll of WUXIA_ENLIGHTENMENT_SCROLLS) {
    const count = enlightenmentCounts[scroll.id] ?? 0;
    for (let i = 0; i < count; i++) {
      addBundle(aggregatedStats, scroll.bonusStats);
    }
  }

  const availableSynergies = WUXIA_SECRET_SYNERGIES.filter((syn) => {
    if (awakenedSynergies.includes(syn.id)) return false;
    const actLv = activeLevels[syn.activeId] ?? 0;
    const qiLv = innerQiLevels[syn.innerQiId] ?? 0;
    return actLv >= WUXIA_MAX_MANUAL_LEVEL && qiLv >= 1;
  });

  const actives: WuxiaSlotEntry[] = activeOrder.map((id) => ({
    id,
    level: activeLevels[id] ?? 1,
  }));
  const innerQis: WuxiaSlotEntry[] = innerQiOrder.map((id) => ({
    id,
    level: innerQiLevels[id] ?? 1,
  }));

  return {
    actives,
    innerQis,
    activeLevels,
    innerQiLevels,
    awakenedSynergies,
    availableSynergies,
    enlightenmentCounts,
    aggregatedStats,
  };
};

type WeightedDraftCandidate = {
  readonly option: WuxiaDraftOption;
  readonly weight: number;
};

const toActiveDraftOption = (art: WuxiaActiveArt, curLv: number): WuxiaDraftOption => {
  const nextLv = Math.min(WUXIA_MAX_MANUAL_LEVEL, curLv + 1);
  const idx = Math.min(2, Math.max(0, nextLv - 1));
  const desc = art.levelDescriptions[idx] ?? art.levelDescriptions[0];
  return {
    id: art.id,
    kind: 'active',
    rarity: nextLv >= 3 ? 'ultimate' : nextLv === 2 ? 'esoteric' : 'martial',
    name: art.name,
    icon: art.icon,
    currentLevel: curLv,
    nextLevel: nextLv,
    maxLevel: WUXIA_MAX_MANUAL_LEVEL,
    badge: curLv === 0 ? 'NEW ART' : nextLv >= 3 ? 'LV.3 ULTIMATE' : `UPGRADE LV.${nextLv}`,
    description: desc,
    isSecretAwakening: false,
    tags: [art.sectOrigin, `Active ${nextLv}/3`],
  };
};

const toInnerQiDraftOption = (qi: WuxiaInnerQi, curLv: number): WuxiaDraftOption => {
  const nextLv = Math.min(WUXIA_MAX_MANUAL_LEVEL, curLv + 1);
  const idx = Math.min(2, Math.max(0, nextLv - 1));
  const desc = qi.levelDescriptions[idx] ?? qi.levelDescriptions[0];
  return {
    id: qi.id,
    kind: 'inner_qi',
    rarity: nextLv >= 3 ? 'esoteric' : 'martial',
    name: qi.name,
    icon: qi.icon,
    currentLevel: curLv,
    nextLevel: nextLv,
    maxLevel: WUXIA_MAX_MANUAL_LEVEL,
    badge: curLv === 0 ? 'NEW NEIGONG' : `QI LV.${nextLv}/3`,
    description: desc,
    isSecretAwakening: false,
    tags: [qi.sectOrigin, `Inner Qi ${nextLv}/3`],
  };
};

const toSynergyDraftOption = (syn: WuxiaSecretSynergy): WuxiaDraftOption => ({
  id: syn.id,
  kind: 'synergy',
  rarity: 'peerless',
  name: syn.name,
  icon: syn.icon,
  currentLevel: 0,
  nextLevel: 1,
  maxLevel: 1,
  badge: 'SECRET SYNERGY',
  description: syn.description,
  isSecretAwakening: true,
  tags: ['Peerless Awakening', 'Secret Combo'],
});

const toEnlightenmentDraftOption = (
  scroll: WuxiaEnlightenmentScroll,
  curCount: number
): WuxiaDraftOption => ({
  id: scroll.id,
  kind: 'enlightenment',
  rarity: 'enlightenment',
  name: scroll.name,
  icon: scroll.icon,
  currentLevel: curCount,
  nextLevel: curCount + 1,
  maxLevel: 99,
  badge: curCount > 0 ? `STACK x${curCount + 1}` : 'ENLIGHTENMENT',
  description: scroll.description,
  isSecretAwakening: false,
  tags: ['Endless Spire', 'Stackable'],
});

export const buildWuxiaDraftCandidates = (
  draftedIds: readonly string[],
  floor: number
): readonly WeightedDraftCandidate[] => {
  const loadout = computeWuxiaLoadout(draftedIds);
  const candidates: WeightedDraftCandidate[] = [];

  for (const syn of loadout.availableSynergies) {
    candidates.push({
      option: toSynergyDraftOption(syn),
      weight: 9,
    });
  }

  const activeSlotsFull = loadout.actives.length >= WUXIA_MAX_ACTIVE_SLOTS;
  for (const art of WUXIA_ACTIVE_ARTS) {
    const curLv = loadout.activeLevels[art.id] ?? 0;
    if (curLv >= WUXIA_MAX_MANUAL_LEVEL) continue;
    if (curLv === 0 && activeSlotsFull) continue;
    const isFloor1 = floor <= 1;
    const baseWeight = curLv > 0 ? 3.4 : isFloor1 ? 3.2 : 2.4;
    candidates.push({
      option: toActiveDraftOption(art, curLv),
      weight: baseWeight,
    });
  }

  const qiSlotsFull = loadout.innerQis.length >= WUXIA_MAX_INNER_QI_SLOTS;
  for (const qi of WUXIA_INNER_QI) {
    const curLv = loadout.innerQiLevels[qi.id] ?? 0;
    if (curLv >= WUXIA_MAX_MANUAL_LEVEL) continue;
    if (curLv === 0 && qiSlotsFull) continue;
    const hasPairedMaxArt = WUXIA_SECRET_SYNERGIES.some(
      (syn) => syn.innerQiId === qi.id && (loadout.activeLevels[syn.activeId] ?? 0) >= 2
    );
    const weight = curLv > 0 ? 3.0 : hasPairedMaxArt ? 2.6 : 2.2;
    candidates.push({
      option: toInnerQiDraftOption(qi, curLv),
      weight,
    });
  }

  if (candidates.length < 3) {
    for (const scroll of WUXIA_ENLIGHTENMENT_SCROLLS) {
      const curCount = loadout.enlightenmentCounts[scroll.id] ?? 0;
      candidates.push({
        option: toEnlightenmentDraftOption(scroll, curCount),
        weight: 1.4,
      });
    }
  }

  return candidates;
};

const pickWeightedIndex = (
  items: readonly WeightedDraftCandidate[],
  rng: () => number
): number => {
  let total = 0;
  for (const item of items) {
    total += Math.max(0.01, item.weight);
  }
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    const entry = items[i];
    if (!entry) continue;
    roll -= Math.max(0.01, entry.weight);
    if (roll <= 0) return i;
  }
  return Math.max(0, items.length - 1);
};

export const rollWuxiaDraftCards = (
  rng: () => number,
  draftedIds: readonly string[],
  floor: number,
  count = 3
): readonly WuxiaDraftOption[] => {
  const pool = [...buildWuxiaDraftCandidates(draftedIds, floor)];
  const picks: WuxiaDraftOption[] = [];

  // Guarantee at least one Active Martial Art on Floor 1 if player still has 0 Active Arts.
  const loadout = computeWuxiaLoadout(draftedIds);
  if (loadout.actives.length === 0) {
    const activeOnly = pool.filter((item) => item.option.kind === 'active');
    if (activeOnly.length > 0) {
      const idxInActive = pickWeightedIndex(activeOnly, rng);
      const chosen = activeOnly[idxInActive];
      if (chosen) {
        picks.push(chosen.option);
        const removeIdx = pool.findIndex((item) => item.option.id === chosen.option.id);
        if (removeIdx >= 0) pool.splice(removeIdx, 1);
      }
    }
  }

  while (picks.length < count && pool.length > 0) {
    const idx = pickWeightedIndex(pool, rng);
    const chosen = pool.splice(idx, 1)[0];
    if (chosen) {
      picks.push(chosen.option);
    }
  }

  return picks;
};

export const refreshWuxiaDraftCard = (
  rng: () => number,
  draftedIds: readonly string[],
  floor: number,
  currentHandIds: readonly string[],
  excludeId: string
): WuxiaDraftOption | null => {
  const blocked = new Set<string>([...currentHandIds, excludeId]);
  const pool = buildWuxiaDraftCandidates(draftedIds, floor).filter(
    (entry) => !blocked.has(entry.option.id)
  );
  if (pool.length === 0) {
    const fallbackPool = buildWuxiaDraftCandidates(draftedIds, floor).filter(
      (entry) => entry.option.id !== excludeId
    );
    if (fallbackPool.length === 0) return null;
    const idx = pickWeightedIndex(fallbackPool, rng);
    return fallbackPool[idx]?.option ?? null;
  }
  const idx = pickWeightedIndex(pool, rng);
  return pool[idx]?.option ?? null;
};

export const isCultLeaderFloor = (floor: number): boolean =>
  floor >= 10 && floor % 10 === 0;

export const getMiniBossFloorsForBracket = (
  bracketIndex: number,
  seed: number
): readonly [number, number] => {
  const bracketStart = bracketIndex * 10 + 1;
  // Candidate floors inside each 10-floor bracket: 2..9, 12..19, 22..29, ...
  const candidates: number[] = [];
  for (let offset = 1; offset <= 8; offset++) {
    candidates.push(bracketStart + offset);
  }
  const mixed = (seed ^ Math.imul(bracketIndex + 1, 2654435761)) >>> 0;
  const firstIdx = mixed % candidates.length;
  const firstFloor = candidates[firstIdx] ?? bracketStart + 3;
  const remaining = candidates.filter((f) => f !== firstFloor && Math.abs(f - firstFloor) >= 2);
  const pool2 = remaining.length > 0 ? remaining : candidates.filter((f) => f !== firstFloor);
  const mixed2 = Math.imul(mixed ^ 0x9e3779b9, 2246822519) >>> 0;
  const secondFloor = pool2[mixed2 % pool2.length] ?? bracketStart + 6;
  return firstFloor < secondFloor ? [firstFloor, secondFloor] : [secondFloor, firstFloor];
};

export const isRandomMiniBossFloor = (floor: number, seed: number): boolean => {
  if (floor <= 1 || isCultLeaderFloor(floor)) return false;
  const bracketIndex = Math.floor((floor - 1) / 10);
  const [f1, f2] = getMiniBossFloorsForBracket(bracketIndex, seed);
  return floor === f1 || floor === f2;
};

export const getWuxiaFloorBracketTitle = (floor: number): string => {
  if (isCultLeaderFloor(floor)) return 'Cult Leader Sanctum';
  if (floor <= 10) return 'Outer Martial Courtyard';
  if (floor <= 20) return 'Inner Sect Pagoda';
  if (floor <= 30) return 'Grandmaster Peak';
  return 'Peerless Abyss Ascent';
};
