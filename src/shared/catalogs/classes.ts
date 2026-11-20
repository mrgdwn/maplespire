import type {
  ClassId,
  ClassesProgressMap,
  ComputedHeroStats,
  GearSlot,
  LinkSkillBonuses,
  PlayerProfile,
} from '../types.ts';
import { getLegendaryById } from './legendaries.ts';
import { computeWuxiaLoadout } from './wuxia.ts';

export type JobMilestone = {
  level: number;
  title: string;
  description: string;
};

export type ClassDefinition = {
  id: ClassId;
  name: string;
  weaponLabel: string;
  attackStyleLabel: string;
  synergyFocus: string;
  colorHex: string;
  colorInt: number;
  baseHp: number;
  baseAtk: number;
  attackSpeed: number;
  baseArmor: number;
  critRate: number;
  critDmg: number;
  dodgeRate: number;
  range: number;
  knockbackPower: number;
  hpPerLevel: number;
  atkPerLevel: number;
  armorPerLevel: number;
  linkSkillName: string;
  linkSkillDesc: string;
  activeSkillName: string;
  activeSkillUltimateName: string;
  activeSkillDesc: string;
  activeSkillCooldownSec: number;
  firstJobPassiveName: string;
  firstJobPassiveDesc: string;
};

export const CLASS_IDS: readonly ClassId[] = ['warrior', 'mage', 'thief', 'bowman'];

export const GEAR_SLOTS: readonly GearSlot[] = ['weapon', 'headgear', 'top', 'cape'];

