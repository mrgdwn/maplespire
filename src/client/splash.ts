import { context, navigateTo, requestExpandedMode, showToast } from '@devvit/web/client';
import { getBiomeById } from '../shared/catalogs/biomes.ts';
import { getClassDefinition } from '../shared/catalogs/classes.ts';
import { getDailyChallengeConfig, getUtcDateKey, isRecord, isString } from '../shared/utils.ts';

const setText = (id: string, text: string): void => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};

const renderDailyInfo = (
  dateKey: string,
  biomeId: Parameters<typeof getBiomeById>[0],
  bountyClassId: Parameters<typeof getClassDefinition>[0],
  delves: number,
  clears: number,
  streak: number,
  rested: number,
  dailyDone: boolean
): void => {
  const biome = getBiomeById(biomeId);
  const bounty = getClassDefinition(bountyClassId);

  setText('date-pill', dateKey);
  setText('biome-name', biome.name);
  setText('biome-sub', `${biome.subtitle} • 10 Floors`);
  setText('bounty-pill', `2x BOUNTY: ${bounty.name.toUpperCase()}`);
  setText('boss-line', `F4: ${biome.miniBossName} -> F10: ${biome.endBossName}`);
  setText('mechanic-tip', `${biome.mechanicName}: ${biome.mechanicDescription} (${biome.counterTip})`);
  setText('stat-delves', String(delves));
  setText('stat-clears', String(clears));
  setText('stat-streak', rested > 0 ? `${streak}d (${rested}x Rested)` : `${streak}d`);

  const panel = document.getElementById('biome-panel');
  if (panel) {
    panel.style.borderColor = biome.accentHex;
  }

  if (dailyDone) {
    setText('sub-status', 'Daily Ranked Run complete! Play Practice/Grind runs or enter Camp.');
  }
};

const initSplash = async (): Promise<void> => {
  const username = context.username ?? 'Adventurer';
  setText('greeting', `Welcome back, u/${username}`);

  const dateKey = getUtcDateKey();
  const fallback = getDailyChallengeConfig(dateKey);
  renderDailyInfo(dateKey, fallback.biomeId, fallback.bountyClass, 0, 0, 1, 0, false);

  const startButton = document.getElementById('start-button');
  if (startButton instanceof HTMLButtonElement) {
    startButton.addEventListener('click', (e) => {
      void requestExpandedMode(e, 'game');
    });
  }

  const howToBtn = document.getElementById('how-to-btn');
  if (howToBtn instanceof HTMLButtonElement) {
    howToBtn.addEventListener('click', () => {
      showToast(
        'Auto-battle 10 floors, draft 1 of 3 buffs with 2 targeted refreshes, extract at F4/F7 or gamble F10 for a Unique Legendary!'
      );
    });
  }

  const redditLink = document.getElementById('reddit-link');
  if (redditLink instanceof HTMLButtonElement) {
    redditLink.addEventListener('click', () => {
      navigateTo('https://www.reddit.com/r/Devvit');
    });
  }

  try {
    const res = await fetch('/api/init');
    if (!res.ok) return;
    const raw: unknown = await res.json();
    if (!isRecord(raw) || !isRecord(raw.daily) || !isRecord(raw.profile)) return;

    const dailyRaw = raw.daily;
    const profileRaw = raw.profile;

    const biomeStr = isString(dailyRaw.biomeId) ? dailyRaw.biomeId : fallback.biomeId;
    const bountyStr = isString(dailyRaw.bountyClass) ? dailyRaw.bountyClass : fallback.bountyClass;
    const serverDate = isString(dailyRaw.dateKey) ? dailyRaw.dateKey : dateKey;
    const delves = typeof dailyRaw.totalRunsToday === 'number' ? dailyRaw.totalRunsToday : 0;
    const clears = typeof dailyRaw.floor10ClearsToday === 'number' ? dailyRaw.floor10ClearsToday : 0;
    const streak = typeof profileRaw.streakDays === 'number' ? profileRaw.streakDays : 1;
    const rested = typeof profileRaw.restedStacks === 'number' ? profileRaw.restedStacks : 0;
    const dailyDone =
      isString(profileRaw.dailyRankedCompletedDate) &&
      profileRaw.dailyRankedCompletedDate === serverDate;

    const validBiome =
      biomeStr === 'slime_bog' ||
      biomeStr === 'glacial_spire' ||
      biomeStr === 'volcanic_caldera' ||
      biomeStr === 'shadow_alley' ||
      biomeStr === 'temple_of_time'
        ? biomeStr
        : fallback.biomeId;
    const validClass =
      bountyStr === 'warrior' ||
      bountyStr === 'mage' ||
      bountyStr === 'thief' ||
      bountyStr === 'bowman'
        ? bountyStr
        : fallback.bountyClass;

    renderDailyInfo(serverDate, validBiome, validClass, delves, clears, streak, rested, dailyDone);
  } catch {
    // Keep offline fallback rendering
  }
};

void initSplash();
