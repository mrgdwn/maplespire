import type { BuffTier, ClassId } from '../types.ts';
import type { WuxiaManualEntry } from './wuxia.ts';
import { getWuxiaManualById } from './wuxia.ts';

export type BuffDefinition = {
  id: string;
  name: string;
  tier: BuffTier;
  classId: ClassId | null;
  icon: string;
  description: string;
  downside: string | null;
  stackable: boolean;
};

export const CORE_BUFFS: readonly BuffDefinition[] = [
  // ======================== BRONZE (8) ========================
  {
    id: 'bronze_sharpened_edge',
    name: 'Sharpened Edge',
    tier: 'bronze',
    classId: null,
    icon: '',
    description: '+18% Base Attack.',
    downside: null,
    stackable: true,
  },
  {
    id: 'bronze_swift_strikes',
    name: 'Swift Strikes',
    tier: 'bronze',
    classId: null,
    icon: '',
    description: '+18% Attack Speed.',
    downside: null,
    stackable: true,
  },
  {
    id: 'bronze_hearty_constitution',
    name: 'Hearty Constitution',
    tier: 'bronze',
    classId: null,
    icon: '',
    description: '+25% Max HP (and heals for the gained amount).',
    downside: null,
    stackable: true,
  },
  {
    id: 'bronze_iron_skin',
    name: 'Iron Skin',
    tier: 'bronze',
    classId: null,
    icon: '',
    description: '+20% Armor Rating.',
    downside: null,
    stackable: true,
  },
  {
    id: 'bronze_keen_eye',
    name: 'Keen Eye',
    tier: 'bronze',
    classId: null,
    icon: '',
    description: '+12% Critical Hit Chance.',
    downside: null,
    stackable: true,
  },
  {
    id: 'bronze_lethal_precision',
    name: 'Lethal Precision',
    tier: 'bronze',
    classId: null,
    icon: '',
    description: '+35% Critical Hit Damage.',
    downside: null,
    stackable: true,
  },
  {
    id: 'bronze_windwalker',
    name: 'Windwalker',
    tier: 'bronze',
    classId: null,
    icon: '',
    description: '+12% Dodge Chance.',
    downside: null,
    stackable: true,
  },
  {
    id: 'bronze_greed_charm',
    name: 'Greed Charm',
    tier: 'bronze',
    classId: null,
    icon: '',
    description: '+25% Gold dropped by monsters.',
    downside: null,
    stackable: true,
  },

  // ======================== SILVER (8) ========================
  {
    id: 'silver_static_discharge',
    name: 'Static Discharge',
    tier: 'silver',
    classId: null,
    icon: '',
    description: 'Every 4th basic attack unleashes chain lightning to 2 nearby enemies.',
    downside: null,
    stackable: false,
  },
  {
    id: 'silver_vampiric_touch',
    name: 'Vampiric Touch',
    tier: 'silver',
    classId: null,
    icon: '',
    description: 'Heal for 2% of Max HP whenever you land a Critical Hit (0.5s CD).',
    downside: null,
    stackable: false,
  },
  {
    id: 'silver_second_wind',
    name: 'Second Wind',
    tier: 'silver',
    classId: null,
    icon: '',
    description: 'Restore 12% Max HP immediately upon clearing each floor.',
    downside: null,
    stackable: true,
  },
  {
    id: 'silver_serrated_wounds',
    name: 'Serrated Wounds',
    tier: 'silver',
    classId: null,
    icon: '',
    description: 'Attacks apply Bleed dealing 15% Base ATK/sec for 3s (up to 5x).',
    downside: null,
    stackable: false,
  },
  {
    id: 'silver_frostbite_aura',
    name: 'Frostbite Aura',
    tier: 'silver',
    classId: null,
    icon: '',
    description: 'Enemies in melee range are slowed 20% and take +12% more damage.',
    downside: null,
    stackable: false,
  },
  {
    id: 'silver_echo_strike',
    name: 'Multishot / Echo Strike',
    tier: 'silver',
    classId: null,
    icon: '',
    description: 'Basic attacks have a 25% chance to strike twice.',
    downside: null,
    stackable: false,
  },
  {
    id: 'silver_thornmail_plating',
    name: 'Thornmail Plating',
    tier: 'silver',
    classId: null,
    icon: '',
    description: 'Reflect 80% of your Armor rating as damage whenever an enemy hits you.',
    downside: null,
    stackable: false,
  },
  {
    id: 'silver_battle_momentum',
    name: 'Battle Momentum',
    tier: 'silver',
    classId: null,
    icon: '',
    description: 'Killing an enemy grants +5% Attack Speed for 3s (stacks up to 5x).',
    downside: null,
    stackable: false,
  },

  // ======================== GOLD (8) ========================
  {
    id: 'gold_stormcaller_conduit',
    name: "Stormcaller's Conduit",
    tier: 'gold',
    classId: null,
    icon: '',
    description: 'Critical hits trigger a sky-bolt striking nearby enemies for 120% Attack.',
    downside: null,
    stackable: false,
  },
  {
    id: 'gold_fortress_of_might',
    name: 'Fortress of Might',
    tier: 'gold',
    classId: null,
    icon: '',
    description: 'Converts 50% of your current Armor rating into bonus Base Attack.',
    downside: null,
    stackable: false,
  },
  {
    id: 'gold_executioners_verdict',
    name: "Executioner's Verdict",
    tier: 'gold',
    classId: null,
    icon: '',
    description: 'Execute non-bosses below 18% HP; +30% damage to bosses below 30% HP.',
    downside: null,
    stackable: false,
  },
  {
    id: 'gold_overclocked_core',
    name: 'Overclocked Core',
    tier: 'gold',
    classId: null,
    icon: '',
    description: 'Reduces all active skill and proc cooldowns by 30%.',
    downside: null,
    stackable: false,
  },
  {
    id: 'gold_mid_run_midas',
    name: 'Mid-Run Midas',
    tier: 'gold',
    classId: null,
    icon: '',
    description: 'Gain +1% All Damage for every 500 Gold collected during this run.',
    downside: null,
    stackable: false,
  },
  {
    id: 'gold_glass_tempest',
    name: 'Glass Tempest',
    tier: 'gold',
    classId: null,
    icon: '',
    description: '+45% Attack Speed and +25% Crit DMG if unhit in the last 3 seconds.',
    downside: null,
    stackable: false,
  },
  {
    id: 'gold_aegis_bastion',
    name: 'Aegis Bastion',
    tier: 'gold',
    classId: null,
    icon: '',
    description: 'Gain a regenerating shield equal to 30% Max HP at the start of each floor.',
    downside: null,
    stackable: false,
  },
  {
    id: 'gold_elemental_overload',
    name: 'Elemental Overload',
    tier: 'gold',
    classId: null,
    icon: '',
    description: 'Weapon Element effects trigger twice as fast and deal +50% bonus damage.',
    downside: null,
    stackable: false,
  },

  // ======================== CURSED (8) ========================
  {
    id: 'cursed_pact_of_carnage',
    name: 'Pact of Carnage',
    tier: 'cursed',
    classId: null,
    icon: '',
    description: '+75% All Damage dealt.',
    downside: 'You take +20% increased damage from all sources.',
    stackable: false,
  },
  {
    id: 'cursed_bloodlust_frenzy',
    name: 'Bloodlust Frenzy',
    tier: 'cursed',
    classId: null,
    icon: '',
    description: '+60% Attack Speed and +10% Lifesteal.',
    downside: 'Your Max HP is reduced by 25%.',
    stackable: false,
  },
  {
    id: 'cursed_gilded_avarice',
    name: 'Gilded Avarice',
    tier: 'cursed',
    classId: null,
    icon: '',
    description: 'Monsters drop 2x Gold and +1 additional Loot Chest on boss clear.',
    downside: 'Enemies have +25% Max HP.',
    stackable: false,
  },
  {
    id: 'cursed_reckless_gamble',
    name: 'Reckless Gamble',
    tier: 'cursed',
    classId: null,
    icon: '',
    description: '+40% Critical Hit Chance.',
    downside: 'Non-critical hits deal 50% less damage.',
    stackable: false,
  },
  {
    id: 'cursed_fasting_vow',
    name: 'Fasting Vow',
    tier: 'cursed',
    classId: null,
    icon: '',
    description: 'Gain +20% All Damage per floor cleared after taking this vow.',
    downside: 'Floor-clear healing and potions are disabled for 3 floors.',
    stackable: false,
  },
  {
    id: 'cursed_berserkers_tunnel',
    name: "Berserker's Tunnel Vision",
    tier: 'cursed',
    classId: null,
    icon: '',
    description: '+85% Base Attack.',
    downside: 'Your Dodge Chance and Armor are reduced by 30%.',
    stackable: false,
  },
  {
    id: 'cursed_volatile_soul',
    name: 'Volatile Soul',
    tier: 'cursed',
    classId: null,
    icon: '',
    description: 'Explode for massive 180% ATK AoE damage every 5 seconds.',
    downside: 'Each pulse drains 2% of your current HP.',
    stackable: false,
  },
  {
    id: 'cursed_double_edged_fate',
    name: 'Double-Edged Fate',
    tier: 'cursed',
    classId: null,
    icon: '',
    description: 'Grants +30% All Damage and upgrades a random stat buff to Gold power.',
    downside: 'Adds +1 extra Boss Mutation to the Floor 10 End Boss.',
    stackable: false,
  },
];