export const CLASS_CATALOG: readonly ClassDefinition[] = [
  {
    id: 'warrior',
    name: 'Blade',
    weaponLabel: 'Black-Iron Greatsword',
    attackStyleLabel: 'Cleave + Knockback',
    synergyFocus: 'Thorns, Lifesteal, Cursed Buffs',
    colorHex: '#ef4444',
    colorInt: 0xef4444,
    baseHp: 220,
    baseAtk: 24,
    attackSpeed: 1.1,
    baseArmor: 30,
    critRate: 0.1,
    critDmg: 1.5,
    dodgeRate: 0.05,
    range: 115,
    knockbackPower: 42,
    hpPerLevel: 14,
    atkPerLevel: 1.8,
    armorPerLevel: 1.5,
    linkSkillName: 'Iron Will (per 10 Lvls)',
    linkSkillDesc: '+3% Max HP to all styles',
    activeSkillName: 'Earthshatter Palm',
    activeSkillUltimateName: 'Asura Earth-Shatter',
    activeSkillDesc: '250% AoE cleave + stun (450% at Lv. 60 Grandmaster)',
    activeSkillCooldownSec: 9,
    firstJobPassiveName: 'Unyielding Grit',
    firstJobPassiveDesc: 'Regenerate 1.5% Max HP/sec and +20% Knockback.',
  },
  {
    id: 'mage',
    name: 'Scholar',
    weaponLabel: 'Jade Flute',
    attackStyleLabel: 'Floating Cast + AoE Spells',
    synergyFocus: 'Burn, Freeze, Chain Lightning',
    colorHex: '#3b82f6',
    colorInt: 0x3b82f6,
    baseHp: 165,
    baseAtk: 28,
    attackSpeed: 1.2,
    baseArmor: 12,
    critRate: 0.15,
    critDmg: 1.6,
    dodgeRate: 0.1,
    range: 340,
    knockbackPower: 14,
    hpPerLevel: 8,
    atkPerLevel: 2.2,
    armorPerLevel: 0.7,
    linkSkillName: 'Heart-Spirit Resonance (per 10 Lvls)',
    linkSkillDesc: '+3% Skill Damage to all styles',
    activeSkillName: 'Inner Pulse',
    activeSkillUltimateName: 'Nine-Yin Tide Resonance',
    activeSkillDesc: '300% chamber-wide spirit pulse (520% at Lv. 60 Grandmaster)',
    activeSkillCooldownSec: 8,
    firstJobPassiveName: 'Meridian Resonance',
    firstJobPassiveDesc: 'Every 3rd attack inflicts Burn, Chill, or Thunder.',
  },
  {
    id: 'thief',
    name: 'Shadow',
    weaponLabel: 'Shadow Twin Blades',
    attackStyleLabel: 'Dash + Rapid Hits',
    synergyFocus: 'Execute, Bleed, Bonus Gold',
    colorHex: '#a855f7',
    colorInt: 0xa855f7,
    baseHp: 175,
    baseAtk: 23,
    attackSpeed: 1.8,
    baseArmor: 15,
    critRate: 0.25,
    critDmg: 1.75,
    dodgeRate: 0.2,
    range: 380,
    knockbackPower: 24,
    hpPerLevel: 9,
    atkPerLevel: 1.7,
    armorPerLevel: 0.9,
    linkSkillName: 'Shadow Agility (per 10 Lvls)',
    linkSkillDesc: '+2% Crit Rate to all styles',
    activeSkillName: 'Phantom Cloud Strike',
    activeSkillUltimateName: 'Phantom Shadow Tempest',
    activeSkillDesc: '4 rapid invuln crit strikes (8 strikes at Lv. 60 Grandmaster)',
    activeSkillCooldownSec: 8.5,
    firstJobPassiveName: 'Opportunist',
    firstJobPassiveDesc: '+25% damage vs Bleeding, Poisoned, or Full-HP foes.',
  },
  {
    id: 'bowman',
    name: 'Archer',
    weaponLabel: 'Xiaolian Jade Sword',
    attackStyleLabel: 'Multi-Shot Volley',
    synergyFocus: 'On-Hit Procs, Summon Buffs',
    colorHex: '#22c55e',
    colorInt: 0x22c55e,
    baseHp: 180,
    baseAtk: 21,
    attackSpeed: 1.6,
    baseArmor: 18,
    critRate: 0.18,
    critDmg: 1.6,
    dodgeRate: 0.15,
    range: 410,
    knockbackPower: 18,
    hpPerLevel: 10,
    atkPerLevel: 1.8,
    armorPerLevel: 1.0,
    linkSkillName: 'Keen Focus (per 10 Lvls)',
    linkSkillDesc: '+3% Attack Speed to all styles',
    activeSkillName: 'Hundred-Sword Rain',
    activeSkillUltimateName: 'Vermilion Sword Hurricane',
    activeSkillDesc: '8-blade lane barrage + Condor frenzy (16 blades at Lv. 60)',
    activeSkillCooldownSec: 9,
    firstJobPassiveName: 'Divine Condor Companion',
    firstJobPassiveDesc: 'Condor strikes every 1.5s for 60% ATK.',
  },
];

export const getClassDefinition = (classId: ClassId): ClassDefinition => {
  const found = CLASS_CATALOG.find((c) => c.id === classId);
  if (found) return found;
  const first = CLASS_CATALOG[0];
  if (first) return first;
  throw new Error('CLASS_CATALOG is empty');
};

export const getJobAdvancementTitle = (level: number): { jobNumber: number; title: string } => {
  if (level >= 60) return { jobNumber: 3, title: 'Peerless Grandmaster' };
  if (level >= 35) return { jobNumber: 2, title: 'Inner Sect Master' };
  if (level >= 15) return { jobNumber: 1, title: 'Outer Sect Adept' };
  return { jobNumber: 0, title: 'Wuxia Wanderer' };
};

export const computeLinkSkillBonuses = (classes: ClassesProgressMap): LinkSkillBonuses => {
  const warriorTiers = Math.floor(classes.warrior.level / 10);
  const mageTiers = Math.floor(classes.mage.level / 10);
  const thiefTiers = Math.floor(classes.thief.level / 10);
  const bowmanTiers = Math.floor(classes.bowman.level / 10);
  return {
    maxHpPct: warriorTiers * 3,
    skillDmgPct: mageTiers * 3,
    critRatePct: thiefTiers * 2,
    attackSpeedPct: bowmanTiers * 3,
  };
};

