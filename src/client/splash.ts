import { context, navigateTo, requestExpandedMode, showToast } from '@devvit/web/client';
import { getBiomeById } from '../shared/catalogs/biomes.ts';
import { getDailyChallengeConfig, getUtcDateKey, isRecord, isString } from '../shared/utils.ts';

const setText = (id: string, text: string): void => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};

const renderDailyInfo = (
  dateKey: string,
  biomeId: Parameters<typeof getBiomeById>[0],
  delves: number,
  streak: number,
  rested: number,
  dailyDone: boolean
): void => {
  const biome = getBiomeById(biomeId);

  setText('date-pill', dateKey);
  setText('biome-name', dailyDone ? `Endless · ${biome.name}` : `Daily · ${biome.name}`);
  setText('stat-delves', String(delves));
  setText('stat-streak', rested > 0 ? `${streak}d (${rested}x)` : `${streak}d`);

  if (dailyDone) {
    setText('sub-status', 'Daily cleared · Endless open');
  }
};

const initSplash = async (): Promise<void> => {
  const username = context.username ?? 'Wanderer';
  setText('greeting', `u/${username}`);

  const dateKey = getUtcDateKey();
  const fallback = getDailyChallengeConfig(dateKey);
  renderDailyInfo(dateKey, fallback.biomeId, 0, 1, 0, false);

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
        'Begin unarmed. Draft Martial Arts & Inner Qi, awaken Secret Synergies, store Ultimate Qi on kills [R], and keep 100% of your spoils.'
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
    const serverDate = isString(dailyRaw.dateKey) ? dailyRaw.dateKey : dateKey;
    const delves = typeof dailyRaw.totalRunsToday === 'number' ? dailyRaw.totalRunsToday : 0;
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

    renderDailyInfo(serverDate, validBiome, delves, streak, rested, dailyDone);
  } catch {
    // Keep offline fallback rendering
  }
};

void initSplash();