// ======================== PRISMATIC CLASS BUFFS (12 — Lv. 35+) ========================
export const PRISMATIC_CLASS_BUFFS: readonly BuffDefinition[] = [
  // Warrior
  {
    id: 'prism_war_blood_shield',
    name: 'Blood Shield',
    tier: 'prismatic',
    classId: 'warrior',
    icon: '',
    description: 'All lifesteal and floor overhealing converts into a protective HP shield.',
    downside: null,
    stackable: false,
  },
  {
    id: 'prism_war_titan_cleave',
    name: 'Titan Cleave',
    tier: 'prismatic',
    classId: 'warrior',
    icon: '',
    description: 'Greatsword cleave hits +40% wider and deals +25% bonus damage to Bosses.',
    downside: null,
    stackable: false,
  },
  {
    id: 'prism_war_undying_rage',
    name: 'Undying Rage',
    tier: 'prismatic',
    classId: 'warrior',
    icon: '',
    description: 'Gain +1.5% All Damage for every 1% of missing HP.',
    downside: null,
    stackable: false,
  },
  // Mage
  {
    id: 'prism_mage_tri_elemental',
    name: 'Tri-Elemental Mastery',
    tier: 'prismatic',
    classId: 'mage',
    icon: '',
    description: '+35% Skill Power and basic casts fire an extra arcane bolt.',
    downside: null,
    stackable: false,
  },
  {
    id: 'prism_mage_spell_echo',
    name: 'Spell Echo',
    tier: 'prismatic',
    classId: 'mage',
    icon: '',
    description: 'Active Skill triggers twice with a 0.4s delay at 65% bonus power.',
    downside: null,
    stackable: false,
  },
  {
    id: 'prism_mage_mana_barrier',
    name: 'Mana Barrier',
    tier: 'prismatic',
    classId: 'mage',
    icon: '',
    description: 'Start every floor with a 25% Max HP Arcane Shield.',
    downside: null,
    stackable: false,
  },
  // Thief
  {
    id: 'prism_thief_shadow_partner',
    name: 'Shadow Partner',
    tier: 'prismatic',
    classId: 'thief',
    icon: '',
    description: 'Every attack is mimicked by a shadow clone for 40% damage.',
    downside: null,
    stackable: false,
  },
  {
    id: 'prism_thief_fatal_venom',
    name: 'Fatal Venom',
    tier: 'prismatic',
    classId: 'thief',
    icon: '',
    description: 'Bleed and Poison ticks deal 2x damage and can Critically Strike.',
    downside: null,
    stackable: false,
  },
  {
    id: 'prism_thief_coin_toss',
    name: 'Coin Toss Barrage',
    tier: 'prismatic',
    classId: 'thief',
    icon: '',
    description: '+40% Crit Damage and critical hits rain bonus Gold coins.',
    downside: null,
    stackable: false,
  },
  // Bowman
  {
    id: 'prism_bow_split_arrow',
    name: 'Split-Arrow Mastery',
    tier: 'prismatic',
    classId: 'bowman',
    icon: '',
    description: 'Basic shots fire +2 additional piercing arrows.',
    downside: null,
    stackable: false,
  },
  {
    id: 'prism_bow_spectral_pack',
    name: 'Spectral Pack',
    tier: 'prismatic',
    classId: 'bowman',
    icon: '',
    description: 'Summons a Spectral Wolf alongside your Hawk to maul nearby foes.',
    downside: null,
    stackable: false,
  },
  {
    id: 'prism_bow_snipers_mark',
    name: "Sniper's Mark",
    tier: 'prismatic',
    classId: 'bowman',
    icon: '',
    description: 'Every 3rd shot is a guaranteed Critical Strike dealing 200% damage.',
    downside: null,
    stackable: false,
  },
];