const countBuff = (buffIds: readonly string[], id: string): number => {
  let count = 0;
  for (const entry of buffIds) {
    if (entry === id) count += 1;
  }
  return count;
};

export const computeHeroCombatStats = (
  profile: PlayerProfile,
  classId: ClassId,
  draftedBuffIds: readonly string[],
  runGold: number,
  floorsClearedThisRun: number
): ComputedHeroStats => {
  const def = getClassDefinition(classId);
  const cls = profile.classes[classId];
  const links = computeLinkSkillBonuses(profile.classes);

  // Equipped gear + Blacksmith slot bonuses (+10% per slot level)
  let gearAtk = 0;
  let gearHp = 0;
  let gearArmor = 0;
  let gearCritRate = 0;
  let gearSpeed = 0;

  for (const slot of GEAR_SLOTS) {
    const item = cls.equipped[slot];
    const slotMult = 1 + cls.slotLevels[slot] * 0.1;
    if (!item) continue;
    const val = item.baseStatBonus * slotMult;
    if (slot === 'weapon') gearAtk += val;
    if (slot === 'headgear') {
      gearHp += val * 4;
      gearCritRate += 0.02 * (item.tier === 'legendary' ? 2 : item.tier === 'rare' ? 1.5 : 1);
    }
    if (slot === 'top') {
      gearArmor += val * 0.8;
      gearHp += val * 3;
    }
    if (slot === 'cape') {
      gearAtk += val * 0.4;
      gearSpeed += 0.04 * (item.tier === 'legendary' ? 2 : 1);
    }
  }

  // Equipped Legendary definitions
  const equippedLegIds = new Map<string, boolean>();
  for (const slot of GEAR_SLOTS) {
    const item = cls.equipped[slot];
    if (item && item.legendaryId) {
      equippedLegIds.set(item.legendaryId, item.isCursed);
    }
  }

  // Bronze Effectiveness multiplier from Crimson Banner of War
  let bronzeEffectiveness = 1;
  if (equippedLegIds.has('war_cape_crimson')) {
    const cursed = equippedLegIds.get('war_cape_crimson') === true;
    bronzeEffectiveness += cursed ? 0.25 : 0.5;
  }

  const lvlDelta = Math.max(0, cls.level - 1);
  let maxHp = def.baseHp + lvlDelta * def.hpPerLevel + gearHp;
  let atk = def.baseAtk + lvlDelta * def.atkPerLevel + gearAtk;
  let armor = def.baseArmor + lvlDelta * def.armorPerLevel + gearArmor;
  let attackSpeed = def.attackSpeed * (1 + gearSpeed);
  let critRate = def.critRate + gearCritRate;
  let critDmg = def.critDmg;
  let dodgeRate = def.dodgeRate;
  let skillPowerPct = links.skillDmgPct;
  let goldBonusPct = profile.legion.gold * 6;
  let cooldownReductionPct = profile.legion.cdr * 2;
  let lifestealPct = 0;
  let damageTakenMult = 1;
  let allDamageMult = 1;
  let range = def.range;
  let knockbackPower = def.knockbackPower * (cls.level >= 15 && classId === 'warrior' ? 1.2 : 1);

  // Account Link Skills + Permanent Passive Stats (Gold Upgrades)
  maxHp *= 1 + (links.maxHpPct + profile.legion.hp * 5) / 100;
  atk *= 1 + (profile.legion.atk * 4) / 100;
  armor += profile.legion.armor * 5;
  attackSpeed *= 1 + links.attackSpeedPct / 100;
  critRate += links.critRatePct / 100 + profile.legion.critRate * 0.015;
  critDmg += profile.legion.critDmg * 0.08;
  dodgeRate += profile.legion.dodge * 0.015;

  // Bronze Draft Buffs
  const sharpened = countBuff(draftedBuffIds, 'bronze_sharpened_edge');
  const swift = countBuff(draftedBuffIds, 'bronze_swift_strikes');
  const hearty = countBuff(draftedBuffIds, 'bronze_hearty_constitution');
  const ironSkin = countBuff(draftedBuffIds, 'bronze_iron_skin');
  const keenEye = countBuff(draftedBuffIds, 'bronze_keen_eye');
  const lethal = countBuff(draftedBuffIds, 'bronze_lethal_precision');
  const windwalker = countBuff(draftedBuffIds, 'bronze_windwalker');
  const greed = countBuff(draftedBuffIds, 'bronze_greed_charm');

  // Double-Edged Fate boosts one bronze stack effect (+30% bonus)
  const hasDoubleEdged = draftedBuffIds.includes('cursed_double_edged_fate');
  if (hasDoubleEdged) {
    allDamageMult += 0.3;
  }

  atk *= 1 + 0.18 * sharpened * bronzeEffectiveness;
  attackSpeed *= 1 + 0.18 * swift * bronzeEffectiveness;
  maxHp *= 1 + 0.25 * hearty * bronzeEffectiveness;
  armor *= 1 + 0.2 * ironSkin * bronzeEffectiveness;
  critRate += 0.12 * keenEye * bronzeEffectiveness;
  critDmg += 0.35 * lethal * bronzeEffectiveness;
  dodgeRate += 0.12 * windwalker * bronzeEffectiveness;
  goldBonusPct += 25 * greed * bronzeEffectiveness;

  // Gold & Prismatic & Cursed Buffs
  if (draftedBuffIds.includes('gold_overclocked_core')) {
    cooldownReductionPct += 30;
  }
  if (draftedBuffIds.includes('gold_mid_run_midas')) {
    allDamageMult += Math.floor(runGold / 500) * 0.01;
  }
  if (draftedBuffIds.includes('prism_mage_tri_elemental')) {
    skillPowerPct += 35;
  }
  if (draftedBuffIds.includes('prism_thief_coin_toss')) {
    critDmg += 0.4;
  }

  // Cursed Buffs
  if (draftedBuffIds.includes('cursed_pact_of_carnage')) {
    allDamageMult += 0.75;
    damageTakenMult += 0.2;
  }
  if (draftedBuffIds.includes('cursed_bloodlust_frenzy')) {
    attackSpeed *= 1.6;
    lifestealPct += 10;
    maxHp *= 0.75;
  }
  if (draftedBuffIds.includes('cursed_gilded_avarice')) {
    goldBonusPct += 100;
  }
  if (draftedBuffIds.includes('cursed_reckless_gamble')) {
    critRate += 0.4;
  }
  if (draftedBuffIds.includes('cursed_fasting_vow')) {
    allDamageMult += floorsClearedThisRun * 0.2;
  }
  if (draftedBuffIds.includes('cursed_berserkers_tunnel')) {
    atk *= 1.85;
    dodgeRate = Math.max(0, dodgeRate - 0.3);
    armor *= 0.7;
  }

  // Wuxia Inner Qi, Awakened Secret Synergies & Enlightenment Scrolls
  const wuxia = computeWuxiaLoadout(draftedBuffIds, Math.max(1, floorsClearedThisRun + 1));
  const wStats = wuxia.aggregatedStats;
  maxHp *= 1 + wStats.hpPct;
  atk *= 1 + wStats.atkPct;
  attackSpeed *= 1 + wStats.speedPct;
  armor += wStats.armorFlat;
  critRate += wStats.critChance;
  critDmg += wStats.critDamage;
  dodgeRate += wStats.dodgeChance;
  cooldownReductionPct += wStats.cooldownReduction * 100;
  lifestealPct += wStats.lifesteal * 100;
  goldBonusPct += wStats.goldBonusPct * 100;

  // Legendary static stat modifiers (Pristine + Tuned Cursed)
  if (equippedLegIds.has('war_wep_worldbreaker')) {
    knockbackPower *= 2.5;
    if (equippedLegIds.get('war_wep_worldbreaker')) attackSpeed *= 0.9;
  }
  if (equippedLegIds.has('war_head_unbroken') && equippedLegIds.get('war_head_unbroken')) {
    dodgeRate = 0;
  }
  if (equippedLegIds.has('war_top_dragonscale') && equippedLegIds.get('war_top_dragonscale')) {
    armor *= 0.9;
  }
  if (equippedLegIds.has('war_cape_hundred')) {
    const cap = equippedLegIds.get('war_cape_hundred') ? 0.1 : 0.2;
    allDamageMult += Math.min(cap, floorsClearedThisRun * 0.02);
  }
  if (equippedLegIds.has('mage_wep_abyssal') && equippedLegIds.get('mage_wep_abyssal')) {
    maxHp *= 0.85;
  }
  if (equippedLegIds.has('mage_wep_glacial') && equippedLegIds.get('mage_wep_glacial')) {
    attackSpeed *= 0.9;
  }
  if (equippedLegIds.has('mage_head_archmage') && equippedLegIds.get('mage_head_archmage')) {
    cooldownReductionPct -= 5;
  }
  if (equippedLegIds.has('mage_top_frost') && equippedLegIds.get('mage_top_frost')) {
    armor *= 0.85;
  }
  if (equippedLegIds.has('mage_top_astral')) {
    cooldownReductionPct += equippedLegIds.get('mage_top_astral') ? 20 : 30;
  }
  if (equippedLegIds.has('mage_cape_seraphim')) {
    dodgeRate += equippedLegIds.get('mage_cape_seraphim') ? 0.2 : 0.35;
  }
  if (equippedLegIds.has('thief_head_fox')) {
    dodgeRate += 0.3;
  }
  if (equippedLegIds.has('thief_top_shadowweave')) {
    critDmg += 1.0;
    if (equippedLegIds.get('thief_top_shadowweave')) critRate -= 0.05;
  }
  if (equippedLegIds.has('thief_top_goldvest')) {
    goldBonusPct += 60;
    allDamageMult += Math.floor(runGold / 1000) * 0.01;
  }
  if (equippedLegIds.has('bow_head_feathered')) {
    const asBonus = equippedLegIds.get('bow_head_feathered') ? 0.25 : 0.4;
    attackSpeed *= 1 + asBonus;
    range *= 1.2;
  }

  // Armor -> Attack conversions (applied after armor modifiers)
  if (draftedBuffIds.includes('gold_fortress_of_might')) {
    atk += armor * 0.5;
  }
  if (equippedLegIds.has('war_top_titan')) {
    atk += armor * 0.5;
  }

  // Keep references to getLegendaryById used cleanly
  void getLegendaryById;

  return {
    maxHp: Math.max(50, Math.round(maxHp)),
    atk: Math.max(5, Math.round(atk)),
    attackSpeed: Math.max(0.4, Number(attackSpeed.toFixed(2))),
    armor: Math.max(0, Math.round(armor)),
    critRate: Math.min(1, Math.max(0.01, critRate)),
    critDmg: Math.max(1.2, critDmg),
    dodgeRate: Math.min(0.75, Math.max(0, dodgeRate)),
    skillPowerPct: Math.max(0, skillPowerPct),
    goldBonusPct: Math.max(0, goldBonusPct),
    cooldownReductionPct: Math.min(60, Math.max(-20, cooldownReductionPct)),
    lifestealPct: Math.max(0, lifestealPct),
    damageTakenMult: Math.max(0.3, damageTakenMult),
    allDamageMult: Math.max(0.5, allDamageMult),
    range: Math.round(range),
    knockbackPower: Math.round(knockbackPower),
  };
};
