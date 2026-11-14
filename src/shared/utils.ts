import { BIOME_CATALOG } from './catalogs/biomes.ts';
import { CLASS_IDS, GEAR_SLOTS, getClassDefinition } from './catalogs/classes.ts';
import { getLegendariesForClass, getLegendaryById } from './catalogs/legendaries.ts';
import type {
  BiomeId,
  ClassId,
  ClassProgress,
  ClassesProgressMap,
  ElementId,
  EquippedGearMap,
  GearItem,
  GearSlot,
  GearTier,
  LeaderboardEntry,
  LegionLevels,
  LegionStatKey,
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
  gold: 60 + slotLevel * 45,
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
  if (item.tier === 'legendary') return 25;
  if (item.tier === 'rare') return 10 + Math.floor(item.level / 2);
  return 4 + Math.floor(item.level / 3);
};

const NORMAL_NAMES: Record<GearSlot, string> = {
  weapon: 'Wuxia Blade',
  headgear: 'Silk Headband',
  top: 'Wuxia Robe',
  cape: 'Cloud Mantle',
};

const RARE_PREFIXES: readonly string[] = [
  'Jade-Forged',
  'Celestial',
  'Nine-Yang',
  'Xuantie',
  'Dragon-Scale',
];

const RARE_AFFIXES: readonly string[] = [
  '+10% Crit Power',
  '+8% Attack Speed',
  '+12% Boss DMG',
  '+10% Armor Pen',
  '+15% Gold Find',
];

export const createGearItem = (
  rng: () => number,
  classId: ClassId,
  slot: GearSlot,
  tier: 'normal' | 'rare',
  floorLevel: number,
  idSuffix: string
): GearItem => {
  const def = getClassDefinition(classId);
  const tierMult = tier === 'rare' ? 1.5 : 1.0;
  const baseStatBonus = Math.round((6 + floorLevel * 2.2) * tierMult);

  let name = slot === 'weapon' ? `Basic ${def.weaponLabel}` : NORMAL_NAMES[slot];
  let affixText = 'Standard sect disciple attire.';

  if (tier === 'rare') {
    const prefix = RARE_PREFIXES[Math.floor(rng() * RARE_PREFIXES.length)] ?? 'Mithril';
    const affix = RARE_AFFIXES[Math.floor(rng() * RARE_AFFIXES.length)] ?? '+10% Crit Power';
    name =
      slot === 'weapon'
        ? `${prefix} ${def.weaponLabel}`
        : `${prefix} ${NORMAL_NAMES[slot]}`;
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
    gold: 0,
    critDmg: 0,
  },
  autoDismantleNormal: false,
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
  val === 'atk' || val === 'hp' || val === 'gold' || val === 'critDmg';

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
      const baseName = raw.slot === 'weapon' ? def.weaponLabel : NORMAL_NAMES[raw.slot];
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
    gold: isNumber(legionRaw.gold) ? legionRaw.gold : 0,
    critDmg: isNumber(legionRaw.critDmg) ? legionRaw.critDmg : 0,
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