export const ALL_BUFFS: readonly BuffDefinition[] = [...CORE_BUFFS, ...PRISMATIC_CLASS_BUFFS];

const manualToBuffDefinition = (manual: WuxiaManualEntry): BuffDefinition => {
  const tier: BuffTier =
    manual.kind === 'synergy'
      ? 'prismatic'
      : manual.kind === 'enlightenment'
        ? 'gold'
        : manual.kind === 'active'
          ? 'gold'
          : 'silver';
  const description =
    manual.kind === 'active' || manual.kind === 'inner_qi'
      ? manual.levelDescriptions[0]
      : manual.description;
  return {
    id: manual.id,
    name: manual.name,
    tier,
    classId: null,
    icon: manual.icon,
    description,
    downside: null,
    stackable: true,
  };
};

export const getBuffById = (id: string): BuffDefinition | null => {
  const legacy = ALL_BUFFS.find((buff) => buff.id === id);
  if (legacy) return legacy;
  const wuxia = getWuxiaManualById(id);
  return wuxia ? manualToBuffDefinition(wuxia) : null;
};

export const getFloorBracketWeights = (
  floor: number,
  silverMult: number
): { bronze: number; silver: number; gold: number; cursed: number } => {
  if (floor <= 3) {
    return { bronze: 65, silver: 25 * silverMult, gold: 8, cursed: 2 };
  }
  if (floor <= 6) {
    return { bronze: 45, silver: 35 * silverMult, gold: 15, cursed: 5 };
  }
  return { bronze: 25, silver: 40 * silverMult, gold: 25, cursed: 10 };
};

