import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import { getBiomeById, getMutationById } from '../../shared/catalogs/biomes.ts';
import { getBuffById } from '../../shared/catalogs/buffs.ts';
import { getWuxiaSynergyById, isCultLeaderFloor, isRandomMiniBossFloor } from '../../shared/catalogs/wuxia.ts';
import { getClassDefinition } from '../../shared/catalogs/classes.ts';
import type {
  CampActionResponse,
  ClassId,
  CompleteRunResponse,
  DailyChallenge,
  GearItem,
  GearSlot,
  InitResponse,
  LeaderboardEntry,
  MutationId,
  PlayerProfile,
  RunMode,
  RunOutcome,
  StartRunResponse,
  ShareCommentResponse,
} from '../../shared/types.ts';
import {
  SANCTUM_PURIFY_COST,
  awardClassExp,
  calculateLeaderboardScore,
  createGearItem,
  createInitialProfile,
  createLegendaryGearItem,
  daysBetweenUtc,
  getDailyChallengeConfig,
  getDismantleShardValue,
  getLegionUpgradeCost,
  getNextBanishSlotCost,
  getSlotUpgradeCost,
  getUtcDateKey,
  hashString,
  isBoolean,
  isClassId,
  isElementId,
  isGearSlot,
  isLegionStatKey,
  isNumber,
  isRecord,
  isRunOutcome,
  isString,
  mulberry32,
  parseLeaderboardEntry,
  parsePlayerProfile,
} from '../../shared/utils.ts';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

const playerKey = (username: string): string => `player:${username}`;
const dailyRunsKey = (dateKey: string): string => `daily:${dateKey}:runs`;
const dailyClearsKey = (dateKey: string): string => `daily:${dateKey}:clears`;
const dailyLeaderboardKey = (dateKey: string): string => `daily:${dateKey}:leaderboard`;
const dailyEntryKey = (dateKey: string, username: string): string =>
  `daily:${dateKey}:entry:${username}`;

const resolveUsername = async (): Promise<string> => {
  try {
    const name = await reddit.getCurrentUsername();
    if (name && name.trim().length > 0) return name.trim();
  } catch {
    // Fallback when running locally or anonymous
  }
  return context.userId ? `user_${context.userId.slice(0, 8)}` : 'adventurer';
};

const loadProfile = async (username: string): Promise<PlayerProfile> => {
  const raw = await redis.get(playerKey(username));
  if (!raw) return createInitialProfile(username);
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsePlayerProfile(parsed, username);
  } catch {
    return createInitialProfile(username);
  }
};

const saveProfile = async (profile: PlayerProfile): Promise<void> => {
  await redis.set(playerKey(profile.username), JSON.stringify(profile));
};

const applyDailyLoginState = (profile: PlayerProfile, dateKey: string): PlayerProfile => {
  if (profile.lastPlayedDate === dateKey) return profile;

  let streakDays = profile.streakDays;
  let restedStacks = profile.restedStacks;
  let goldenTickets = profile.goldenTickets;

  if (!profile.lastPlayedDate) {
    streakDays = 1;
  } else {
    const gap = daysBetweenUtc(profile.lastPlayedDate, dateKey);
    if (gap === 1) {
      streakDays += 1;
    } else if (gap > 1) {
      streakDays = 1;
      restedStacks = Math.min(3, restedStacks + (gap - 1));
    }
  }

  if (streakDays > 0 && streakDays % 7 === 0) {
    goldenTickets += 1;
  }

  return {
    ...profile,
    streakDays,
    restedStacks,
    goldenTickets,
    lastPlayedDate: dateKey,
  };
};

const loadDailyChallenge = async (dateKey: string): Promise<DailyChallenge> => {
  const cfg = getDailyChallengeConfig(dateKey);
  const [runsStr, clearsStr] = await Promise.all([
    redis.get(dailyRunsKey(dateKey)),
    redis.get(dailyClearsKey(dateKey)),
  ]);
  return {
    dateKey,
    seed: cfg.seed,
    biomeId: cfg.biomeId,
    bountyClass: cfg.bountyClass,
    totalRunsToday: runsStr ? Math.max(0, Number.parseInt(runsStr, 10) || 0) : 0,
    floor10ClearsToday: clearsStr ? Math.max(0, Number.parseInt(clearsStr, 10) || 0) : 0,
  };
};

