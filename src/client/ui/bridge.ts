import type {
  BiomeId,
  ClassId,
  DailyChallenge,
  LeaderboardEntry,
  MutationId,
  PlayerProfile,
  RunMode,
  RunOutcome,
} from '../../shared/types.ts';

export type RunStartPayload = {
  runId: string;
  mode: RunMode;
  seed: number;
  biomeId: BiomeId;
  classId: ClassId;
  profile: PlayerProfile;
  daily: DailyChallenge;
};

export type RunHudSnapshot = {
  floor: number;
  maxFloors: number;
  waveLabel: string;
  hp: number;
  maxHp: number;
  shield: number;
  gold: number;
  shards: number;
  cores: number;
  skillCooldownPct: number;
  skillReady: boolean;
  skillName: string;
  dashCooldownPct: number;
  dashReady: boolean;
  potionCharges: number;
  potionDisabledReason: string | null;
  speedMult: 1 | 2;
  autoSkill: boolean;
  draftedBuffIds: string[];
  activeBossName: string | null;
  activeBossHp: number;
  activeBossMaxHp: number;
  activeBossShield: number;
  activeMutations: MutationId[];
};

export type RunEndPayload = {
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

export type AppState = {
  profile: PlayerProfile;
  daily: DailyChallenge;
  leaderboard: LeaderboardEntry[];
};

export type DungeonBridge = {
  startRun: (payload: RunStartPayload) => void;
  stopToIdle: () => void;
  triggerActiveSkill: () => void;
  triggerDash: () => void;
  triggerPotion: () => void;
  toggleSpeed: () => 1 | 2;
  toggleAutoSkill: () => boolean;
  resumeAfterDraft: (buffId: string) => void;
  resumeAfterRoulette: (mutations: MutationId[]) => void;
  resumeAfterExtraction: (extractNow: boolean) => void;
  retreatWithLoot: () => void;
};