const pickWeightedTier = (
  rng: () => number,
  weights: { bronze: number; silver: number; gold: number; cursed: number },
  allowPrismatic: boolean
): BuffTier => {
  if (allowPrismatic && rng() < 0.14) {
    return 'prismatic';
  }
  const total = weights.bronze + weights.silver + weights.gold + weights.cursed;
  const roll = rng() * total;
  if (roll < weights.bronze) return 'bronze';
  if (roll < weights.bronze + weights.silver) return 'silver';
  if (roll < weights.bronze + weights.silver + weights.gold) return 'gold';
  return 'cursed';
};

const getCandidatePoolForTier = (
  tier: BuffTier,
  classId: ClassId,
  classLevel: number,
  banishedIds: readonly string[],
  equippedBuffIds: readonly string[],
  excludedIds: readonly string[]
): BuffDefinition[] => {
  return ALL_BUFFS.filter((buff) => {
    if (buff.tier !== tier) return false;
    if (buff.classId !== null && (buff.classId !== classId || classLevel < 35)) return false;
    if (buff.tier === 'bronze' && banishedIds.includes(buff.id)) return false;
    if (!buff.stackable && equippedBuffIds.includes(buff.id)) return false;
    if (excludedIds.includes(buff.id)) return false;
    return true;
  });
};

export type DraftRollInput = {
  floor: number;
  rng: () => number;
  classId: ClassId;
  classLevel: number;
  banishedIds: readonly string[];
  equippedBuffIds: readonly string[];
  silverWeightMult: number;
};

export const rollSingleDraftCard = (
  input: DraftRollInput,
  excludedIds: readonly string[],
  forcedTier: BuffTier | null
): BuffDefinition => {
  const weights = getFloorBracketWeights(input.floor, input.silverWeightMult);
  const allowPrismatic = input.classLevel >= 35;

  const fallbackOrder: BuffTier[] = ['silver', 'bronze', 'gold', 'cursed'];
  const initialTier = forcedTier ?? pickWeightedTier(input.rng, weights, allowPrismatic);
  const tiersToTry: BuffTier[] = [initialTier, ...fallbackOrder.filter((t) => t !== initialTier)];

  for (const tier of tiersToTry) {
    const candidates = getCandidatePoolForTier(
      tier,
      input.classId,
      input.classLevel,
      input.banishedIds,
      input.equippedBuffIds,
      excludedIds
    );
    if (candidates.length > 0) {
      const idx = Math.floor(input.rng() * candidates.length);
      const chosen = candidates[idx];
      if (chosen) return chosen;
    }
  }

  // Absolute fallback: any bronze buff even if already excluded
  const fallbackBronze = CORE_BUFFS[0];
  if (fallbackBronze) return fallbackBronze;
  throw new Error('Buff catalog is unexpectedly empty');
};

export const rollDraftCards = (input: DraftRollInput): BuffDefinition[] => {
  const cards: BuffDefinition[] = [];
  const usedIds: string[] = [];

  for (let slot = 0; slot < 3; slot++) {
    // Floor 7 guarantees 1 Cursed slot (slot index 2)
    const forcedTier: BuffTier | null = input.floor === 7 && slot === 2 ? 'cursed' : null;
    const card = rollSingleDraftCard(input, usedIds, forcedTier);
    cards.push(card);
    usedIds.push(card.id);
  }

  return cards;
};

export const refreshSingleDraftCard = (
  input: DraftRollInput,
  currentCards: readonly BuffDefinition[],
  slotIndex: number
): BuffDefinition[] => {
  const excludedIds = currentCards.map((c) => c.id);
  const replacement = rollSingleDraftCard(input, excludedIds, null);
  return currentCards.map((card, idx) => (idx === slotIndex ? replacement : card));
};
