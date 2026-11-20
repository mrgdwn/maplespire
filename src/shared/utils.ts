import { BIOME_CATALOG } from './catalogs/biomes.ts';
import { CLASS_IDS, GEAR_SLOTS, getClassDefinition } from './catalogs/classes.ts';
import {
  LEGENDARY_CATALOG,
  getLegendariesForClass,
  getLegendaryById,
} from './catalogs/legendaries.ts';
import { computeWuxiaLoadout } from './catalogs/wuxia.ts';
import type {
  BiomeId,
  ClassId,
  ClassProgress,
  ClassesProgressMap,
  DailyMasteryBounty,
  DailyMasteryBountyId,
  DailySectDecree,
  ElementId,
  EquippedGearMap,
  GearItem,
  GearSlot,
  GearTier,
  LeaderboardEntry,
  LegionLevels,
  LegionStatKey,
  LoginStreakState,
  PlayerProfile,
  RunOutcome,
  SlotLevelsMap,
} from './types.ts';

export const hashString = (input: string): number => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const getUtcDateKey = (now: Date = new Date()): string => {
  return now.toISOString().slice(0, 10);
};

export const daysBetweenUtc = (earlierDateKey: string, laterDateKey: string): number => {
  if (!earlierDateKey || !laterDateKey) return 0;
  const a = Date.parse(`${earlierDateKey}T00:00:00Z`);
  const b = Date.parse(`${laterDateKey}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
};

export const getDailyChallengeConfig = (
  dateKey: string
): { seed: number; biomeId: BiomeId; bountyClass: ClassId } => {
  const seed = hashString(`wuxiaspire:${dateKey}`);
  const rng = mulberry32(seed);
  const biomeIndex = Math.floor(rng() * BIOME_CATALOG.length);
  const classIndex = Math.floor(rng() * CLASS_IDS.length);
  const biome = BIOME_CATALOG[biomeIndex] ?? BIOME_CATALOG[0];
  const bountyClass = CLASS_IDS[classIndex] ?? 'warrior';
  if (!biome) {
    throw new Error('BIOME_CATALOG is empty');
  }
  return {
    seed,
    biomeId: biome.id,
    bountyClass,
  };
};

export const expForNextLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(Math.max(1, level), 1.35));
};

export const awardClassExp = (
  cls: ClassProgress,
  gainedExp: number
): { updated: ClassProgress; leveledUp: boolean } => {
  let level = cls.level;
  let exp = cls.exp + Math.max(0, Math.floor(gainedExp));
  let leveledUp = false;

  while (exp >= expForNextLevel(level) && level < 99) {
    exp -= expForNextLevel(level);
    level += 1;
    leveledUp = true;
  }

  return {
    updated: {
      ...cls,
      level,
      exp,
    },
    leveledUp,
  };
};

export const getSlotUpgradeCost = (slotLevel: number): { shards: number; gold: number } => ({
  shards: 10 + slotLevel * 6,
  gold: 0,
});

export const SANCTUM_PURIFY_COST = {
  shards: 25,
  bossCores: 2,
};

export const BANISH_SLOT_COSTS: readonly number[] = [0, 100, 250, 500, 1000, 2000];

export const getNextBanishSlotCost = (currentSlots: number): number | null => {
  if (currentSlots >= 5) return null;
  return BANISH_SLOT_COSTS[currentSlots] ?? 2000;
};

export const getLegionUpgradeCost = (currentLevel: number): number => {
  return Math.floor(50 * Math.pow(1.25, currentLevel));
};

export const getDismantleShardValue = (item: GearItem): number => {
  const powerBonus = Math.max(0, Math.floor(item.baseStatBonus / (item.tier === 'legendary' ? 4 : item.tier === 'rare' ? 6 : 10)));
  if (item.tier === 'legendary') {
    const pristineBonus = item.isCursed ? 0 : 8;
    return 28 + Math.floor(item.level * 1.5) + powerBonus + pristineBonus;
  }
  if (item.tier === 'rare') {
    return 10 + Math.floor(item.level * 0.8) + powerBonus;
  }
  return 4 + Math.floor(item.level * 0.4) + powerBonus;
};

const NORMAL_FALLBACK_NAMES: Record<GearSlot, string> = {
  weapon: 'Wuxia Blade',
  headgear: 'Silk Headband',
  top: 'Wuxia Robe',
  cape: 'Cloud Mantle',
};

const CLASS_WEAPON_NAMES: Record<ClassId, readonly string[]> = {
  warrior: [
    'Black-Iron Broadsword (玄铁阔剑)',
    'Yanling Willow-Leaf Saber (雁翎刀)',
    'Mount Song Ring-Pommel Dao (厚背环刀)',
    'Tiger-Head Crescent Blade (虎头月牙刀)',
    'Heavy Steel Falchion (厚背重砍刀)',
    'Dragon-Pattern Greatsword (龙纹大剑)',
  ],
  mage: [
    'Green-Bamboo Staff (青竹仗)',
    'Mount Wudang Peachwood Sword (武当桃木剑)',
    'Cold-Jade Melody Flute (寒玉长笛)',
    'Seven-Star Bronze Sword (七星古铜剑)',
    'Daoist Pure-Yang Whisk (纯阳拂尘)',
    'Ancient Tomb Iron-Lute (古墓铁琴)',
  ],
  thief: [
    'Willow-Leaf Twin Daggers (柳叶双刃)',
    'Iron-Ribbed Scholar Fan (铁骨折扇)',
    'Cicada-Wing Shadow Blade (蝉翼短剑)',
    'Cold-Iron Stabbing Awl (透骨寒铁锥)',
    'Meteor Flying Darts (流星飞镖)',
    'Fish-Intestine Concealed Dagger (鱼肠短匕)',
  ],
  bowman: [
    'Black-Horn Steppe Recurve Bow (黑角复合弓)',
    'Mulberry-Wood Heavy Bow (落月桑木弓)',
    'Thousand-Needle Sleeve Launcher (袖里千针筒)',
    'Flying Feather Short Warbow (飞羽战弓)',
    'Iron-Bodkin Heavy Crossbow (穿云铁矢弩)',
    'Whistling-Wind Steppe Longbow (鸣镝长弓)',
  ],
};

const HEADGEAR_NAMES: readonly string[] = [
  'Bamboo Weaver Hat (竹编斗笠)',
  'Daoist Pure-Yang Topknot Cap (纯阳巾)',
  'Beggar Coarse Linen Bandana (丐帮粗葛巾)',
  'Ancient Tomb White-Jade Hairpin (古墓白玉簪)',
  'Mount Hua Scholar Crest (华山文生巾)',
  'Iron-Plate Martial Headband (青铜护额带)',
  'Cloud-Mist Concealment Veil (青纱遮面帽)',
];

const TOP_NAMES: readonly string[] = [
  'Wandering Disciple Indigo Robe (青布直裰)',
  'Daoist Eight-Trigram Vestment (太极八卦袍)',
  'Shaolin Hundred-Patch Monk Robe (百衲袈裟)',
  'Ancient Tomb Pure-White Silk Dress (素白轻纱长衫)',
  'Iron-Ring Leather Armor (铁环护心甲)',
  'Beggar Sect Patchwork Tunic (丐帮百结衣)',
  'Imperial Brocade Uniform (飞鱼锦衣)',
];

const CAPE_NAMES: readonly string[] = [
  'Wind-Torn Wanderer Cloak (破旧斗篷)',
  'Autumn-River Azure Silk Mantle (秋水长风披)',
  'Pine-Needle Weather Straw Cape (避雨蓑衣)',
  'Northern Steppe Wolf-Fur Mantle (北地狼皮氅)',
  'Night-Crow Stealth Silk Shroud (夜行隐风斗篷)',
  'Golden-Thread Cloud Scarf (金丝青云披)',
];

const RARE_PREFIXES: readonly string[] = [
  'Dragon-Forged',
  'Nine-Yang',
  'Nine-Yin',
  'Black-Iron',
  'Cold-Jade',
  'Peach-Blossom',
  'Mount-Wudang',
  'Shaolin',
  'Beggar-Chief',
  'Ancient-Tomb',
  'Dugu',
  'Mount-Hua',
  'Tang-Clan',
  'Carefree',
];

const RARE_AFFIXES: readonly string[] = [
  '+14% Nine-Yang Inner Heat (+ATK & Yang Burn)',
  '+12% Nine-Yin Cold Meridian (Slow & Chill)',
  '+15% Dugu Sword Speed (+ATK Speed)',
  '+18% Dragon-Subduing Critical Power (+Crit DMG)',
  '+12% Acupoint Precision Strike (+Crit Chance)',
  '+16% Iron-Shirt Impenetrable Defense (+Armor)',
  '+15% Beggar Carefree Footwork (+Dodge)',
  '+10% Lingbo Microsteps (+Move Speed)',
  '+16% Hall Master Bane (+Boss DMG)',
  '+25% Taels & Silver Greed (+Gold Find)',
  '+10% Dantian Circulation (+Cooldown Reduction)',
  '+6% Blood-Demon Vitality Leech (+Lifesteal)',
  '+16% Meridian-Piercing Force (+Armor Pen)',
  '+15% Vitality Acupoint Harmony (+Max HP)',
  '+20% Wall-Slam Shockwave Damage',
  '+12% Spirit Barrier Generation',
  '+10% Evasive Counter-Slash Chance',
  '+15% Projectile Velocity & Piercing',
  '+12% Boss Stun Duration Extension',
  '+18% First-Strike Lethal Ambush',
];

export const createGearItem = (
  rng: () => number,
  classId: ClassId,
  slot: GearSlot,
  tier: 'normal' | 'rare',
  floorLevel: number,
  idSuffix: string
): GearItem => {
  const tierMult = tier === 'rare' ? 1.5 : 1.0;
  const baseStatBonus = Math.round((6 + floorLevel * 2.2) * tierMult);

  const baseName =
    slot === 'weapon'
      ? (CLASS_WEAPON_NAMES[classId][
          Math.floor(rng() * CLASS_WEAPON_NAMES[classId].length)
        ] ??
        CLASS_WEAPON_NAMES[classId][0] ??
        'Wuxia Blade')
      : slot === 'headgear'
        ? (HEADGEAR_NAMES[Math.floor(rng() * HEADGEAR_NAMES.length)] ?? 'Silk Headband')
        : slot === 'top'
          ? (TOP_NAMES[Math.floor(rng() * TOP_NAMES.length)] ?? 'Wuxia Robe')
          : (CAPE_NAMES[Math.floor(rng() * CAPE_NAMES.length)] ?? 'Cloud Mantle');

  let name = baseName;
  let affixText = 'Standard martial arts attire worn by Jianghu wanderers.';

  if (tier === 'rare') {
    const prefix = RARE_PREFIXES[Math.floor(rng() * RARE_PREFIXES.length)] ?? 'Dragon-Forged';
    const affix =
      RARE_AFFIXES[Math.floor(rng() * RARE_AFFIXES.length)] ??
      '+14% Nine-Yang Inner Heat (+ATK & Yang Burn)';
    name = `${prefix} ${baseName}`;
    affixText = affix;
  }

  return {
    id: `gear_${Date.now().toString(36)}_${idSuffix}`,
    name,
    slot,
    classId,
    tier,
    level: Math.max(1, floorLevel),
    baseStatBonus,
    affixText,
    sockets: [],
    maxSockets: 0,
    legendaryId: null,
    isCursed: false,
  };
};

export const createLegendaryGearItem = (
  rng: () => number,
  classId: ClassId,
  isCursed: boolean,
  idSuffix: string,
  floorLevel = 10
): GearItem => {
  const pool = getLegendariesForClass(classId);
  const weapons = pool.filter((item) => item.slot === 'weapon');
  const rollPool = weapons.length > 0 && rng() < 0.5 ? weapons : pool;
  const chosen = rollPool[Math.floor(rng() * rollPool.length)] ?? pool[0];
  if (!chosen) {
    throw new Error(`No legendaries defined for class ${classId}`);
  }
  const scaledFloor = Math.max(10, floorLevel);
  const baseStatBonus = Math.round(42 + Math.max(0, scaledFloor - 10) * 2.8);
  return {
    id: `leg_${Date.now().toString(36)}_${idSuffix}`,
    name: chosen.name,
    slot: chosen.slot,
    classId,
    tier: 'legendary',
    level: scaledFloor,
    baseStatBonus,
    affixText: chosen.signatureText,
    sockets: [],
    maxSockets: 0,
    legendaryId: chosen.id,
    isCursed,
  };
};

const createEmptyEquipped = (classId: ClassId): EquippedGearMap => {
  return {
    weapon: {
      id: `starter_wep_${classId}`,
      name: 'Unarmed Taiji Fist',
      slot: 'weapon',
      classId,
      tier: 'normal',
      level: 1,
      baseStatBonus: 6,
      affixText: 'Empty-handed Wuxia martial stance.',
      sockets: [],
      maxSockets: 0,
      legendaryId: null,
      isCursed: false,
    },
    headgear: null,
    top: null,
    cape: null,
  };
};

const createDefaultSlotLevels = (): SlotLevelsMap => ({
  weapon: 0,
  headgear: 0,
  top: 0,
  cape: 0,
});

const createClassProgress = (classId: ClassId): ClassProgress => ({
  classId,
  level: 1,
  exp: 0,
  equipped: createEmptyEquipped(classId),
  slotLevels: createDefaultSlotLevels(),
});

export const createDefaultLoginStreak = (): LoginStreakState => ({
  currentStreak: 0,
  longestStreak: 0,
  totalLoginDays: 0,
  lastClaimDate: '',
  graceUsedWeekKey: '',
  dailyChestsDate: '',
  dailyChestsClaimed: [],
  dailyBountyCompletedDate: '',
  endlessBestFloor: 0,
});

export const createInitialProfile = (username: string): PlayerProfile => ({
  username,
  gold: 100,
  shards: 10,
  bossCores: 0,
  goldenTickets: 0,
  streakDays: 0,
  lastPlayedDate: '',
  dailyRankedCompletedDate: '',
  restedStacks: 0,
  selectedClass: 'warrior',
  classes: {
    warrior: createClassProgress('warrior'),
    mage: createClassProgress('mage'),
    thief: createClassProgress('thief'),
    bowman: createClassProgress('bowman'),
  },
  inventory: [],
  banishedBuffIds: [],
  unlockedBanishSlots: 1,
  legion: {
    atk: 0,
    hp: 0,
    armor: 0,
    critRate: 0,
    critDmg: 0,
    dodge: 0,
    cdr: 0,
    gold: 0,
  },
  autoDismantleNormal: false,
  loginStreak: createDefaultLoginStreak(),
});

export const calculateLeaderboardScore = (
  floorReached: number,
  outcome: RunOutcome,
  durationMs: number,
  goldEarned: number
): number => {
  const clearBonus = outcome === 'cleared' ? 1_000_000 : outcome === 'extracted' ? 200_000 : 0;
  const milestoneBonus = Math.floor(Math.max(0, floorReached) / 10) * 250_000;
  const speedBonus = Math.max(0, 300_000 - Math.min(300_000, Math.floor(durationMs)));
  return (
    clearBonus +
    milestoneBonus +
    floorReached * 100_000 +
    speedBonus +
    Math.min(99_999, Math.floor(goldEarned))
  );
};

// ======================== SAFE RUNTIME TYPE GUARDS (NO `as` CASTS) ========================

export const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val);

export const isString = (val: unknown): val is string => typeof val === 'string';

export const isNumber = (val: unknown): val is number =>
  typeof val === 'number' && Number.isFinite(val);

export const isBoolean = (val: unknown): val is boolean => typeof val === 'boolean';

export const isClassId = (val: unknown): val is ClassId =>
  val === 'warrior' || val === 'mage' || val === 'thief' || val === 'bowman';

export const isGearSlot = (val: unknown): val is GearSlot =>
  val === 'weapon' || val === 'headgear' || val === 'top' || val === 'cape';

export const isGearTier = (val: unknown): val is GearTier =>
  val === 'normal' || val === 'rare' || val === 'legendary';

export const isElementId = (val: unknown): val is ElementId =>
  val === 'fire' || val === 'ice' || val === 'lightning' || val === 'dark';

export const isRunOutcome = (val: unknown): val is RunOutcome =>
  val === 'cleared' || val === 'extracted' || val === 'died';

export const isLegionStatKey = (val: unknown): val is LegionStatKey =>
  val === 'atk' ||
  val === 'hp' ||
  val === 'armor' ||
  val === 'critRate' ||
  val === 'critDmg' ||
  val === 'dodge' ||
  val === 'cdr' ||
  val === 'gold';

const LEGACY_GEAR_PATTERN =
  /Mithril|Rune-Etched|Shadow-Forged|Iron Cap|Leather Tunic|Traveler|Warblade|Grimoire|Dagger|Recurve|Cloak|Helm|Armor|Boots/;

export const parseGearItem = (raw: unknown): GearItem | null => {
  if (!isRecord(raw)) return null;
  if (
    !isString(raw.id) ||
    !isString(raw.name) ||
    !isGearSlot(raw.slot) ||
    !isClassId(raw.classId) ||
    !isGearTier(raw.tier) ||
    !isNumber(raw.level) ||
    !isNumber(raw.baseStatBonus) ||
    !isString(raw.affixText)
  ) {
    return null;
  }
  const sockets: ElementId[] = [];
  const maxSockets: 0 | 1 | 2 = 0;
  const legendaryId = isString(raw.legendaryId) ? raw.legendaryId : null;
  const isCursed = isBoolean(raw.isCursed) ? raw.isCursed : false;

  let name = raw.name;
  let affixText = raw.affixText;
  const leg = getLegendaryById(legendaryId);
  if (leg) {
    name = leg.name;
    affixText = leg.signatureText;
  } else if (raw.id.startsWith('starter_wep_')) {
    name = 'Unarmed Taiji Fist';
    affixText = 'Empty-handed Wuxia martial stance.';
  } else {
    if (affixText === 'Standard adventurer gear.') {
      affixText = 'Standard sect disciple attire.';
    }
    if (LEGACY_GEAR_PATTERN.test(name)) {
      const def = getClassDefinition(raw.classId);
      const baseName =
        raw.slot === 'weapon' ? def.weaponLabel : NORMAL_FALLBACK_NAMES[raw.slot];
      name =
        raw.tier === 'rare'
          ? `Jade-Forged ${baseName}`
          : raw.slot === 'weapon'
            ? `Basic ${baseName}`
            : baseName;
    }
  }

  return {
    id: raw.id,
    name,
    slot: raw.slot,
    classId: raw.classId,
    tier: raw.tier,
    level: raw.level,
    baseStatBonus: raw.baseStatBonus,
    affixText,
    sockets,
    maxSockets,
    legendaryId,
    isCursed,
  };
};

const parseClassProgress = (raw: unknown, classId: ClassId): ClassProgress => {
  const fallback = createClassProgress(classId);
  if (!isRecord(raw)) return fallback;

  const equippedRaw = isRecord(raw.equipped) ? raw.equipped : {};
  const equipped: EquippedGearMap = {
    weapon: parseGearItem(equippedRaw.weapon) ?? fallback.equipped.weapon,
    headgear: parseGearItem(equippedRaw.headgear),
    top: parseGearItem(equippedRaw.top),
    cape: parseGearItem(equippedRaw.cape),
  };

  const slotRaw = isRecord(raw.slotLevels) ? raw.slotLevels : {};
  const slotLevels: SlotLevelsMap = {
    weapon: isNumber(slotRaw.weapon) ? slotRaw.weapon : 0,
    headgear: isNumber(slotRaw.headgear) ? slotRaw.headgear : 0,
    top: isNumber(slotRaw.top) ? slotRaw.top : 0,
    cape: isNumber(slotRaw.cape) ? slotRaw.cape : 0,
  };

  return {
    classId,
    level: isNumber(raw.level) ? Math.max(1, Math.floor(raw.level)) : 1,
    exp: isNumber(raw.exp) ? Math.max(0, Math.floor(raw.exp)) : 0,
    equipped,
    slotLevels,
  };
};

export const parsePlayerProfile = (raw: unknown, fallbackUsername: string): PlayerProfile => {
  const base = createInitialProfile(fallbackUsername);
  if (!isRecord(raw)) return base;

  const classesRaw = isRecord(raw.classes) ? raw.classes : {};
  const classes: ClassesProgressMap = {
    warrior: parseClassProgress(classesRaw.warrior, 'warrior'),
    mage: parseClassProgress(classesRaw.mage, 'mage'),
    thief: parseClassProgress(classesRaw.thief, 'thief'),
    bowman: parseClassProgress(classesRaw.bowman, 'bowman'),
  };

  const inventory: GearItem[] = [];
  if (Array.isArray(raw.inventory)) {
    for (const itemRaw of raw.inventory) {
      const parsed = parseGearItem(itemRaw);
      if (parsed) inventory.push(parsed);
    }
  }

  const banishedBuffIds: string[] = [];
  if (Array.isArray(raw.banishedBuffIds)) {
    for (const b of raw.banishedBuffIds) {
      if (isString(b)) banishedBuffIds.push(b);
    }
  }

  const legionRaw = isRecord(raw.legion) ? raw.legion : {};
  const legion: LegionLevels = {
    atk: isNumber(legionRaw.atk) ? legionRaw.atk : 0,
    hp: isNumber(legionRaw.hp) ? legionRaw.hp : 0,
    armor: isNumber(legionRaw.armor) ? legionRaw.armor : 0,
    critRate: isNumber(legionRaw.critRate) ? legionRaw.critRate : 0,
    critDmg: isNumber(legionRaw.critDmg) ? legionRaw.critDmg : 0,
    dodge: isNumber(legionRaw.dodge) ? legionRaw.dodge : 0,
    cdr: isNumber(legionRaw.cdr) ? legionRaw.cdr : 0,
    gold: isNumber(legionRaw.gold) ? legionRaw.gold : 0,
  };

  const streakRaw = isRecord(raw.loginStreak) ? raw.loginStreak : {};
  const dailyChestsClaimed: number[] = [];
  if (Array.isArray(streakRaw.dailyChestsClaimed)) {
    for (const f of streakRaw.dailyChestsClaimed) {
      if (isNumber(f)) dailyChestsClaimed.push(f);
    }
  }
  const loginStreak: LoginStreakState = {
    currentStreak: isNumber(streakRaw.currentStreak) ? Math.max(0, streakRaw.currentStreak) : 0,
    longestStreak: isNumber(streakRaw.longestStreak) ? Math.max(0, streakRaw.longestStreak) : 0,
    totalLoginDays: isNumber(streakRaw.totalLoginDays) ? Math.max(0, streakRaw.totalLoginDays) : 0,
    lastClaimDate: isString(streakRaw.lastClaimDate) ? streakRaw.lastClaimDate : '',
    graceUsedWeekKey: isString(streakRaw.graceUsedWeekKey) ? streakRaw.graceUsedWeekKey : '',
    dailyChestsDate: isString(streakRaw.dailyChestsDate) ? streakRaw.dailyChestsDate : '',
    dailyChestsClaimed,
    dailyBountyCompletedDate: isString(streakRaw.dailyBountyCompletedDate)
      ? streakRaw.dailyBountyCompletedDate
      : '',
    endlessBestFloor: isNumber(streakRaw.endlessBestFloor)
      ? Math.max(0, streakRaw.endlessBestFloor)
      : 0,
  };

  return {
    username: isString(raw.username) ? raw.username : fallbackUsername,
    gold: isNumber(raw.gold) ? raw.gold : base.gold,
    shards: isNumber(raw.shards) ? raw.shards : base.shards,
    bossCores: isNumber(raw.bossCores) ? raw.bossCores : 0,
    goldenTickets: isNumber(raw.goldenTickets) ? raw.goldenTickets : 0,
    streakDays: isNumber(raw.streakDays) ? raw.streakDays : 0,
    lastPlayedDate: isString(raw.lastPlayedDate) ? raw.lastPlayedDate : '',
    dailyRankedCompletedDate: isString(raw.dailyRankedCompletedDate)
      ? raw.dailyRankedCompletedDate
      : '',
    restedStacks: isNumber(raw.restedStacks) ? raw.restedStacks : 0,
    selectedClass: isClassId(raw.selectedClass) ? raw.selectedClass : 'warrior',
    classes,
    inventory,
    banishedBuffIds,
    unlockedBanishSlots: isNumber(raw.unlockedBanishSlots)
      ? Math.min(5, Math.max(1, raw.unlockedBanishSlots))
      : 1,
    legion,
    autoDismantleNormal: isBoolean(raw.autoDismantleNormal) ? raw.autoDismantleNormal : false,
    loginStreak,
  };
};

export const parseLeaderboardEntry = (raw: unknown): LeaderboardEntry | null => {
  if (!isRecord(raw)) return null;
  if (
    !isString(raw.username) ||
    !isClassId(raw.classId) ||
    !isNumber(raw.floorReached) ||
    !isRunOutcome(raw.outcome) ||
    !isNumber(raw.durationMs) ||
    !isNumber(raw.goldEarned) ||
    !isNumber(raw.score)
  ) {
    return null;
  }
  const topBuffs: string[] = [];
  if (Array.isArray(raw.topBuffs)) {
    for (const b of raw.topBuffs) {
      if (isString(b)) topBuffs.push(b);
    }
  }
  return {
    rank: isNumber(raw.rank) ? raw.rank : 0,
    username: raw.username,
    classId: raw.classId,
    floorReached: raw.floorReached,
    outcome: raw.outcome,
    durationMs: raw.durationMs,
    goldEarned: raw.goldEarned,
    score: raw.score,
    topBuffs,
    legendaryName: isString(raw.legendaryName) ? raw.legendaryName : null,
  };
};

export const ensureSlotLevelsReference = (slot: GearSlot): GearSlot =>
  GEAR_SLOTS.includes(slot) ? slot : 'weapon';

// ======================== DAILY SECT DECREES, BOUNTIES & LOGIN STREAK ========================

export const DAILY_REWARD_MULT = 1.6;
export const ENDLESS_REWARD_MULT = 0.65;
export const DAILY_CHEST_FLOORS: readonly number[] = [10, 20, 30];

export const getDailyChestRewards = (
  floor: number
): { gold: number; shards: number; rareDrop: boolean; legendaryDrop: boolean } => {
  if (floor >= 30) {
    return { gold: 900, shards: 45, rareDrop: false, legendaryDrop: true };
  }
  if (floor >= 20) {
    return { gold: 450, shards: 25, rareDrop: true, legendaryDrop: false };
  }
  return { gold: 220, shards: 15, rareDrop: false, legendaryDrop: false };
};

export const DAILY_SECT_DECREES: readonly DailySectDecree[] = [
  {
    id: 'sword_tomb_resonance',
    name: 'Sword Tomb Resonance',
    summary: '+25% Player ATK, enemies have +15% HP.',
    playerAtkMult: 1.25,
    enemyHpMult: 1.15,
    goldMult: 1,
    potionHealMult: 1,
    bonusBossShield: 0,
    extraFloor1Reroll: 0,
    critRateBonus: 0,
  },
  {
    id: 'jianghu_greed',
    name: 'Jianghu Greed',
    summary: '2x Gold from foes, healing vials restore 30% less.',
    playerAtkMult: 1,
    enemyHpMult: 1,
    goldMult: 2,
    potionHealMult: 0.7,
    bonusBossShield: 0,
    extraFloor1Reroll: 0,
    critRateBonus: 0,
  },
  {
    id: 'grandmaster_pace',
    name: 'Grandmaster Pace',
    summary: '+2 Draft Rerolls at start, bosses gain +1 Hit-Shield.',
    playerAtkMult: 1.1,
    enemyHpMult: 1.08,
    goldMult: 1,
    potionHealMult: 1,
    bonusBossShield: 1,
    extraFloor1Reroll: 2,
    critRateBonus: 0,
  },
  {
    id: 'iron_fortress',
    name: 'Iron Fortress',
    summary: 'Enemies have +20% HP, +40% Gold & +15% Crit Rate.',
    playerAtkMult: 1.05,
    enemyHpMult: 1.2,
    goldMult: 1.4,
    potionHealMult: 1,
    bonusBossShield: 0,
    extraFloor1Reroll: 0,
    critRateBonus: 0.15,
  },
  {
    id: 'crimson_tempest',
    name: 'Crimson Tempest',
    summary: '+18% Crit Rate & +15% ATK, healing vials -20%.',
    playerAtkMult: 1.15,
    enemyHpMult: 1.1,
    goldMult: 1.15,
    potionHealMult: 0.8,
    bonusBossShield: 0,
    extraFloor1Reroll: 0,
    critRateBonus: 0.18,
  },
];

export const getDailySectDecree = (dateKey: string): DailySectDecree => {
  const h = hashString(`decree:${dateKey}`);
  return DAILY_SECT_DECREES[h % DAILY_SECT_DECREES.length] ?? DAILY_SECT_DECREES[0]!;
};

export const DAILY_MASTERY_BOUNTIES: readonly DailyMasteryBounty[] = [
  {
    id: 'awaken_synergy',
    name: 'Peerless Convergence',
    description: 'Awaken any Secret Synergy during a Daily Run.',
    shardReward: 35,
  },
  {
    id: 'reach_floor_15',
    name: 'Inner Pagoda Ascent',
    description: 'Reach Floor 15 or higher in a Daily Run.',
    shardReward: 30,
  },
  {
    id: 'master_active_lv3',
    name: 'Grandmaster Technique',
    description: 'Raise any Active Skill to Lv. 3+ in a Daily Run.',
    shardReward: 25,
  },
  {
    id: 'dual_passive_harmony',
    name: 'Twin Meridian Balance',
    description: 'Learn at least 2 distinct Passive Skills in a Daily Run.',
    shardReward: 25,
  },
  {
    id: 'clear_floor_20',
    name: 'Cult Leader Bane',
    description: 'Defeat the Floor 20 Cult Leader in a Daily Run.',
    shardReward: 40,
  },
];

export const getDailyMasteryBounty = (dateKey: string): DailyMasteryBounty => {
  const h = hashString(`bounty:${dateKey}`);
  return DAILY_MASTERY_BOUNTIES[h % DAILY_MASTERY_BOUNTIES.length] ?? DAILY_MASTERY_BOUNTIES[0]!;
};

export const evaluateDailyMasteryBounty = (
  bountyId: DailyMasteryBountyId,
  floorReached: number,
  draftedBuffIds: readonly string[]
): boolean => {
  const loadout = computeWuxiaLoadout(draftedBuffIds, Math.max(1, floorReached));
  switch (bountyId) {
    case 'awaken_synergy':
      return loadout.awakenedSynergies.length > 0;
    case 'reach_floor_15':
      return floorReached >= 15;
    case 'master_active_lv3':
      return loadout.actives.some((a) => a.level >= 3);
    case 'dual_passive_harmony':
      return loadout.innerQis.length >= 2;
    case 'clear_floor_20':
      return floorReached >= 20;
  }
};

export const getIsoWeekKey = (dateKey: string): string => {
  const d = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '1970-W01';
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

export type LoginStreakStatus = {
  canClaimToday: boolean;
  currentStreak: number;
  nextStreak: number;
  nextCycleDay: number; // 1..7
  nextTotalDays: number;
  graceWillApply: boolean;
  isMilestone14: boolean;
  isMilestone21: boolean;
  isMilestone30: boolean;
  needsSlotChoice: boolean;
  needsDay14Choice: boolean;
  needsFullSelector: boolean;
};

export const getLoginStreakStatus = (
  profile: PlayerProfile,
  todayKey: string = getUtcDateKey()
): LoginStreakStatus => {
  const st = profile.loginStreak;
  const canClaimToday = st.lastClaimDate !== todayKey;
  const weekKey = getIsoWeekKey(todayKey);

  let nextStreak = st.currentStreak;
  let graceWillApply = false;
  if (canClaimToday) {
    if (!st.lastClaimDate) {
      nextStreak = 1;
    } else {
      const gap = daysBetweenUtc(st.lastClaimDate, todayKey);
      if (gap === 1) {
        nextStreak = st.currentStreak + 1;
      } else if (gap === 2 && st.graceUsedWeekKey !== weekKey) {
        nextStreak = st.currentStreak + 1;
        graceWillApply = true;
      } else {
        nextStreak = 1;
      }
    }
  }

  const nextTotalDays = canClaimToday ? st.totalLoginDays + 1 : st.totalLoginDays;
  const nextCycleDay = ((Math.max(1, nextStreak) - 1) % 7) + 1;
  const isMilestone30 = canClaimToday && nextStreak > 0 && nextStreak % 30 === 0;
  const isMilestone21 = canClaimToday && !isMilestone30 && nextStreak === 21;
  const isMilestone14 = canClaimToday && !isMilestone30 && nextStreak === 14;
  const needsFullSelector = isMilestone30;
  const needsDay14Choice = isMilestone14;
  const needsSlotChoice = canClaimToday && !isMilestone30 && (isMilestone14 || nextCycleDay === 7);

  return {
    canClaimToday,
    currentStreak: st.currentStreak,
    nextStreak,
    nextCycleDay,
    nextTotalDays,
    graceWillApply,
    isMilestone14,
    isMilestone21,
    isMilestone30,
    needsSlotChoice,
    needsDay14Choice,
    needsFullSelector,
  };
};

export const createSpecificLegendaryGearItem = (
  legendaryId: string,
  isCursed: boolean,
  idSuffix: string,
  floorLevel = 15
): GearItem => {
  const chosen = getLegendaryById(legendaryId) ?? LEGENDARY_CATALOG[0]!;
  const extraFloors = Math.max(0, floorLevel - 10);
  const scaledPower = 42 + Math.round(extraFloors * 2.8);
  return {
    id: `leg_${Date.now().toString(36)}_${idSuffix}`,
    name: chosen.name,
    slot: chosen.slot,
    classId: chosen.classId,
    tier: 'legendary',
    level: Math.max(10, floorLevel),
    baseStatBonus: scaledPower,
    affixText: chosen.signatureText,
    sockets: [],
    maxSockets: 0,
    legendaryId: chosen.id,
    isCursed,
  };
};

export const getDay14SlotLegendaryChoices = (
  slot: GearSlot,
  dateKey: string
): readonly (typeof LEGENDARY_CATALOG)[number][] => {
  const pool = LEGENDARY_CATALOG.filter((l) => l.slot === slot);
  const rng = mulberry32(hashString(`day14:${dateKey}:${slot}`));
  const shuffled = [...pool].sort(() => rng() - 0.5);
  return shuffled.slice(0, 3);
};

export const claimLoginStreakReward = (
  profile: PlayerProfile,
  todayKey: string,
  chosenSlot?: GearSlot,
  chosenLegendaryId?: string
): { profile: PlayerProfile; message: string } => {
  const status = getLoginStreakStatus(profile, todayKey);
  if (!status.canClaimToday) {
    return { profile, message: 'Daily login reward already claimed today.' };
  }

  const next: PlayerProfile = {
    ...profile,
    inventory: [...profile.inventory],
    loginStreak: {
      ...profile.loginStreak,
      dailyChestsClaimed: [...profile.loginStreak.dailyChestsClaimed],
    },
  };

  const cls = next.classes[next.selectedClass];
  const scaleLevel = Math.max(10, cls.level);
  const rng = mulberry32(hashString(`login:${todayKey}:${next.username}:${status.nextStreak}`));
  let message = '';

  if (status.isMilestone30) {
    const picked =
      (chosenLegendaryId ? getLegendaryById(chosenLegendaryId) : undefined) ?? LEGENDARY_CATALOG[0]!;
    const item = createSpecificLegendaryGearItem(picked.id, false, `streak30_${todayKey}`, 25);
    next.inventory.push(item);
    next.shards += 60;
    message = `Day 30 Grandmaster Milestone! Claimed Pristine ${item.name} + 60 Shards.`;
  } else if (status.isMilestone21) {
    const cursedInBag = next.inventory.find((i) => i.tier === 'legendary' && i.isCursed);
    if (cursedInBag) {
      const idx = next.inventory.indexOf(cursedInBag);
      next.inventory[idx] = { ...cursedInBag, isCursed: false };
      next.shards += 40;
      message = `Day 21 Milestone! Purified ${cursedInBag.name} for free + 40 Shards.`;
    } else {
      next.shards += 80;
      next.bossCores += 2;
      message = 'Day 21 Milestone! Claimed +80 Shards & +2 Boss Cores.';
    }
  } else if (status.isMilestone14) {
    const slot: GearSlot = chosenSlot ?? 'weapon';
    const choices = getDay14SlotLegendaryChoices(slot, todayKey);
    const picked =
      (chosenLegendaryId ? choices.find((c) => c.id === chosenLegendaryId) : undefined) ??
      choices[0] ??
      LEGENDARY_CATALOG[0]!;
    const item = createSpecificLegendaryGearItem(picked.id, false, `streak14_${todayKey}`, 20);
    next.inventory.push(item);
    next.bossCores += 2;
    message = `Day 14 Milestone! Claimed Pristine ${item.name} + 2 Boss Cores.`;
  } else {
    switch (status.nextCycleDay) {
      case 1:
        next.gold += 250;
        next.goldenTickets += 1;
        message = 'Day 1 Login Reward: +250 Gold & +1 Golden Ascent Writ.';
        break;
      case 2:
        next.shards += 20;
        message = 'Day 2 Login Reward: +20 Spirit Shards.';
        break;
      case 3: {
        const slot = GEAR_SLOTS[Math.floor(rng() * GEAR_SLOTS.length)] ?? 'weapon';
        const rare = createGearItem(
          rng,
          next.selectedClass,
          slot,
          'rare',
          scaleLevel,
          `streak3_${todayKey}`
        );
        next.inventory.push(rare);
        message = `Day 3 Login Reward: Guaranteed Rare ${rare.name}!`;
        break;
      }
      case 4:
        next.gold += 400;
        next.shards += 30;
        message = 'Day 4 Login Reward: +400 Gold & +30 Spirit Shards.';
        break;
      case 5:
        next.goldenTickets += 2;
        next.bossCores += 1;
        message = 'Day 5 Login Reward: +2 Golden Ascent Writs & +1 Boss Core.';
        break;
      case 6:
        next.gold += 600;
        next.shards += 50;
        message = 'Day 6 Login Reward: +600 Gold & +50 Spirit Shards.';
        break;
      case 7:
      default: {
        const slot: GearSlot = chosenSlot ?? 'weapon';
        const pool = LEGENDARY_CATALOG.filter((l) => l.slot === slot);
        const picked = pool[Math.floor(rng() * pool.length)] ?? LEGENDARY_CATALOG[0]!;
        const leg = createSpecificLegendaryGearItem(picked.id, false, `streak7_${todayKey}`, 15);
        next.inventory.push(leg);
        message = `Day 7 Login Reward: Pristine ${leg.name} (${slot})!`;
        break;
      }
    }
  }

  next.loginStreak.currentStreak = status.nextStreak;
  next.loginStreak.longestStreak = Math.max(next.loginStreak.longestStreak, status.nextStreak);
  next.loginStreak.totalLoginDays = status.nextTotalDays;
  next.loginStreak.lastClaimDate = todayKey;
  if (status.graceWillApply) {
    next.loginStreak.graceUsedWeekKey = getIsoWeekKey(todayKey);
    message = `${message} (Weekly Grace Day preserved your streak!)`;
  }
  next.streakDays = status.nextStreak;

  return { profile: next, message };
};