const loadLeaderboard = async (dateKey: string): Promise<LeaderboardEntry[]> => {
  const ranked = await redis.zRange(dailyLeaderboardKey(dateKey), 0, 14, {
    by: 'rank',
    reverse: true,
  });
  if (ranked.length === 0) return [];

  const entries: LeaderboardEntry[] = [];
  const rawValues = await Promise.all(
    ranked.map((item) => redis.get(dailyEntryKey(dateKey, item.member)))
  );

  for (let i = 0; i < ranked.length; i++) {
    const raw = rawValues[i];
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      const entry = parseLeaderboardEntry(parsed);
      if (entry) {
        entries.push({
          ...entry,
          rank: entries.length + 1,
        });
      }
    } catch {
      // Ignore malformed entry
    }
  }
  return entries;
};

const parseBodyRecord = async (req: Request): Promise<Record<string, unknown> | null> => {
  try {
    const raw: unknown = await req.json();
    return isRecord(raw) ? raw : null;
  } catch {
    return null;
  }
};

const isMutationId = (val: unknown): val is MutationId =>
  val === 'golden_gilded' ||
  val === 'juggernaut' ||
  val === 'hasted' ||
  val === 'vampiric' ||
  val === 'volatile' ||
  val === 'twin_soul';

api.get('/init', async (c) => {
  const postId = context.postId ?? 'local-dev';
  try {
    const dateKey = getUtcDateKey();
    const username = await resolveUsername();
    const existing = await loadProfile(username);
    const updated = applyDailyLoginState(existing, dateKey);
    if (updated !== existing) {
      await saveProfile(updated);
    }
    const [daily, leaderboard] = await Promise.all([
      loadDailyChallenge(dateKey),
      loadLeaderboard(dateKey),
    ]);
    return c.json<InitResponse>({
      type: 'init',
      postId,
      profile: updated,
      daily,
      leaderboard,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Initialization failed';
    return c.json<ErrorResponse>({ status: 'error', message }, 500);
  }
});

api.post('/run/start', async (c) => {
  const body = await parseBodyRecord(c.req.raw);
  if (!body) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const requestedMode: RunMode = body.mode === 'daily' ? 'daily' : 'practice';
  const classId: ClassId = isClassId(body.classId) ? body.classId : 'warrior';
  const useGoldenTicket = isBoolean(body.useGoldenTicket) ? body.useGoldenTicket : false;

  try {
    const dateKey = getUtcDateKey();
    const username = await resolveUsername();
    let profile = applyDailyLoginState(await loadProfile(username), dateKey);
    profile = { ...profile, selectedClass: classId };

    let actualMode: RunMode = requestedMode;
    if (requestedMode === 'daily' && profile.dailyRankedCompletedDate === dateKey) {
      if (useGoldenTicket && profile.goldenTickets > 0) {
        profile = {
          ...profile,
          goldenTickets: profile.goldenTickets - 1,
        };
      } else {
        actualMode = 'practice';
      }
    }

    await saveProfile(profile);
    await redis.incrBy(dailyRunsKey(dateKey), 1);
    const daily = await loadDailyChallenge(dateKey);

    const runId = `run_${Date.now().toString(36)}_${Math.floor(Math.random() * 10000)}`;
    const seed =
      actualMode === 'daily'
        ? daily.seed
        : hashString(`${daily.seed}:${runId}:${username}`);

    return c.json<StartRunResponse>({
      type: 'run_start',
      runId,
      mode: actualMode,
      seed,
      profile,
      daily,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start run';
    return c.json<ErrorResponse>({ status: 'error', message }, 500);
  }
});

api.post('/run/complete', async (c) => {
  const body = await parseBodyRecord(c.req.raw);
  if (!body) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const runId = isString(body.runId) ? body.runId : `run_${Date.now()}`;
  const mode: RunMode = body.mode === 'daily' ? 'daily' : 'practice';
  const classId: ClassId = isClassId(body.classId) ? body.classId : 'warrior';
  const floorReached = isNumber(body.floorReached)
    ? Math.max(1, Math.min(9999, Math.floor(body.floorReached)))
    : 1;
  const outcome: RunOutcome = isRunOutcome(body.outcome) ? body.outcome : 'died';
  const durationMs = isNumber(body.durationMs) ? Math.max(1000, Math.floor(body.durationMs)) : 60_000;
  const goldCollected = isNumber(body.goldCollected) ? Math.max(0, Math.floor(body.goldCollected)) : 0;
  const shardsCollected = isNumber(body.shardsCollected)
    ? Math.max(0, Math.floor(body.shardsCollected))
    : 0;
  const coresCollected = isNumber(body.coresCollected)
    ? Math.max(0, Math.floor(body.coresCollected))
    : 0;
  const greedGamblePurified = isBoolean(body.greedGamblePurified)
    ? body.greedGamblePurified
    : false;

  const draftedBuffIds: string[] = [];
  if (Array.isArray(body.draftedBuffIds)) {
    for (const id of body.draftedBuffIds) {
      if (isString(id)) draftedBuffIds.push(id);
    }
  }

  const bossMutations: MutationId[] = [];
  if (Array.isArray(body.bossMutations)) {
    for (const mut of body.bossMutations) {
      if (isMutationId(mut)) bossMutations.push(mut);
    }
  }
  void bossMutations;

  try {
    const dateKey = getUtcDateKey();
    const username = await resolveUsername();
    let profile = applyDailyLoginState(await loadProfile(username), dateKey);
    const dailyConfig = getDailyChallengeConfig(dateKey);

    const lootForfeited = false;
    const penaltyMult = 1;
    const bountyApplied = classId === dailyConfig.bountyClass;
    const restedApplied = profile.restedStacks > 0;

    const goldBanked = Math.round(
      goldCollected * penaltyMult * (bountyApplied ? 1.25 : 1) * (restedApplied ? 2 : 1)
    );
    const shardsBankedBase = Math.round(shardsCollected * penaltyMult * (restedApplied ? 2 : 1));
    const clearedFloors = outcome === 'died' ? Math.max(0, floorReached - 1) : floorReached;
    const cultLeadersDefeated = Math.floor(clearedFloors / 10);
    const coresBanked =
      Math.round(coresCollected * penaltyMult) +
      Math.max(outcome === 'cleared' ? 1 : 0, cultLeadersDefeated);

    const expBase =
      floorReached * 42 +
      cultLeadersDefeated * 90 +
      (outcome === 'cleared' ? 120 : outcome === 'extracted' ? 50 : 15);
    const expGained = expBase * (bountyApplied ? 2 : 1);

    const dropSeed = hashString(`${runId}:${username}:${floorReached}`);
    const rng = mulberry32(dropSeed);
    const slots: GearSlot[] = ['weapon', 'headgear', 'top', 'cape'];
    const rawDrops: GearItem[] = [];

    for (let f = 2; f <= clearedFloors; f++) {
      if (rawDrops.length >= 24) break;
      if (isCultLeaderFloor(f) || isRandomMiniBossFloor(f, dropSeed)) {
        const slot = slots[Math.floor(rng() * slots.length)] ?? 'weapon';
        rawDrops.push(createGearItem(rng, classId, slot, 'rare', f, `f${f}`));
      } else if (rng() < 0.45) {
        const slot = slots[Math.floor(rng() * slots.length)] ?? 'weapon';
        rawDrops.push(createGearItem(rng, classId, slot, 'normal', f, `f${f}`));
      }
    }

    const keptDrops: GearItem[] = [];
    let autoDismantledCount = 0;
    let autoDismantledShards = 0;

    const effectiveDropCount = lootForfeited
      ? Math.ceil(rawDrops.length * 0.5)
      : rawDrops.length;

    for (let i = 0; i < effectiveDropCount; i++) {
      const item = rawDrops[i];
      if (!item) continue;
      if (profile.autoDismantleNormal && item.tier === 'normal') {
        autoDismantledCount += 1;
        autoDismantledShards += getDismantleShardValue(item);
      } else {
        keptDrops.push(item);
      }
    }

    let legendaryDrop: GearItem | null = null;
    const bossBracketsCleared =
      outcome === 'died' ? Math.floor(Math.max(0, floorReached - 1) / 10) : Math.floor(floorReached / 10);
    if (bossBracketsCleared >= 1 || (outcome === 'cleared' && mode === 'daily')) {
      legendaryDrop = createLegendaryGearItem(rng, classId, !greedGamblePurified, 'f10');
      keptDrops.push(legendaryDrop);
    }

    const currentClass = profile.classes[classId];
    const expResult = awardClassExp(currentClass, expGained);

    const nextInventory = [...keptDrops, ...profile.inventory].slice(0, 60);
    const totalShardsBanked = shardsBankedBase + autoDismantledShards;

    profile = {
      ...profile,
      gold: profile.gold + goldBanked,
      shards: profile.shards + totalShardsBanked,
      bossCores: profile.bossCores + coresBanked,
      restedStacks: restedApplied ? Math.max(0, profile.restedStacks - 1) : profile.restedStacks,
      dailyRankedCompletedDate:
        mode === 'daily' ? dateKey : profile.dailyRankedCompletedDate,
      classes: {
        ...profile.classes,
        [classId]: expResult.updated,
      },
      inventory: nextInventory,
    };

    await saveProfile(profile);

    if (outcome === 'cleared') {
      await redis.incrBy(dailyClearsKey(dateKey), 1);
    }

    let playerRank: number | null = null;
    if (mode === 'daily') {
      const score = calculateLeaderboardScore(floorReached, outcome, durationMs, goldBanked);
      const existingRaw = await redis.get(dailyEntryKey(dateKey, username));
      let existingScore = -1;
      if (existingRaw) {
        try {
          const parsedExisting = parseLeaderboardEntry(JSON.parse(existingRaw));
          if (parsedExisting) existingScore = parsedExisting.score;
        } catch {
          // ignore
        }
      }
      if (score >= existingScore) {
        const entry: LeaderboardEntry = {
          rank: 0,
          username,
          classId,
          floorReached,
          outcome,
          durationMs,
          goldEarned: goldBanked,
          score,
          topBuffs: draftedBuffIds.slice(0, 4),
          legendaryName: legendaryDrop ? legendaryDrop.name : null,
        };
        await Promise.all([
          redis.zAdd(dailyLeaderboardKey(dateKey), { member: username, score }),
          redis.set(dailyEntryKey(dateKey, username), JSON.stringify(entry)),
        ]);
      }
    }

    const [daily, leaderboard] = await Promise.all([
      loadDailyChallenge(dateKey),
      loadLeaderboard(dateKey),
    ]);
    const foundRank = leaderboard.find((e) => e.username === username);
    if (foundRank) {
      playerRank = foundRank.rank;
    }

    return c.json<CompleteRunResponse>({
      type: 'run_complete',
      profile,
      daily,
      leaderboard,
      summary: {
        goldBanked,
        shardsBanked: totalShardsBanked,
        coresBanked,
        expGained,
        bountyApplied,
        restedApplied,
        lootForfeited,
        newLevel: expResult.updated.level,
        leveledUp: expResult.leveledUp,
        drops: keptDrops,
        autoDismantledCount,
        autoDismantledShards,
        legendaryDrop,
        playerRank,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete run';
    return c.json<ErrorResponse>({ status: 'error', message }, 500);
  }
});

api.post('/camp/action', async (c) => {
  const body = await parseBodyRecord(c.req.raw);
  if (!body || !isString(body.action)) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid camp action' }, 400);
  }

  try {
    const username = await resolveUsername();
    let profile = await loadProfile(username);
    let message = 'Updated';

    switch (body.action) {
      case 'select_class': {
        if (!isClassId(body.classId)) {
          return c.json<ErrorResponse>({ status: 'error', message: 'Invalid classId' }, 400);
        }
        profile = { ...profile, selectedClass: body.classId };
        message = `Selected ${getClassDefinition(body.classId).name}`;
        break;
      }

      case 'equip_item': {
        if (!isString(body.itemId)) {
          return c.json<ErrorResponse>({ status: 'error', message: 'Missing itemId' }, 400);
        }
        const idx = profile.inventory.findIndex((i) => i.id === body.itemId);
        const item = idx >= 0 ? profile.inventory[idx] : undefined;
        if (!item) {
          return c.json<ErrorResponse>({ status: 'error', message: 'Item not found' }, 404);
        }
        const cls = profile.classes[item.classId];
        const prevEquipped = cls.equipped[item.slot];
        const nextInventory = profile.inventory.filter((i) => i.id !== item.id);
        if (prevEquipped) {
          nextInventory.unshift(prevEquipped);
        }
        profile = {
          ...profile,
          inventory: nextInventory,
          classes: {
            ...profile.classes,
            [item.classId]: {
              ...cls,
              equipped: {
                ...cls.equipped,
                [item.slot]: item,
              },
            },
          },
        };
        message = `Equipped ${item.name}`;
        break;
      }

      case 'dismantle_item': {
        if (!isString(body.itemId)) {
          return c.json<ErrorResponse>({ status: 'error', message: 'Missing itemId' }, 400);
        }
        const item = profile.inventory.find((i) => i.id === body.itemId);
        if (!item) {
          return c.json<ErrorResponse>({ status: 'error', message: 'Item not found' }, 404);
        }
        const shardsGained = getDismantleShardValue(item);
        profile = {
          ...profile,
          shards: profile.shards + shardsGained,
          inventory: profile.inventory.filter((i) => i.id !== item.id),
        };
        message = `Dismantled ${item.name} (+${shardsGained} Shards)`;
        break;
      }

      case 'dismantle_all_normal_rare': {
        let gained = 0;
        let count = 0;
        const kept: GearItem[] = [];
        for (const item of profile.inventory) {
          if (item.tier === 'normal' || item.tier === 'rare') {
            gained += getDismantleShardValue(item);
            count += 1;
          } else {
            kept.push(item);
          }
        }
        profile = {
          ...profile,
          shards: profile.shards + gained,
          inventory: kept,
        };
        message =
          count > 0
            ? `Dismantled ${count} items (+${gained} Shards)`
            : 'No Normal or Rare items in bag';
        break;
      }

      case 'socket_element': {
        if (!isString(body.itemId) || !isElementId(body.elementId)) {
          return c.json<ErrorResponse>({ status: 'error', message: 'Invalid socket payload' }, 400);
        }
        const elementId = body.elementId;
        const socketCost = 15;
        if (profile.shards < socketCost) {
          return c.json<ErrorResponse>({ status: 'error', message: 'Need 15 Shards to fuse Gem' }, 400);
        }

        let updated = false;
        const updateItemSockets = (item: GearItem): GearItem => {
          if (item.id !== body.itemId) return item;
          if (item.maxSockets === 0) return item;
          updated = true;
          const nextSockets =
            item.sockets.length < item.maxSockets
              ? [...item.sockets, elementId]
              : [...item.sockets.slice(1), elementId];
          return { ...item, sockets: nextSockets };
        };

        const nextInventory = profile.inventory.map(updateItemSockets);
        const clsId = profile.selectedClass;
        const cls = profile.classes[clsId];
        const nextWeapon = cls.equipped.weapon ? updateItemSockets(cls.equipped.weapon) : null;

        if (!updated) {
          return c.json<ErrorResponse>(
            { status: 'error', message: 'Only Rare (1 socket) or Legendary (2 sockets) weapons can be socketed' },
            400
          );
        }

        profile = {
          ...profile,
          shards: profile.shards - socketCost,
          inventory: nextInventory,
          classes: {
            ...profile.classes,
            [clsId]: {
              ...cls,
              equipped: {
                ...cls.equipped,
                weapon: nextWeapon,
              },
            },
          },
        };
        message = `Socketed ${elementId.toUpperCase()} gem!`;
        break;
      }

      case 'upgrade_slot': {
        if (!isClassId(body.classId) || !isGearSlot(body.slot)) {
          return c.json<ErrorResponse>({ status: 'error', message: 'Invalid slot upgrade' }, 400);
        }
        const cls = profile.classes[body.classId];
        const currentLvl = cls.slotLevels[body.slot];
        const cost = getSlotUpgradeCost(currentLvl);
        if (profile.shards < cost.shards || profile.gold < cost.gold) {
          return c.json<ErrorResponse>(
            { status: 'error', message: `Need ${cost.gold}g and ${cost.shards} Shards` },
            400
          );
        }
        profile = {
          ...profile,
          gold: profile.gold - cost.gold,
          shards: profile.shards - cost.shards,
          classes: {
            ...profile.classes,
            [body.classId]: {
              ...cls,
              slotLevels: {
                ...cls.slotLevels,
                [body.slot]: currentLvl + 1,
              },
            },
          },
        };
        message = `Upgraded ${body.slot} slot to Lv. ${currentLvl + 1}!`;
        break;
      }

      case 'purify_legendary': {
        if (!isString(body.itemId)) {
          return c.json<ErrorResponse>({ status: 'error', message: 'Missing itemId' }, 400);
        }
        if (
          profile.shards < SANCTUM_PURIFY_COST.shards ||
          profile.bossCores < SANCTUM_PURIFY_COST.bossCores
        ) {
          return c.json<ErrorResponse>(
            { status: 'error', message: 'Need 25 Shards & 2 Boss Cores to purify' },
            400
          );
        }

        let purifiedName = '';
        const purifyOne = (item: GearItem): GearItem => {
          if (item.id === body.itemId && item.isCursed) {
            purifiedName = item.name;
            return { ...item, isCursed: false };
          }
          return item;
        };

        const nextInv = profile.inventory.map(purifyOne);
        const nextClasses = { ...profile.classes };
        const classKeys: readonly ClassId[] = ['warrior', 'mage', 'thief', 'bowman'];
        const slotKeys: readonly GearSlot[] = ['weapon', 'headgear', 'top', 'cape'];
        for (const cKey of classKeys) {
          const cls = nextClasses[cKey];
          const eq = { ...cls.equipped };
          for (const sKey of slotKeys) {
            const existing = eq[sKey];
            if (existing) eq[sKey] = purifyOne(existing);
          }
          nextClasses[cKey] = { ...cls, equipped: eq };
        }

        if (!purifiedName) {
          return c.json<ErrorResponse>({ status: 'error', message: 'Cursed Legendary not found' }, 404);
        }

        profile = {
          ...profile,
          shards: profile.shards - SANCTUM_PURIFY_COST.shards,
          bossCores: profile.bossCores - SANCTUM_PURIFY_COST.bossCores,
          inventory: nextInv,
          classes: nextClasses,
        };
        message = `Purified ${purifiedName} at The Sanctum!`;
        break;
      }

      case 'unlock_banish_slot': {
        const nextCost = getNextBanishSlotCost(profile.unlockedBanishSlots);
        if (nextCost === null) {
          return c.json<ErrorResponse>({ status: 'error', message: 'All 5 Banish slots unlocked' }, 400);
        }
        if (profile.gold < nextCost) {
          return c.json<ErrorResponse>({ status: 'error', message: `Need ${nextCost} Gold` }, 400);
        }
        profile = {
          ...profile,
          gold: profile.gold - nextCost,
          unlockedBanishSlots: profile.unlockedBanishSlots + 1,
        };
        message = `Unlocked Banish Slot #${profile.unlockedBanishSlots}`;
        break;
      }

      case 'toggle_banish_buff': {
        if (!isString(body.buffId)) {
          return c.json<ErrorResponse>({ status: 'error', message: 'Missing buffId' }, 400);
        }
        const buff = getBuffById(body.buffId);
        if (!buff || buff.tier !== 'bronze') {
          return c.json<ErrorResponse>({ status: 'error', message: 'Only Bronze buffs can be banished' }, 400);
        }
        const exists = profile.banishedBuffIds.includes(buff.id);
        let nextBanished: string[];
        if (exists) {
          nextBanished = profile.banishedBuffIds.filter((id) => id !== buff.id);
          message = `Unbanished ${buff.name}`;
        } else {
          if (profile.banishedBuffIds.length >= profile.unlockedBanishSlots) {
            return c.json<ErrorResponse>(
              { status: 'error', message: `All ${profile.unlockedBanishSlots} Banish slots are full` },
              400
            );
          }
          nextBanished = [...profile.banishedBuffIds, buff.id];
          message = `Banished ${buff.name} from future drafts`;
        }
        profile = { ...profile, banishedBuffIds: nextBanished };
        break;
      }

      case 'upgrade_legion': {
        if (!isLegionStatKey(body.stat)) {
          return c.json<ErrorResponse>({ status: 'error', message: 'Invalid Legion stat' }, 400);
        }
        const currentLvl = profile.legion[body.stat];
        const cost = getLegionUpgradeCost(currentLvl);
        if (profile.gold < cost) {
          return c.json<ErrorResponse>({ status: 'error', message: `Need ${cost} Gold` }, 400);
        }
        profile = {
          ...profile,
          gold: profile.gold - cost,
          legion: {
            ...profile.legion,
            [body.stat]: currentLvl + 1,
          },
        };
        message = `Legion ${body.stat.toUpperCase()} upgraded to Lv. ${currentLvl + 1}`;
        break;
      }

      case 'toggle_auto_dismantle': {
        profile = {
          ...profile,
          autoDismantleNormal: !profile.autoDismantleNormal,
        };
        message = profile.autoDismantleNormal
          ? 'Auto-dismantle Normal drops enabled'
          : 'Auto-dismantle Normal drops disabled';
        break;
      }

      default:
        return c.json<ErrorResponse>({ status: 'error', message: 'Unknown camp action' }, 400);
    }

    await saveProfile(profile);
    return c.json<CampActionResponse>({
      type: 'camp_action',
      message,
      profile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Camp action failed';
    return c.json<ErrorResponse>({ status: 'error', message }, 500);
  }
});

api.post('/share-comment', async (c) => {
  const body = await parseBodyRecord(c.req.raw);
  if (!body) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const classId: ClassId = isClassId(body.classId) ? body.classId : 'warrior';
  const floorReached = isNumber(body.floorReached) ? Math.floor(body.floorReached) : 1;
  const outcome: RunOutcome = isRunOutcome(body.outcome) ? body.outcome : 'died';
  const durationMs = isNumber(body.durationMs) ? Math.floor(body.durationMs) : 60_000;
  const goldBanked = isNumber(body.goldBanked) ? Math.floor(body.goldBanked) : 0;
  const legendaryName = isString(body.legendaryName) ? body.legendaryName : null;
  const legendaryCursed = isBoolean(body.legendaryCursed) ? body.legendaryCursed : false;

  const topBuffIds: string[] = [];
  if (Array.isArray(body.topBuffIds)) {
    for (const id of body.topBuffIds) {
      if (isString(id)) topBuffIds.push(id);
    }
  }
  const bossMutations: MutationId[] = [];
  if (Array.isArray(body.bossMutations)) {
    for (const mut of body.bossMutations) {
      if (isMutationId(mut)) bossMutations.push(mut);
    }
  }

  const username = await resolveUsername();
  const dateKey = getUtcDateKey();
  const cfg = getDailyChallengeConfig(dateKey);
  const biome = getBiomeById(cfg.biomeId);
  void classId;

  const buffNames = topBuffIds
    .slice(0, 5)
    .map((id) => getBuffById(id)?.name ?? id)
    .join(', ');
  const synergyNames: string[] = [];
  for (const id of topBuffIds) {
    const syn = getWuxiaSynergyById(id);
    if (syn && !synergyNames.includes(syn.name)) {
      synergyNames.push(syn.name);
    }
  }
  const mutNames = bossMutations.map((id) => getMutationById(id).name).join(' + ');
  const outcomeText =
    outcome === 'cleared'
      ? `Conquered Floor ${floorReached} (${biome.endBossName})`
      : outcome === 'extracted'
        ? `Retreated Safely at Floor ${floorReached}`
        : `Fell on Floor ${floorReached}`;
  const timeSec = (durationMs / 1000).toFixed(1);

  const lines = [
    `**Wuxia Spire Daily Report (${dateKey}) — u/${username}**`,
    `- **Path:** Jianghu Wanderer | **Result:** ${outcomeText} in ${timeSec}s`,
    `- **Cult Sect:** ${biome.name}${mutNames ? ` (${mutNames})` : ''}`,
    `- **Silver Taels Banked:** ${goldBanked}`,
  ];
  if (synergyNames.length > 0) {
    lines.push(`- **Secret Synergies:** ${synergyNames.join(', ')}`);
  }
  if (buffNames) {
    lines.push(`- **Core Draft Build:** ${buffNames}`);
  }
  if (legendaryName) {
    lines.push(
      `- **Altar of Fate Drop:** ${legendaryName} (${legendaryCursed ? 'Cursed' : 'Pristine ✨'})`
    );
  }
  const commentText = lines.join('\n');

  const isT3Id = (val: string | undefined): val is `t3_${string}` =>
    typeof val === 'string' && val.startsWith('t3_');

  const postId = context.postId;
  if (!isT3Id(postId)) {
    return c.json<ShareCommentResponse>({
      type: 'share_comment',
      posted: false,
      commentText,
      message: 'Copied summary (live comment posting works inside a Reddit post).',
    });
  }

  try {
    await reddit.submitComment({
      id: postId,
      text: commentText,
      runAs: 'APP',
    });
    return c.json<ShareCommentResponse>({
      type: 'share_comment',
      posted: true,
      commentText,
      message: 'Posted your MapleSpire build to Reddit comments!',
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unable to post comment';
    return c.json<ShareCommentResponse>({
      type: 'share_comment',
      posted: false,
      commentText,
      message: `Could not post directly (${errMsg}); copied build summary instead.`,
    });
  }
});
