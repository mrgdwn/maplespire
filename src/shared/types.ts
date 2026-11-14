export type ClassId = 'warrior' | 'mage' | 'thief' | 'bowman';

export type GearSlot = 'weapon' | 'headgear' | 'top' | 'cape';

export type GearTier = 'normal' | 'rare' | 'legendary';

export type ElementId = 'fire' | 'ice' | 'lightning' | 'dark';

export type BuffTier = 'bronze' | 'silver' | 'gold' | 'cursed' | 'prismatic';

export type BiomeId =
  | 'slime_bog'
  | 'glacial_spire'
  | 'volcanic_caldera'
  | 'shadow_alley'
  | 'temple_of_time';

export type MutationId =
  | 'golden_gilded'
  | 'juggernaut'
  | 'hasted'
  | 'vampiric'
  | 'volatile'
  | 'twin_soul';

export type RunMode = 'daily' | 'practice';

export type RunOutcome = 'cleared' | 'extracted' | 'died';

export type LegionStatKey = 'atk' | 'hp' | 'gold' | 'critDmg';

export type GearItem = {
  id: string;
  name: string;
  slot: GearSlot;
  classId: ClassId;
  tier: GearTier;
  level: number;
  baseStatBonus: number;
  affixText: string;
  sockets: ElementId[];
  maxSockets: 0 | 1 | 2;
  legendaryId: string | null;
  isCursed: boolean;
};

export type EquippedGearMap = {
  weapon: GearItem | null;
  headgear: GearItem | null;
  top: GearItem | null;
  cape: GearItem | null;
};

export type SlotLevelsMap = {
  weapon: number;
  headgear: number;
  top: number;
  cape: number;
};

export type ClassProgress = {
  classId: ClassId;
  level: number;
  exp: number;
  equipped: EquippedGearMap;
  slotLevels: SlotLevelsMap;
};

export type ClassesProgressMap = {
  warrior: ClassProgress;
  mage: ClassProgress;
  thief: ClassProgress;
  bowman: ClassProgress;
};

export type LegionLevels = {
  atk: number;
  hp: number;
  gold: number;
  critDmg: number;
};

export type PlayerProfile = {
  username: string;
  gold: number;
  shards: number;
  bossCores: number;
  goldenTickets: number;
  streakDays: number;
  lastPlayedDate: string;
  dailyRankedCompletedDate: string;
  restedStacks: number;
  selectedClass: ClassId;
  classes: ClassesProgressMap;
  inventory: GearItem[];
  banishedBuffIds: string[];
  unlockedBanishSlots: number;
  legion: LegionLevels;
  autoDismantleNormal: boolean;
};

export type DailyChallenge = {
  dateKey: string;
  seed: number;
  biomeId: BiomeId;
  bountyClass: ClassId;
  totalRunsToday: number;
  floor10ClearsToday: number;
};

export type LeaderboardEntry = {
  rank: number;
  username: string;
  classId: ClassId;
  floorReached: number;
  outcome: RunOutcome;
  durationMs: number;
  goldEarned: number;
  score: number;
  topBuffs: string[];
  legendaryName: string | null;
};

export type LinkSkillBonuses = {
  maxHpPct: number;
  skillDmgPct: number;
  critRatePct: number;
  attackSpeedPct: number;
};

export type ComputedHeroStats = {
  maxHp: number;
  atk: number;
  attackSpeed: number;
  armor: number;
  critRate: number;
  critDmg: number;
  dodgeRate: number;
  skillPowerPct: number;
  goldBonusPct: number;
  cooldownReductionPct: number;
  lifestealPct: number;
  damageTakenMult: number;
  allDamageMult: number;
  range: number;
  knockbackPower: number;
};

export type InitResponse = {
  type: 'init';
  postId: string;
  profile: PlayerProfile;
  daily: DailyChallenge;
  leaderboard: LeaderboardEntry[];
};

export type StartRunRequest = {
  mode: RunMode;
  classId: ClassId;
  useGoldenTicket: boolean;
};

export type StartRunResponse = {
  type: 'run_start';
  runId: string;
  mode: RunMode;
  seed: number;
  profile: PlayerProfile;
  daily: DailyChallenge;
};

export type CompleteRunRequest = {
  runId: string;
  mode: RunMode;
  classId: ClassId;
  floorReached: number;
  outcome: RunOutcome;
  durationMs: number;
  goldCollected: number;
  shardsCollected: number;
  coresCollected: number;
  draftedBuffIds: string[];
  bossMutations: MutationId[];
  greedGamblePurified: boolean;
};

export type RunRewardSummary = {
  goldBanked: number;
  shardsBanked: number;
  coresBanked: number;
  expGained: number;
  bountyApplied: boolean;
  restedApplied: boolean;
  lootForfeited: boolean;
  newLevel: number;
  leveledUp: boolean;
  drops: GearItem[];
  autoDismantledCount: number;
  autoDismantledShards: number;
  legendaryDrop: GearItem | null;
  playerRank: number | null;
};

export type CompleteRunResponse = {
  type: 'run_complete';
  profile: PlayerProfile;
  daily: DailyChallenge;
  leaderboard: LeaderboardEntry[];
  summary: RunRewardSummary;
};

export type CampActionRequest =
  | { action: 'select_class'; classId: ClassId }
  | { action: 'equip_item'; itemId: string }
  | { action: 'dismantle_item'; itemId: string }
  | { action: 'dismantle_all_normal_rare' }
  | { action: 'socket_element'; itemId: string; elementId: ElementId }
  | { action: 'upgrade_slot'; classId: ClassId; slot: GearSlot }
  | { action: 'purify_legendary'; itemId: string }
  | { action: 'unlock_banish_slot' }
  | { action: 'toggle_banish_buff'; buffId: string }
  | { action: 'upgrade_legion'; stat: LegionStatKey }
  | { action: 'toggle_auto_dismantle' };

export type CampActionResponse = {
  type: 'camp_action';
  message: string;
  profile: PlayerProfile;
};

export type ShareCommentRequest = {
  classId: ClassId;
  floorReached: number;
  outcome: RunOutcome;
  durationMs: number;
  goldBanked: number;
  topBuffIds: string[];
  bossMutations: MutationId[];
  legendaryName: string | null;
  legendaryCursed: boolean;
};

export type ShareCommentResponse = {
  type: 'share_comment';
  posted: boolean;
  commentText: string;
  message: string;
};
