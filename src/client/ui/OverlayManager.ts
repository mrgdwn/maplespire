import { showToast } from '@devvit/web/client';
import {
  BOSS_MUTATIONS,
  getBiomeById,
  getBiomeForFloor,
  getEndBossNameForFloor,
  getMiniBossForFloor,
  getMutationById,
  rollBossMutations,
} from '../../shared/catalogs/biomes.ts';
import { CORE_BUFFS, getBuffById } from '../../shared/catalogs/buffs.ts';
import {
  WUXIA_ACTIVE_ARTS,
  WUXIA_HIGH_REALM_ACTIVE_SLOTS,
  WUXIA_HIGH_REALM_INNER_QI_SLOTS,
  WUXIA_INNER_QI,
  WUXIA_MAX_ACTIVE_SLOTS,
  WUXIA_MAX_INNER_QI_SLOTS,
  WUXIA_SECRET_SYNERGIES,
  computeWuxiaLoadout,
  getWuxiaActiveArtById,
  getWuxiaInnerQiById,
  getWuxiaManualById,
  getWuxiaSynergyById,
  isCultLeaderFloor,
  isRandomMiniBossFloor,
  refreshWuxiaDraftCard,
  rollWuxiaDraftCards,
  type WuxiaDraftOption,
} from '../../shared/catalogs/wuxia.ts';
import {
  CLASS_CATALOG,
  GEAR_SLOTS,
  computeHeroCombatStats,
  getClassDefinition,
  getJobAdvancementTitle,
} from '../../shared/catalogs/classes.ts';
import {
  ELEMENT_CATALOG,
  HYBRID_ELEMENTS,
  LEGENDARY_CATALOG,
  getHybridElement,
  getLegendaryById,
} from '../../shared/catalogs/legendaries.ts';
import type {
  CampActionRequest,
  ClassId,
  CompleteRunRequest,
  GearItem,
  GearSlot,
  LeaderboardEntry,
  LegionStatKey,
  MutationId,
  PlayerProfile,
  RunMode,
  RunRewardSummary,
} from '../../shared/types.ts';
import {
  SANCTUM_PURIFY_COST,
  awardClassExp,
  createGearItem,
  createInitialProfile,
  createLegendaryGearItem,
  expForNextLevel,
  getDailyChallengeConfig,
  getDismantleShardValue,
  getLegionUpgradeCost,
  getNextBanishSlotCost,
  getSlotUpgradeCost,
  getUtcDateKey,
  hashString,
  isBoolean,
  isClassId,
  isNumber,
  isRecord,
  isString,
  mulberry32,
  parseGearItem,
  parseLeaderboardEntry,
  parsePlayerProfile,
} from '../../shared/utils.ts';
import { renderHeroPaperdollCanvas } from '../fx/pixelArt.ts';
import { soundFX } from '../fx/sound.ts';
import {
  initAstryxRootAttributes,
  mountAstryxActionRow,
  mountAstryxCampTopBar,
  mountAstryxEmptyPanel,
  mountAstryxModalBanner,
  mountAstryxRunHudHeader,
  mountAstryxStatusBadge,
  mountAstryxTabStrip,
  unmountAstryxRootsInside,
  type AstryxActionButtonProps,
} from './AstryxWidgets.tsx';
import type {
  AppState,
  DungeonBridge,
  RunEndPayload,
  RunHudSnapshot,
} from './bridge.ts';

type CampTab = 'roster' | 'buildings' | 'codex' | 'leaderboard';

const LOCAL_PROFILE_KEY = 'wuxiaspire_local_profile_v2';
const DISCOVERED_SYNERGIES_KEY = 'wuxiaspire_discovered_synergies_v1';

const loadDiscoveredSynergies = (): Set<string> => {
  try {
    const raw = window.localStorage.getItem(DISCOVERED_SYNERGIES_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    const result = new Set<string>();
    for (const item of parsed) {
      if (typeof item === 'string' && getWuxiaSynergyById(item)) {
        result.add(item);
      }
    }
    return result;
  } catch {
    return new Set();
  }
};

const recordDiscoveredSynergy = (synergyId: string): boolean => {
  if (!getWuxiaSynergyById(synergyId)) return false;
  const set = loadDiscoveredSynergies();
  if (set.has(synergyId)) return false;
  set.add(synergyId);
  try {
    window.localStorage.setItem(DISCOVERED_SYNERGIES_KEY, JSON.stringify([...set]));
  } catch {
    // Ignore storage quota errors
  }
  return true;
};

const RELIC_LINEAGE_LABELS: Record<ClassId, string> = {
  warrior: 'External Relic',
  mage: 'Internal Relic',
  thief: 'Shadow Relic',
  bowman: 'Condor Relic',
};

const getRelicLineageLabel = (classId: ClassId): string => RELIC_LINEAGE_LABELS[classId];

export class OverlayManager {
  private root: HTMLElement;
  private bridge: DungeonBridge | null = null;
  private state: AppState;
  private mode: 'camp' | 'dungeon' = 'camp';
  private activeTab: CampTab = 'roster';
  private codexFilter: ClassId | 'synergies' | 'manuals' = 'synergies';
  private draftRng: () => number = mulberry32(1);
  private rouletteRng: () => number = mulberry32(2);
  private lastHud: RunHudSnapshot | null = null;
  private currentRunMode: RunMode = 'practice';
  private lastHudHeaderKey: string = '';
  private lastHudBuffsKey: string = '';
  private activeModal: HTMLElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    const dateKey = getUtcDateKey();
    const cfg = getDailyChallengeConfig(dateKey);
    this.state = {
      profile: createInitialProfile('Adventurer'),
      daily: {
        dateKey,
        seed: cfg.seed,
        biomeId: cfg.biomeId,
        bountyClass: cfg.bountyClass,
        totalRunsToday: 0,
        floor10ClearsToday: 0,
      },
      leaderboard: [],
    };
  }

  public setBridge(bridge: DungeonBridge): void {
    this.bridge = bridge;
  }

  private loadLocalProfile(): PlayerProfile | null {
    try {
      const saved = window.localStorage.getItem(LOCAL_PROFILE_KEY);
      if (!saved) return null;
      const parsed: unknown = JSON.parse(saved);
      return parsePlayerProfile(parsed, this.state.profile.username);
    } catch {
      return null;
    }
  }

  private saveLocalProfile(profile: PlayerProfile): void {
    try {
      window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }

  public async initialize(): Promise<void> {
    initAstryxRootAttributes();
    const cached = this.loadLocalProfile();
    if (cached) {
      this.state.profile = cached;
    }
    this.renderCamp();
    try {
      const res = await fetch('/api/init');
      if (!res.ok) return;
      const raw: unknown = await res.json();
      this.applyInitOrCompletePayload(raw);
      if (this.mode === 'camp') this.renderCamp();
    } catch {
      // Keep local fallback state
    }
  }

  private applyInitOrCompletePayload(raw: unknown): void {
    if (!isRecord(raw)) return;
    if (raw.profile) {
      this.state.profile = parsePlayerProfile(raw.profile, this.state.profile.username);
    }
    if (isRecord(raw.daily)) {
      const d = raw.daily;
      const dateKey = isString(d.dateKey) ? d.dateKey : this.state.daily.dateKey;
      const fallback = getDailyChallengeConfig(dateKey);
      const biomeStr = d.biomeId;
      const biomeId =
        biomeStr === 'slime_bog' ||
        biomeStr === 'glacial_spire' ||
        biomeStr === 'volcanic_caldera' ||
        biomeStr === 'shadow_alley' ||
        biomeStr === 'temple_of_time'
          ? biomeStr
          : fallback.biomeId;
      this.state.daily = {
        dateKey,
        seed: isNumber(d.seed) ? d.seed : fallback.seed,
        biomeId,
        bountyClass: isClassId(d.bountyClass) ? d.bountyClass : fallback.bountyClass,
        totalRunsToday: isNumber(d.totalRunsToday) ? d.totalRunsToday : 0,
        floor10ClearsToday: isNumber(d.floor10ClearsToday) ? d.floor10ClearsToday : 0,
      };
    }
    if (Array.isArray(raw.leaderboard)) {
      const entries: LeaderboardEntry[] = [];
      for (const item of raw.leaderboard) {
        const parsed = parseLeaderboardEntry(item);
        if (parsed) entries.push(parsed);
      }
      this.state.leaderboard = entries;
    }
  }

  private el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string = '',
    text: string = ''
  ): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  private clearModal(): void {
    if (this.activeModal) {
      unmountAstryxRootsInside(this.activeModal);
      this.activeModal.remove();
      this.activeModal = null;
    }
  }

  private showToastSafe(msg: string): void {
    try {
      showToast(msg);
    } catch {
      // ignore if outside Devvit shell
    }
  }

  private applyCampActionLocally(req: CampActionRequest): string | null {
    let p = this.state.profile;
    let message = 'Updated';

    switch (req.action) {
      case 'select_class': {
        p = { ...p, selectedClass: req.classId };
        message = `Selected ${getClassDefinition(req.classId).name}`;
        break;
      }
      case 'equip_item': {
        const item = p.inventory.find((i) => i.id === req.itemId);
        if (!item) return null;
        const cls = p.classes[item.classId];
        const prev = cls.equipped[item.slot];
        const nextInv = p.inventory.filter((i) => i.id !== item.id);
        if (prev) nextInv.unshift(prev);
        p = {
          ...p,
          inventory: nextInv,
          classes: {
            ...p.classes,
            [item.classId]: {
              ...cls,
              equipped: { ...cls.equipped, [item.slot]: item },
            },
          },
        };
        message = `Equipped ${item.name}`;
        break;
      }
      case 'dismantle_item': {
        const item = p.inventory.find((i) => i.id === req.itemId);
        if (!item) return null;
        const gained = getDismantleShardValue(item);
        p = {
          ...p,
          shards: p.shards + gained,
          inventory: p.inventory.filter((i) => i.id !== item.id),
        };
        message = `Dismantled ${item.name} (+${gained} Shards)`;
        break;
      }
      case 'dismantle_all_normal_rare': {
        let gained = 0;
        let count = 0;
        const kept: GearItem[] = [];
        for (const item of p.inventory) {
          if (item.tier === 'normal' || item.tier === 'rare') {
            gained += getDismantleShardValue(item);
            count += 1;
          } else {
            kept.push(item);
          }
        }
        p = { ...p, shards: p.shards + gained, inventory: kept };
        message = count > 0 ? `Dismantled ${count} items (+${gained} Shards)` : 'No Normal/Rare items';
        break;
      }
      case 'socket_element': {
        const cost = 15;
        if (p.shards < cost) {
          this.showToastSafe('Need 15 Shards to fuse Gem');
          return null;
        }
        let updated = false;
        const patch = (item: GearItem): GearItem => {
          if (item.id !== req.itemId || item.maxSockets === 0) return item;
          updated = true;
          const nextSockets =
            item.sockets.length < item.maxSockets
              ? [...item.sockets, req.elementId]
              : [...item.sockets.slice(1), req.elementId];
          return { ...item, sockets: nextSockets };
        };
        const nextInv = p.inventory.map(patch);
        const cls = p.classes[p.selectedClass];
        const nextWep = cls.equipped.weapon ? patch(cls.equipped.weapon) : null;
        if (!updated) return null;
        p = {
          ...p,
          shards: p.shards - cost,
          inventory: nextInv,
          classes: {
            ...p.classes,
            [p.selectedClass]: { ...cls, equipped: { ...cls.equipped, weapon: nextWep } },
          },
        };
        message = `Socketed ${req.elementId.toUpperCase()} gem!`;
        break;
      }
      case 'upgrade_slot': {
        const cls = p.classes[req.classId];
        const lvl = cls.slotLevels[req.slot];
        const cost = getSlotUpgradeCost(lvl);
        if (p.shards < cost.shards || p.gold < cost.gold) {
          this.showToastSafe(`Need ${cost.gold}g and ${cost.shards} Shards`);
          return null;
        }
        p = {
          ...p,
          gold: p.gold - cost.gold,
          shards: p.shards - cost.shards,
          classes: {
            ...p.classes,
            [req.classId]: {
              ...cls,
              slotLevels: { ...cls.slotLevels, [req.slot]: lvl + 1 },
            },
          },
        };
        message = `Upgraded ${req.slot} slot to Lv.${lvl + 1}`;
        break;
      }
      case 'purify_legendary': {
        if (p.shards < SANCTUM_PURIFY_COST.shards || p.bossCores < SANCTUM_PURIFY_COST.bossCores) {
          this.showToastSafe('Need 25 Shards & 2 Boss Cores');
          return null;
        }
        let purifiedName = '';
        const purify = (item: GearItem): GearItem => {
          if (item.id === req.itemId && item.isCursed) {
            purifiedName = item.name;
            return { ...item, isCursed: false };
          }
          return item;
        };
        const nextInv = p.inventory.map(purify);
        const nextClasses = { ...p.classes };
        const classIds: readonly ClassId[] = ['warrior', 'mage', 'thief', 'bowman'];
        for (const cId of classIds) {
          const cls = nextClasses[cId];
          const eq = { ...cls.equipped };
          for (const slot of GEAR_SLOTS) {
            const it = eq[slot];
            if (it) eq[slot] = purify(it);
          }
          nextClasses[cId] = { ...cls, equipped: eq };
        }
        if (!purifiedName) return null;
        p = {
          ...p,
          shards: p.shards - SANCTUM_PURIFY_COST.shards,
          bossCores: p.bossCores - SANCTUM_PURIFY_COST.bossCores,
          inventory: nextInv,
          classes: nextClasses,
        };
        message = `Purified ${purifiedName}!`;
        break;
      }
      case 'unlock_banish_slot': {
        const nextCost = getNextBanishSlotCost(p.unlockedBanishSlots);
        if (nextCost === null || p.gold < nextCost) return null;
        p = {
          ...p,
          gold: p.gold - nextCost,
          unlockedBanishSlots: p.unlockedBanishSlots + 1,
        };
        message = `Unlocked Banish Slot #${p.unlockedBanishSlots}`;
        break;
      }
      case 'toggle_banish_buff': {
        const buff = getBuffById(req.buffId);
        if (!buff || buff.tier !== 'bronze') return null;
        const exists = p.banishedBuffIds.includes(buff.id);
        if (exists) {
          p = { ...p, banishedBuffIds: p.banishedBuffIds.filter((id) => id !== buff.id) };
          message = `Unbanished ${buff.name}`;
        } else {
          if (p.banishedBuffIds.length >= p.unlockedBanishSlots) {
            this.showToastSafe(`All ${p.unlockedBanishSlots} Banish slots are full`);
            return null;
          }
          p = { ...p, banishedBuffIds: [...p.banishedBuffIds, buff.id] };
          message = `Banished ${buff.name}`;
        }
        break;
      }
      case 'upgrade_legion': {
        const lvl = p.legion[req.stat];
        const cost = getLegionUpgradeCost(lvl);
        if (p.gold < cost) return null;
        p = {
          ...p,
          gold: p.gold - cost,
          legion: { ...p.legion, [req.stat]: lvl + 1 },
        };
        message = `Legion ${req.stat.toUpperCase()} upgraded to Lv.${lvl + 1}`;
        break;
      }
      case 'toggle_auto_dismantle': {
        p = { ...p, autoDismantleNormal: !p.autoDismantleNormal };
        message = p.autoDismantleNormal ? 'Auto-dismantle ON' : 'Auto-dismantle OFF';
        break;
      }
    }

    this.state.profile = p;
    this.saveLocalProfile(p);
    return message;
  }

  private async sendCampAction(req: CampActionRequest): Promise<void> {
    try {
      const res = await fetch('/api/camp/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const raw: unknown = await res.json();
        if (isRecord(raw) && raw.profile) {
          this.state.profile = parsePlayerProfile(raw.profile, this.state.profile.username);
          this.saveLocalProfile(this.state.profile);
          if (isString(raw.message)) this.showToastSafe(raw.message);
          this.renderCamp();
          return;
        }
      } else {
        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const raw: unknown = await res.json();
          if (isRecord(raw) && isString(raw.message)) {
            this.showToastSafe(raw.message);
            return;
          }
        }
      }
    } catch {
      // Fallback to local profile storage below
    }

    const localMsg = this.applyCampActionLocally(req);
    if (localMsg) {
      this.showToastSafe(localMsg);
      this.renderCamp();
    }
  }

  // ==================== CAMP HUB RENDERING ====================

  public renderCamp(): void {
    this.mode = 'camp';
    this.clearModal();
    unmountAstryxRootsInside(this.root);
    this.root.innerHTML = '';

    const p = this.state.profile;
    const daily = this.state.daily;
    const biome = getBiomeById(daily.biomeId);
    const dailyCompleted = p.dailyRankedCompletedDate === daily.dateKey;
    const accountLevel =
      p.classes.warrior.level +
      p.classes.mage.level +
      p.classes.thief.level +
      p.classes.bowman.level;

    const wrap = this.el('div', 'camp-backdrop');

    // Header (Astryx React Island)
    const header = this.el('div', 'camp-header');
    const renderTopBar = (): void => {
      mountAstryxCampTopBar(header, {
        username: p.username,
        streakDays: p.streakDays,
        restedStacks: p.restedStacks,
        gold: p.gold,
        shards: p.shards,
        bossCores: p.bossCores,
        goldenTickets: p.goldenTickets,
        accountLevel,
        isMuted: soundFX.isMuted(),
        onToggleMute: () => {
          soundFX.toggleMute();
          renderTopBar();
        },
        quickLaunchLabel: !dailyCompleted
          ? 'Enter Wuxia Spire'
          : 'Endless Climb',
        onQuickLaunch: () => {
          void this.launchRun(!dailyCompleted ? 'daily' : 'practice', false);
        },
      });
    };
    renderTopBar();
    wrap.appendChild(header);

    // Daily Banner (Astryx Banner)
    const strip = this.el('div', 'astryx-block-slot');
    mountAstryxModalBanner(strip, {
      status: 'info',
      title: `Daily Cult Sect: ${biome.name} — F10/20/30: ${biome.endBossName}`,
      description: `${biome.mechanicName} • Classless Wanderer • Random Hall Master Mini-Bosses • 100% Loot Kept`,
      badgeText: '☯️ CLASSLESS',
      badgeTier: 'bounty',
    });
    wrap.appendChild(strip);

    // Tabs (Astryx Button + Badge Strip)
    const tabs = this.el('div', 'camp-tabs');
    const discoveredCount = loadDiscoveredSynergies().size;
    mountAstryxTabStrip(tabs, {
      items: [
        { id: 'roster', label: '🥋 Wanderer' },
        { id: 'buildings', label: '🏮 Courtyard' },
        {
          id: 'codex',
          label: '📜 Secret Scroll',
          badge: `${discoveredCount}/${WUXIA_SECRET_SYNERGIES.length}`,
        },
        {
          id: 'leaderboard',
          label: '🏆 Ranks',
          ...(this.state.leaderboard.length > 0
            ? { badge: String(this.state.leaderboard.length) }
            : {}),
        },
      ],
      activeId: this.activeTab,
      onSelect: (id) => {
        if (id === 'roster' || id === 'buildings' || id === 'codex' || id === 'leaderboard') {
          this.activeTab = id;
          this.renderCamp();
        }
      },
    });
    wrap.appendChild(tabs);

    // Body
    const body = this.el('div', 'camp-body');
    if (this.activeTab === 'roster') this.renderRosterTab(body);
    else if (this.activeTab === 'buildings') this.renderBuildingsTab(body);
    else if (this.activeTab === 'codex') this.renderCodexTab(body);
    else this.renderLeaderboardTab(body);
    wrap.appendChild(body);

    // Footer Launch Buttons (Astryx Action Row)
    const footer = this.el('div', 'camp-footer');
    const footerActions: AstryxActionButtonProps[] = [];
    if (!dailyCompleted) {
      footerActions.push({
        label: '⚔️ BEGIN DAILY RANKED ASCENT (Unarmed Wanderer)',
        variant: 'primary',
        size: 'md',
        onClick: () => {
          void this.launchRun('daily', false);
        },
      });
    } else if (p.goldenTickets > 0) {
      footerActions.push({
        label: `🎫 SPEND GOLDEN WRIT FOR RANKED ASCENT (${p.goldenTickets} left)`,
        variant: 'primary',
        size: 'md',
        onClick: () => {
          void this.launchRun('daily', true);
        },
      });
    }
    footerActions.push({
      label: dailyCompleted
        ? '⛰️ ENDLESS PRACTICE CLIMB (10/20/30+)'
        : '⛰️ PRACTICE CLIMB (No Daily Lockout)',
      variant: 'secondary',
      size: 'md',
      onClick: () => {
        void this.launchRun('practice', false);
      },
    });
    mountAstryxActionRow(footer, footerActions);

    wrap.appendChild(footer);
    this.root.appendChild(wrap);
  }

  private renderRosterTab(container: HTMLElement): void {
    const p = this.state.profile;
    const discovered = loadDiscoveredSynergies();

    const rulesCard = this.el('div', 'card');
    const rulesRow = this.el('div', 'row-between');
    rulesRow.appendChild(
      this.el('strong', '', '☯️ Classless Wuxia Wanderer — Empty-Handed Ascent')
    );
    const badgeWrap = this.el('span', 'astryx-inline-slot');
    mountAstryxStatusBadge(badgeWrap, {
      label: `${discovered.size}/${WUXIA_SECRET_SYNERGIES.length} Secret Synergies Discovered`,
      tier: discovered.size > 0 ? 'prismatic' : 'silver',
    });
    rulesRow.appendChild(badgeWrap);
    rulesCard.appendChild(rulesRow);
    rulesCard.appendChild(
      this.el(
        'div',
        'muted',
        `Start every run unarmed with Taiji Fist & Qinggong Dash. Draft up to ${WUXIA_MAX_ACTIVE_SLOTS}–${WUXIA_HIGH_REALM_ACTIVE_SLOTS} Active Martial Arts (Lv.1→Lv.5 Transcendent, 4th slot unlocks at F15) & ${WUXIA_MAX_INNER_QI_SLOTS}–${WUXIA_HIGH_REALM_INNER_QI_SLOTS} Inner Qi Manuals, then pair matching manuals to awaken hidden Peerless Synergies!`
      )
    );
    container.appendChild(rulesCard);

    // Selected Wanderer paperdoll + stats + equipped Relics + bag
    const selId = p.selectedClass;
    const selProg = p.classes[selId];
    const selJob = getJobAdvancementTitle(selProg.level);
    const nextExp = expForNextLevel(selProg.level);
    const stats = computeHeroCombatStats(p, selId, [], 0, 0);

    const split = this.el('div', 'grid-2');
    split.style.marginTop = '10px';

    // Equipped column with visual Paperdoll Showcase
    const eqBox = this.el('div', 'card');
    const showcase = this.el('div', 'paperdoll-showcase');
    const stageCanvas = document.createElement('canvas');
    stageCanvas.width = 92;
    stageCanvas.height = 92;
    stageCanvas.className = 'paperdoll-stage';
    renderHeroPaperdollCanvas(stageCanvas, selId, selProg.equipped);
    showcase.appendChild(stageCanvas);

    const metaCol = this.el('div', 'paperdoll-meta');
    const heroTitle = this.el(
      'div',
      'class-name',
      `Wuxia Wanderer Lv.${selProg.level} • ${selJob.title} (${selProg.exp}/${nextExp})`
    );
    heroTitle.style.color = '#fbbf24';
    metaCol.appendChild(heroTitle);

    const statGrid = this.el('div', 'stat-grid');
    const statItems: readonly string[] = [
      `❤️ ${stats.maxHp} HP`,
      `⚔️ ${stats.atk} ATK`,
      `⚡ ${stats.attackSpeed}/s`,
      `🛡️ ${stats.armor} ARM`,
      `💥 ${Math.round(stats.critRate * 100)}% CRIT`,
      `💨 ${Math.round(stats.dodgeRate * 100)}% DODGE`,
    ];
    for (const sText of statItems) {
      statGrid.appendChild(this.el('span', 'pill', sText));
    }
    metaCol.appendChild(statGrid);
    showcase.appendChild(metaCol);
    eqBox.appendChild(showcase);

    const slotIcons: Record<GearSlot, string> = {
      weapon: '⚔️',
      headgear: '🪖',
      top: '🛡️',
      cape: '🧣',
    };

    for (const slot of GEAR_SLOTS) {
      const item = selProg.equipped[slot];
      const leg = item?.legendaryId ? getLegendaryById(item.legendaryId) : null;
      const displayName = leg ? leg.name : item ? item.name : `Empty ${slot}`;
      const displayAffix = leg ? leg.signatureText : item ? item.affixText : '';
      const slotLvl = selProg.slotLevels[slot];
      const box = this.el(
        'div',
        `gear-item ${item ? `tier-${item.tier}` : ''} ${item?.isCursed ? 'cursed-tag' : ''}`
      );
      const row = this.el('div', 'row-between');
      row.appendChild(
        this.el(
          'strong',
          '',
          `${slotIcons[slot]} ${
            slot === 'weapon' && (!item || item.id.startsWith('starter_wep_'))
              ? 'Unarmed (Taiji Fist)'
              : displayName
          }`
        )
      );
      const rightTags = this.el('div', 'row-wrap');
      rightTags.appendChild(this.el('span', 'pill', `+${slotLvl * 10}%`));
      if (item?.isCursed) {
        rightTags.appendChild(this.el('span', 'pill', 'CURSED'));
      }
      row.appendChild(rightTags);
      box.appendChild(row);
      if (item) {
        box.appendChild(this.el('div', 'muted', `+${item.baseStatBonus} Power • ${displayAffix}`));
        if (leg && item.isCursed) {
          box.appendChild(
            this.el('div', 'muted', `⚠️ ${leg.cursedName}: ${leg.cursedText}`)
          );
        }
        if (item.maxSockets > 0) {
          const hybrid = getHybridElement(item.sockets);
          const socketRow = this.el('div', 'row-wrap');
          socketRow.appendChild(
            this.el(
              'span',
              'muted',
              `💎 ${item.sockets.length}/${item.maxSockets}${item.sockets.length > 0 ? `: ${item.sockets.join('+').toUpperCase()}` : ''}${hybrid ? ` [${hybrid.name}]` : ''}`
            )
          );
          for (const elem of ELEMENT_CATALOG) {
            const sockBtn = this.el('button', 'btn btn-sm', `${elem.id.slice(0, 3).toUpperCase()} 15💎`);
            sockBtn.title = `Socket ${elem.name} Gem (15 Shards)`;
            sockBtn.disabled = p.shards < 15;
            sockBtn.addEventListener('click', () => {
              void this.sendCampAction({
                action: 'socket_element',
                itemId: item.id,
                elementId: elem.id,
              });
            });
            socketRow.appendChild(sockBtn);
          }
          box.appendChild(socketRow);
        }
      }
      eqBox.appendChild(box);
    }
    split.appendChild(eqBox);

    // Inventory bag column
    const bagBox = this.el('div', 'card');
    const bagHead = this.el('div', 'row-between');
    bagHead.appendChild(this.el('div', 'class-name', `Bag (${p.inventory.length}/60)`));
    const bulkBtn = this.el('button', 'btn btn-sm', '♻️ Dismantle All Normal/Rare');
    bulkBtn.addEventListener('click', () => {
      void this.sendCampAction({ action: 'dismantle_all_normal_rare' });
    });
    bagHead.appendChild(bulkBtn);
    bagBox.appendChild(bagHead);

    if (p.inventory.length === 0) {
      const emptyHost = this.el('div', 'astryx-block-slot');
      mountAstryxEmptyPanel(emptyHost, {
        title: 'Inventory Bag Empty',
        description:
          'Complete a delve to collect Normal, Rare, and Unique Legendary gear!',
      });
      bagBox.appendChild(emptyHost);
    } else {
      for (const item of p.inventory) {
        const leg = item.legendaryId ? getLegendaryById(item.legendaryId) : null;
        const displayName = leg ? leg.name : item.name;
        const displayAffix = leg ? leg.signatureText : item.affixText;
        const card = this.el(
          'div',
          `gear-item tier-${item.tier} ${item.isCursed ? 'cursed-tag' : ''}`
        );
        const top = this.el('div', 'row-between');
        top.appendChild(
          this.el(
            'strong',
            '',
            `${displayName} (${getRelicLineageLabel(item.classId)} ${item.slot})`
          )
        );
        const itemBadgeHost = this.el('span', 'astryx-inline-slot');
        mountAstryxStatusBadge(itemBadgeHost, {
          label: `${item.tier.toUpperCase()}${item.isCursed ? ' • CURSED' : ''}`,
          tier: item.isCursed ? 'cursed' : item.tier,
        });
        top.appendChild(itemBadgeHost);
        card.appendChild(top);
        card.appendChild(this.el('div', 'muted', `+${item.baseStatBonus} Power • ${displayAffix}`));

        const acts = this.el('div', 'astryx-inline-slot');
        mountAstryxActionRow(acts, [
          {
            label: 'Equip',
            variant: 'primary',
            size: 'sm',
            onClick: () => {
              void this.sendCampAction({ action: 'equip_item', itemId: item.id });
            },
          },
          {
            label: `Dismantle (+${getDismantleShardValue(item)}💎)`,
            variant: 'secondary',
            size: 'sm',
            onClick: () => {
              void this.sendCampAction({ action: 'dismantle_item', itemId: item.id });
            },
          },
        ]);
        card.appendChild(acts);
        bagBox.appendChild(card);
      }
    }
    split.appendChild(bagBox);
    container.appendChild(split);
  }

  private renderBuildingsTab(container: HTMLElement): void {
    const p = this.state.profile;
    const grid = this.el('div', 'grid-2');

    // 1. Blacksmith
    const smith = this.el('div', 'card');
    smith.appendChild(
      this.el(
        'div',
        'class-name',
        '🔨 Sect Forge (Relic Slot Tempering)'
      )
    );
    smith.appendChild(
      this.el('div', 'muted', 'Spend Gold & Shards to permanently empower each gear slot (+10% stats/level).')
    );

    const autoRow = this.el('div', 'row-between');
    autoRow.appendChild(
      this.el('span', 'muted', `Auto-Dismantle Normal drops: ${p.autoDismantleNormal ? 'ON' : 'OFF'}`)
    );
    const autoBtn = this.el('button', 'btn btn-sm', p.autoDismantleNormal ? 'Disable' : 'Enable');
    autoBtn.addEventListener('click', () => {
      void this.sendCampAction({ action: 'toggle_auto_dismantle' });
    });
    autoRow.appendChild(autoBtn);
    smith.appendChild(autoRow);

    const clsProg = p.classes[p.selectedClass];
    for (const slot of GEAR_SLOTS) {
      const lvl = clsProg.slotLevels[slot];
      const cost = getSlotUpgradeCost(lvl);
      const row = this.el('div', 'row-between');
      row.appendChild(this.el('span', '', `${slot.toUpperCase()} Lv.${lvl} (+${lvl * 10}%)`));
      const upBtn = this.el(
        'button',
        'btn btn-sm btn-gold',
        `Upgrade (${cost.gold}g, ${cost.shards}💎)`
      );
      upBtn.disabled = p.gold < cost.gold || p.shards < cost.shards;
      upBtn.addEventListener('click', () => {
        void this.sendCampAction({
          action: 'upgrade_slot',
          classId: p.selectedClass,
          slot,
        });
      });
      row.appendChild(upBtn);
      smith.appendChild(row);
    }
    grid.appendChild(smith);

    // 2. The Sanctum
    const sanctum = this.el('div', 'card');
    sanctum.appendChild(this.el('div', 'class-name', '✨ The Sanctum (Purify Cursed Legendaries)'));
    sanctum.appendChild(
      this.el(
        'div',
        'muted',
        `Cleanse any Cursed Legendary into its Pristine form (${SANCTUM_PURIFY_COST.shards}💎 + ${SANCTUM_PURIFY_COST.bossCores}🔮).`
      )
    );

    const cursedItems: GearItem[] = [];
    for (const item of p.inventory) {
      if (item.isCursed) cursedItems.push(item);
    }
    for (const clsDef of CLASS_CATALOG) {
      const eq = p.classes[clsDef.id].equipped;
      for (const slot of GEAR_SLOTS) {
        const it = eq[slot];
        if (it?.isCursed) cursedItems.push(it);
      }
    }

    if (cursedItems.length === 0) {
      sanctum.appendChild(
        this.el('div', 'muted', 'No Cursed Legendaries owned yet. Clear Floor 10 in a Daily Run to earn Legendaries!')
      );
    } else {
      for (const item of cursedItems) {
        const leg = getLegendaryById(item.legendaryId);
        const row = this.el('div', 'gear-item tier-legendary cursed-tag');
        row.appendChild(this.el('strong', '', leg ? leg.name : item.name));
        if (leg) {
          row.appendChild(this.el('div', 'muted', `Curse: ${leg.cursedName} — ${leg.cursedText}`));
        }
        const purBtn = this.el(
          'button',
          'btn btn-sm btn-purple',
          `Purify (${SANCTUM_PURIFY_COST.shards}💎, ${SANCTUM_PURIFY_COST.bossCores}🔮)`
        );
        purBtn.disabled =
          p.shards < SANCTUM_PURIFY_COST.shards || p.bossCores < SANCTUM_PURIFY_COST.bossCores;
        purBtn.addEventListener('click', () => {
          void this.sendCampAction({ action: 'purify_legendary', itemId: item.id });
        });
        row.appendChild(purBtn);
        sanctum.appendChild(row);
      }
    }
    grid.appendChild(sanctum);

    // 3. Alchemy Altar
    const alchemy = this.el('div', 'card');
    alchemy.appendChild(
      this.el(
        'div',
        'class-name',
        `⚗️ Alchemy Altar (Banish ${p.banishedBuffIds.length}/${p.unlockedBanishSlots})`
      )
    );
    alchemy.appendChild(
      this.el('div', 'muted', 'Banish unwanted Bronze buffs so they never appear in your floor drafts.')
    );

    const nextSlotCost = getNextBanishSlotCost(p.unlockedBanishSlots);
    if (nextSlotCost !== null) {
      const unlockBtn = this.el(
        'button',
        'btn btn-sm btn-gold',
        `Unlock Banish Slot #${p.unlockedBanishSlots + 1} (${nextSlotCost}g)`
      );
      unlockBtn.disabled = p.gold < nextSlotCost;
      unlockBtn.addEventListener('click', () => {
        void this.sendCampAction({ action: 'unlock_banish_slot' });
      });
      alchemy.appendChild(unlockBtn);
    }

    const bronzeBuffs = CORE_BUFFS.filter((b) => b.tier === 'bronze');
    const banishWrap = this.el('div', 'row-wrap');
    for (const b of bronzeBuffs) {
      const isBanished = p.banishedBuffIds.includes(b.id);
      const bBtn = this.el(
        'button',
        `btn btn-sm ${isBanished ? 'btn-purple' : ''}`,
        `${b.icon} ${b.name}${isBanished ? ' [BANISHED]' : ''}`
      );
      bBtn.addEventListener('click', () => {
        void this.sendCampAction({ action: 'toggle_banish_buff', buffId: b.id });
      });
      banishWrap.appendChild(bBtn);
    }
    alchemy.appendChild(banishWrap);
    grid.appendChild(alchemy);

    // 4. Legion Board
    const legion = this.el('div', 'card');
    legion.appendChild(this.el('div', 'class-name', '☯️ Meridian Cultivation (Account-Wide Stats)'));
    legion.appendChild(
      this.el('div', 'muted', 'Permanent Silver Tael cultivation empowering all ascents.')
    );

    const nodes: readonly { key: LegionStatKey; label: string }[] = [
      { key: 'atk', label: '+1% Base ATK' },
      { key: 'hp', label: '+1% Max HP' },
      { key: 'gold', label: '+1% Gold Gain' },
      { key: 'critDmg', label: '+1% Crit DMG' },
    ];
    for (const n of nodes) {
      const lvl = p.legion[n.key];
      const cost = getLegionUpgradeCost(lvl);
      const row = this.el('div', 'row-between');
      row.appendChild(this.el('span', '', `${n.label} (Lv.${lvl} -> +${lvl}%)`));
      const btn = this.el('button', 'btn btn-sm btn-gold', `Upgrade (${cost}g)`);
      btn.disabled = p.gold < cost;
      btn.addEventListener('click', () => {
        void this.sendCampAction({ action: 'upgrade_legion', stat: n.key });
      });
      row.appendChild(btn);
      legion.appendChild(row);
    }
    grid.appendChild(legion);

    container.appendChild(grid);
  }

  private renderCodexTab(container: HTMLElement): void {
    const discovered = loadDiscoveredSynergies();
    const filterRow = this.el('div', 'row-wrap');
    filterRow.style.marginBottom = '10px';

    const synBtn = this.el(
      'button',
      `tab-btn ${this.codexFilter === 'synergies' ? 'active' : ''}`,
      `🔮 Secret Synergies (${discovered.size}/${WUXIA_SECRET_SYNERGIES.length})`
    );
    synBtn.addEventListener('click', () => {
      this.codexFilter = 'synergies';
      this.renderCamp();
    });
    filterRow.appendChild(synBtn);

    const manualsBtn = this.el(
      'button',
      `tab-btn ${this.codexFilter === 'manuals' ? 'active' : ''}`,
      `🥋 Arts & Inner Qi (${WUXIA_ACTIVE_ARTS.length + WUXIA_INNER_QI.length})`
    );
    manualsBtn.addEventListener('click', () => {
      this.codexFilter = 'manuals';
      this.renderCamp();
    });
    filterRow.appendChild(manualsBtn);

    for (const c of CLASS_CATALOG) {
      const btn = this.el(
        'button',
        `tab-btn ${this.codexFilter === c.id ? 'active' : ''}`,
        `🏺 ${getRelicLineageLabel(c.id)}s`
      );
      btn.addEventListener('click', () => {
        this.codexFilter = c.id;
        this.renderCamp();
      });
      filterRow.appendChild(btn);
    }
    container.appendChild(filterRow);

    if (this.codexFilter === 'synergies') {
      container.appendChild(
        this.el(
          'div',
          'muted',
          'Secret Peerless Synergies awaken inside the Spire when a Lv.3 Ultimate Martial Art meets its hidden Inner Qi counterpart. Experiment during runs to unlock every entry below!'
        )
      );
      const grid = this.el('div', 'grid-2');
      grid.style.marginTop = '8px';
      for (const syn of WUXIA_SECRET_SYNERGIES) {
        const isKnown = discovered.has(syn.id);
        const card = this.el('div', `draft-card ${isKnown ? 'tier-prismatic' : 'tier-cursed'}`);
        if (isKnown) {
          const art = getWuxiaActiveArtById(syn.activeId);
          const qi = getWuxiaInnerQiById(syn.innerQiId);
          card.appendChild(this.el('span', 'tier-badge', 'DISCOVERED SECRET SYNERGY'));
          card.appendChild(this.el('strong', '', `${syn.icon} ${syn.name}`));
          card.appendChild(
            this.el(
              'div',
              'muted',
              `Formula: ${art ? `${art.icon} ${art.name} (Lv.3)` : syn.activeId} + ${qi ? `${qi.icon} ${qi.name} (Lv.1+)` : syn.innerQiId}`
            )
          );
          card.appendChild(this.el('div', 'muted', syn.description));
        } else {
          card.appendChild(this.el('span', 'tier-badge', '??? UNDISCOVERED'));
          card.appendChild(this.el('strong', '', '❓ Hidden Peerless Technique'));
          card.appendChild(this.el('div', 'muted', `Wuxia Clue: "${syn.riddleHint}"`));
        }
        grid.appendChild(card);
      }
      container.appendChild(grid);
      return;
    }

    if (this.codexFilter === 'manuals') {
      container.appendChild(
        this.el(
          'strong',
          '',
          '🥋 Active Martial Arts (3 Slots F1–14, 4th Slot at F15+ • Lv.1→Lv.3 Ultimate → Lv.5 Transcendent at F21+)'
        )
      );
      const activeGrid = this.el('div', 'grid-3');
      activeGrid.style.marginTop = '6px';
      for (const art of WUXIA_ACTIVE_ARTS) {
        const card = this.el('div', 'draft-card tier-gold');
        card.appendChild(this.el('span', 'tier-badge', `ACTIVE • ${art.sectOrigin}`));
        card.appendChild(this.el('strong', '', `${art.icon} ${art.name}`));
        card.appendChild(this.el('div', 'muted', `Lv.1: ${art.levelDescriptions[0]}`));
        card.appendChild(this.el('div', 'muted', `Lv.3: ${art.levelDescriptions[2]}`));
        card.appendChild(this.el('div', 'muted', `Lv.5: ${art.levelDescriptions[4]}`));
        activeGrid.appendChild(card);
      }
      container.appendChild(activeGrid);

      const qiHeading = this.el(
        'strong',
        '',
        '☯️ Inner Qi / Neigong Manuals (3 Slots F1–14, 4th Slot at F15+ • Lv.1→Lv.5 Transcendent)'
      );
      qiHeading.style.display = 'block';
      qiHeading.style.marginTop = '12px';
      container.appendChild(qiHeading);
      const qiGrid = this.el('div', 'grid-4');
      qiGrid.style.marginTop = '6px';
      for (const qi of WUXIA_INNER_QI) {
        const card = this.el('div', 'draft-card tier-silver');
        card.appendChild(this.el('span', 'tier-badge', `INNER QI • ${qi.sectOrigin}`));
        card.appendChild(this.el('strong', '', `${qi.icon} ${qi.name}`));
        card.appendChild(this.el('div', 'muted', `Lv.1: ${qi.levelDescriptions[0]}`));
        card.appendChild(this.el('div', 'muted', `Lv.3: ${qi.levelDescriptions[2]}`));
        card.appendChild(this.el('div', 'muted', `Lv.5: ${qi.levelDescriptions[4]}`));
        qiGrid.appendChild(card);
      }
      container.appendChild(qiGrid);
      return;
    }

    const items = LEGENDARY_CATALOG.filter((i) => i.classId === this.codexFilter);
    const grid = this.el('div', 'grid-2');
    for (const item of items) {
      const card = this.el('div', 'gear-item tier-legendary');
      const row = this.el('div', 'row-between');
      row.appendChild(this.el('strong', '', item.name));
      row.appendChild(this.el('span', 'pill', item.slot.toUpperCase()));
      card.appendChild(row);
      card.appendChild(this.el('div', 'muted', `Pristine: ${item.signatureText}`));
      card.appendChild(this.el('div', 'muted', `Cursed (${item.cursedName}): ${item.cursedText}`));
      grid.appendChild(card);
    }

    // Hybrid elements footer in codex
    const hybCard = this.el('div', 'card');
    hybCard.style.marginTop = '10px';
    hybCard.appendChild(this.el('strong', '', 'Weapon Dual-Socket Hybrid Synergies (Legendary Weapons)'));
    for (const h of HYBRID_ELEMENTS) {
      hybCard.appendChild(
        this.el('div', 'muted', `${h.name} (${h.elements[0]} + ${h.elements[1]}): ${h.effectText}`)
      );
    }
    container.appendChild(grid);
    container.appendChild(hybCard);
  }

  private renderLeaderboardTab(container: HTMLElement): void {
    const daily = this.state.daily;
    container.appendChild(
      this.el(
        'div',
        'muted',
        `Today (${daily.dateKey}): ${daily.totalRunsToday} Total Delves • ${daily.floor10ClearsToday} Floor 10 Clears`
      )
    );

    if (this.state.leaderboard.length === 0) {
      container.appendChild(
        this.el('div', 'card', 'No ranked delves recorded today yet. Be the first on the Daily Leaderboard!')
      );
      return;
    }

    const table = this.el('table', 'table');
    const thead = this.el('thead');
    const hr = this.el('tr');
    for (const col of ['#', 'Redditor', 'Path', 'Result', 'Time', 'Gold', 'Legendary']) {
      hr.appendChild(this.el('th', '', col));
    }
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = this.el('tbody');
    for (const entry of this.state.leaderboard) {
      const tr = this.el('tr');
      tr.appendChild(this.el('td', '', String(entry.rank)));
      tr.appendChild(this.el('td', '', `u/${entry.username}`));
      tr.appendChild(this.el('td', '', 'Wuxia Wanderer'));
      tr.appendChild(
        this.el(
          'td',
          '',
          entry.outcome === 'cleared'
            ? 'Cleared F10'
            : entry.outcome === 'extracted'
              ? `Extracted F${entry.floorReached}`
              : `Fell F${entry.floorReached}`
        )
      );
      tr.appendChild(this.el('td', '', `${(entry.durationMs / 1000).toFixed(1)}s`));
      tr.appendChild(this.el('td', '', `${entry.goldEarned}g`));
      tr.appendChild(this.el('td', '', entry.legendaryName ?? '—'));
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);
  }

  // ==================== START RUN & DUNGEON HUD ====================

  private async launchRun(requestedMode: RunMode, useGoldenTicket: boolean): Promise<void> {
    if (!this.bridge) return;

    let runId = `local_${Date.now()}`;
    let actualMode: RunMode = requestedMode;
    let seed =
      requestedMode === 'daily'
        ? this.state.daily.seed
        : Math.floor(Math.random() * 1_000_000_000);

    try {
      const res = await fetch('/api/run/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: requestedMode,
          classId: this.state.profile.selectedClass,
          useGoldenTicket,
        }),
      });
      if (res.ok) {
        const raw: unknown = await res.json();
        if (isRecord(raw)) {
          if (isString(raw.runId)) runId = raw.runId;
          if (raw.mode === 'daily' || raw.mode === 'practice') actualMode = raw.mode;
          if (isNumber(raw.seed)) seed = raw.seed;
          if (raw.profile) {
            this.state.profile = parsePlayerProfile(raw.profile, this.state.profile.username);
          }
        }
      }
    } catch {
      // Offline fallback
    }

    this.draftRng = mulberry32(seed ^ 0x9e3779b9);
    this.rouletteRng = mulberry32(seed ^ 0x85ebca6b);

    this.mode = 'dungeon';
    this.currentRunMode = actualMode;
    this.lastHudHeaderKey = '';
    this.renderDungeonHudShell();

    this.bridge.startRun({
      runId,
      mode: actualMode,
      seed,
      biomeId: this.state.daily.biomeId,
      classId: this.state.profile.selectedClass,
      profile: this.state.profile,
      daily: this.state.daily,
    });
  }

  private renderDungeonHudShell(): void {
    unmountAstryxRootsInside(this.root);
    this.root.innerHTML = '';

    const top = this.el('div', 'hud-top');
    top.id = 'hud-top';

    const left = this.el('div', 'hud-hp-box');
    const floorLbl = this.el('strong', '', 'Floor 1 • Unarmed Start');
    floorLbl.id = 'hud-floor';
    const hpTrack = this.el('div', 'bar-track');
    const hpFill = this.el('div', 'bar-fill');
    hpFill.id = 'hud-hp-fill';
    hpTrack.appendChild(hpFill);
    const hpText = this.el('div', 'muted', 'HP 200 / 200');
    hpText.id = 'hud-hp-text';
    left.appendChild(floorLbl);
    left.appendChild(hpTrack);
    left.appendChild(hpText);
    top.appendChild(left);

    const astryxMetaHost = this.el('div', 'astryx-inline-slot');
    astryxMetaHost.id = 'hud-astryx-meta';
    this.lastHudHeaderKey = '';
    this.lastHudBuffsKey = '';
    const dailyBiome = getBiomeById(this.state.daily.biomeId);
    mountAstryxRunHudHeader(astryxMetaHost, {
      biomeName: dailyBiome.name,
      runModeLabel: this.currentRunMode === 'daily' ? 'DAILY RANKED' : 'PRACTICE',
      buffCount: 0,
      isBossActive: false,
    });
    top.appendChild(astryxMetaHost);

    const bossBox = this.el('div', 'hud-boss-box');
    bossBox.id = 'hud-boss-box';
    bossBox.style.display = 'none';
    const bossName = this.el('strong', '', 'BOSS');
    bossName.id = 'hud-boss-name';
    const bossTrack = this.el('div', 'bar-track');
    const bossFill = this.el('div', 'bar-fill');
    bossFill.id = 'hud-boss-fill';
    bossFill.style.background = '#f97316';
    bossTrack.appendChild(bossFill);
    const bossSub = this.el('div', 'muted', '');
    bossSub.id = 'hud-boss-sub';
    bossBox.appendChild(bossName);
    bossBox.appendChild(bossTrack);
    bossBox.appendChild(bossSub);
    top.appendChild(bossBox);

    const right = this.el('div', 'row-wrap');
    const lootTxt = this.el('span', 'pill pill-gold', '🪙 0g • 💎 0 • 🔮 0');
    lootTxt.id = 'hud-loot';
    right.appendChild(lootTxt);

    const muteBtn = this.el('button', 'btn btn-sm', soundFX.isMuted() ? '🔇' : '🔊');
    muteBtn.addEventListener('click', () => {
      muteBtn.textContent = soundFX.toggleMute() ? '🔇' : '🔊';
    });
    right.appendChild(muteBtn);

    const retreatBtn = this.el('button', 'btn btn-sm btn-green', '🏮 Retreat (Keep Loot)');
    retreatBtn.addEventListener('click', () => {
      this.bridge?.retreatWithLoot();
    });
    right.appendChild(retreatBtn);
    top.appendChild(right);

    const bottom = this.el('div', 'hud-bottom');
    const controls = this.el('div', 'row-wrap');

    const skillBtn = this.el('button', 'btn btn-sm btn-primary', '⚡ Taiji Strike [Q]');
    skillBtn.id = 'hud-skill-btn';
    skillBtn.style.minWidth = '155px';
    skillBtn.addEventListener('click', () => {
      this.bridge?.triggerActiveSkill();
    });

    const dashBtn = this.el('button', 'btn btn-sm btn-primary', '💨 Qinggong [Space]');
    dashBtn.id = 'hud-dash-btn';
    dashBtn.addEventListener('click', () => {
      this.bridge?.triggerDash();
    });

    const autoBtn = this.el('button', 'btn btn-sm btn-green', 'Auto: ON');
    autoBtn.id = 'hud-auto-btn';
    autoBtn.addEventListener('click', () => {
      const next = this.bridge?.toggleAutoSkill() ?? true;
      autoBtn.textContent = `Auto: ${next ? 'ON' : 'OFF'}`;
    });

    const potBtn = this.el('button', 'btn btn-sm btn-purple', '🧪 Pill [W] (1)');
    potBtn.id = 'hud-pot-btn';
    potBtn.addEventListener('click', () => {
      this.bridge?.triggerPotion();
    });

    const spdBtn = this.el('button', 'btn btn-sm', '1x');
    spdBtn.id = 'hud-spd-btn';
    spdBtn.addEventListener('click', () => {
      const next = this.bridge?.toggleSpeed() ?? 1;
      spdBtn.textContent = `${next}x`;
    });

    controls.appendChild(skillBtn);
    controls.appendChild(dashBtn);
    controls.appendChild(autoBtn);
    controls.appendChild(potBtn);
    controls.appendChild(spdBtn);

    const buffStrip = this.el('div', 'buff-strip');
    buffStrip.id = 'hud-buffs';

    bottom.appendChild(controls);
    bottom.appendChild(buffStrip);

    this.root.appendChild(top);
    this.root.appendChild(bottom);
  }

  public updateRunHud(hud: RunHudSnapshot): void {
    if (this.mode !== 'dungeon') return;
    this.lastHud = hud;

    const floorEl = document.getElementById('hud-floor');
    if (floorEl) floorEl.textContent = `Floor ${hud.floor} (Boss F${hud.maxFloors}) • ${hud.waveLabel}`;

    const hpFill = document.getElementById('hud-hp-fill');
    if (hpFill) {
      hpFill.style.width = `${Math.min(100, Math.round((hud.hp / Math.max(1, hud.maxHp)) * 100))}%`;
    }

    const hpText = document.getElementById('hud-hp-text');
    if (hpText) {
      hpText.textContent = `HP ${hud.hp}/${hud.maxHp}${hud.shield > 0 ? ` (+${hud.shield} Shield)` : ''}`;
    }

    const bossBox = document.getElementById('hud-boss-box');
    if (bossBox) {
      if (hud.activeBossName) {
        bossBox.style.display = 'flex';
        const bName = document.getElementById('hud-boss-name');
        if (bName) bName.textContent = hud.activeBossName;
        const bFill = document.getElementById('hud-boss-fill');
        if (bFill) {
          bFill.style.width = `${Math.min(100, Math.round((hud.activeBossHp / Math.max(1, hud.activeBossMaxHp)) * 100))}%`;
        }
        const bSub = document.getElementById('hud-boss-sub');
        if (bSub) {
          const muts = hud.activeMutations.map((m) => getMutationById(m).name).join(' + ');
          bSub.textContent = `${hud.activeBossHp}/${hud.activeBossMaxHp}${hud.activeBossShield > 0 ? ` • Ice Shield ${hud.activeBossShield}` : ''}${muts ? ` • ${muts}` : ''}`;
        }
      } else {
        bossBox.style.display = 'none';
      }
    }

    const lootEl = document.getElementById('hud-loot');
    if (lootEl) lootEl.textContent = `🪙 ${hud.gold}g • 💎 ${hud.shards} • 🔮 ${hud.cores}`;

    const isBossActive = hud.activeBossName !== null;
    const headerKey = `${hud.floor}:${hud.draftedBuffIds.length}:${isBossActive ? '1' : '0'}`;
    if (headerKey !== this.lastHudHeaderKey) {
      this.lastHudHeaderKey = headerKey;
      const astryxMetaHost = document.getElementById('hud-astryx-meta');
      if (astryxMetaHost) {
        const floorBiome = getBiomeForFloor(this.state.daily.biomeId, hud.floor, this.state.daily.seed);
        mountAstryxRunHudHeader(astryxMetaHost, {
          biomeName: floorBiome.name,
          runModeLabel: this.currentRunMode === 'daily' ? 'DAILY RANKED' : 'PRACTICE',
          buffCount: hud.draftedBuffIds.length,
          isBossActive,
        });
      }
    }

    const skillBtn = document.getElementById('hud-skill-btn');
    if (skillBtn instanceof HTMLButtonElement) {
      skillBtn.disabled = !hud.skillReady;
      skillBtn.textContent = hud.skillReady
        ? `⚡ ${hud.skillName} [Q]`
        : `⏳ ${Math.ceil(hud.skillCooldownPct * 10)}s`;
    }

    const dashBtn = document.getElementById('hud-dash-btn');
    if (dashBtn instanceof HTMLButtonElement) {
      dashBtn.disabled = !hud.dashReady;
      dashBtn.textContent = hud.dashReady
        ? '💨 Qinggong [Space]'
        : `💨 ${Math.ceil(hud.dashCooldownPct * 5)}s`;
    }

    const potBtn = document.getElementById('hud-pot-btn');
    if (potBtn instanceof HTMLButtonElement) {
      potBtn.disabled = hud.potionCharges <= 0 || hud.potionDisabledReason !== null;
      potBtn.textContent = hud.potionDisabledReason
        ? `🚫 ${hud.potionDisabledReason}`
        : `🧪 Pill (${hud.potionCharges})`;
    }

    const buffStrip = document.getElementById('hud-buffs');
    const buffsKey = `${hud.floor}:${hud.draftedBuffIds.join(',')}`;
    if (buffStrip && buffsKey !== this.lastHudBuffsKey) {
      this.lastHudBuffsKey = buffsKey;
      buffStrip.innerHTML = '';
      const loadout = computeWuxiaLoadout(hud.draftedBuffIds, hud.floor);

      for (let i = 0; i < loadout.maxActiveSlots; i++) {
        const slot = loadout.actives[i];
        if (!slot) {
          const empty = this.el('span', 'buff-chip', `[Art ${i + 1}: Empty]`);
          empty.title = `Empty Active Martial Art Slot (Max ${loadout.maxActiveSlots})`;
          buffStrip.appendChild(empty);
          continue;
        }
        const art = getWuxiaActiveArtById(slot.id);
        if (!art) continue;
        const syn = loadout.awakenedSynergies.includes(art.synergyId)
          ? getWuxiaSynergyById(art.synergyId)
          : null;
        const tierClass = syn
          ? 'tier-prismatic'
          : slot.level >= 3
            ? 'tier-gold'
            : 'tier-silver';
        const label = syn
          ? `${syn.icon} ${syn.shortName}${slot.level >= 4 ? ` Lv.${slot.level}` : ''} ★`
          : `${art.icon} ${art.shortName} Lv.${slot.level}${slot.level >= 3 ? '★' : ''}`;
        const chip = this.el('span', `buff-chip ${tierClass}`, label);
        chip.title = syn
          ? `${syn.name}: ${syn.description}`
          : `${art.name} (Lv.${slot.level}/${loadout.maxManualLevel}): ${art.levelDescriptions[slot.level - 1] ?? ''}`;
        buffStrip.appendChild(chip);
      }

      for (let i = 0; i < loadout.maxInnerQiSlots; i++) {
        const slot = loadout.innerQis[i];
        if (!slot) {
          const empty = this.el('span', 'buff-chip', `[Qi ${i + 1}: Empty]`);
          empty.title = `Empty Inner Qi Slot (Max ${loadout.maxInnerQiSlots})`;
          buffStrip.appendChild(empty);
          continue;
        }
        const qi = getWuxiaInnerQiById(slot.id);
        if (!qi) continue;
        const chip = this.el(
          'span',
          `buff-chip ${slot.level >= 4 ? 'tier-gold' : 'tier-silver'}`,
          `${qi.icon} ${qi.shortName} Lv.${slot.level}`
        );
        chip.title = `${qi.name} (Lv.${slot.level}/${loadout.maxManualLevel}): ${qi.levelDescriptions[slot.level - 1] ?? ''}`;
        buffStrip.appendChild(chip);
      }

      for (const [scrollId, count] of Object.entries(loadout.enlightenmentCounts)) {
        const manual = getWuxiaManualById(scrollId);
        if (!manual || count <= 0) continue;
        const chip = this.el('span', 'buff-chip tier-gold', `${manual.icon} ×${count}`);
        chip.title = `${manual.name} (x${count})`;
        buffStrip.appendChild(chip);
      }
    }
    void this.lastHud;
  }

  // ==================== IN-RUN MODALS ====================

  public openDraftModal(floor: number, equippedBuffIds: string[], silverMult: number): void {
    this.clearModal();
    void silverMult;
    const loadout = computeWuxiaLoadout(equippedBuffIds, floor);
    let cards: readonly WuxiaDraftOption[] = rollWuxiaDraftCards(
      this.draftRng,
      equippedBuffIds,
      floor,
      3
    );
    let refreshesLeft = 2;

    const backdrop = this.el('div', 'modal-backdrop');
    const box = this.el('div', 'modal-box');
    const bannerHost = this.el('div', 'astryx-block-slot');
    const updateBanner = (): void => {
      mountAstryxModalBanner(bannerHost, {
        status: loadout.availableSynergies.length > 0 ? 'success' : 'info',
        title: `Floor ${floor} Cleared — Comprehend 1 Martial Manual`,
        description: `Active Arts ${loadout.actives.length}/${loadout.maxActiveSlots} • Inner Qi ${loadout.innerQis.length}/${loadout.maxInnerQiSlots} • Max Lv.${loadout.maxManualLevel} • Refreshes: ${refreshesLeft}`,
        badgeText: `${refreshesLeft} Roll${refreshesLeft === 1 ? '' : 's'} Left`,
        badgeTier: loadout.availableSynergies.length > 0 ? 'prismatic' : 'silver',
      });
    };
    updateBanner();

    const grid = this.el('div', 'draft-grid');
    box.appendChild(bannerHost);
    box.appendChild(grid);
    backdrop.appendChild(box);
    this.root.appendChild(backdrop);
    this.activeModal = backdrop;

    const renderCards = (): void => {
      updateBanner();
      unmountAstryxRootsInside(grid);
      grid.innerHTML = '';

      cards.forEach((cardDef, idx) => {
        const tierCss = cardDef.isSecretAwakening
          ? 'tier-prismatic'
          : cardDef.kind === 'active' || cardDef.kind === 'enlightenment'
            ? 'tier-gold'
            : 'tier-silver';
        const astryxTier = cardDef.isSecretAwakening
          ? 'prismatic'
          : cardDef.kind === 'active' || cardDef.kind === 'enlightenment'
            ? 'gold'
            : 'silver';

        const card = this.el('div', `draft-card ${tierCss}`);
        const top = this.el('div', 'row-between');
        const badgeHost = this.el('span', 'astryx-inline-slot');
        mountAstryxStatusBadge(badgeHost, {
          label: cardDef.badge,
          tier: astryxTier,
        });
        top.appendChild(badgeHost);

        const rollCard = (): void => {
          if (refreshesLeft <= 0) return;
          const handIds = cards.map((entry) => entry.id);
          const nextCard = refreshWuxiaDraftCard(
            this.draftRng,
            equippedBuffIds,
            floor,
            handIds,
            cardDef.id
          );
          if (!nextCard) {
            this.showToastSafe('No alternate manuals remain for this loadout!');
            return;
          }
          refreshesLeft -= 1;
          soundFX.playRouletteTick();
          cards = cards.map((existing, cIdx) => (cIdx === idx ? nextCard : existing));
          renderCards();
        };

        const refreshHost = this.el('span', 'astryx-inline-slot');
        mountAstryxActionRow(refreshHost, [
          {
            label: `🎲 Roll (${refreshesLeft})`,
            variant: 'secondary',
            size: 'sm',
            isDisabled: refreshesLeft <= 0,
            tooltip: 'Reroll this manual while keeping the other 2',
            onClick: rollCard,
          },
        ]);
        top.appendChild(refreshHost);
        card.appendChild(top);

        card.appendChild(this.el('strong', '', `${cardDef.icon} ${cardDef.name}`));
        card.appendChild(this.el('div', 'muted', cardDef.tags.join(' • ')));
        card.appendChild(this.el('div', 'muted', cardDef.description));

        const pickHost = this.el('div', 'astryx-inline-slot');
        mountAstryxActionRow(pickHost, [
          {
            label: `🎲 Roll (${refreshesLeft})`,
            variant: 'secondary',
            size: 'sm',
            isDisabled: refreshesLeft <= 0,
            onClick: rollCard,
          },
          {
            label: cardDef.isSecretAwakening
              ? '🔮 Awaken Synergy!'
              : cardDef.currentLevel > 0 && cardDef.kind !== 'enlightenment'
                ? `Upgrade Lv.${cardDef.nextLevel}`
                : 'Learn Manual',
            variant: 'primary',
            size: 'md',
            onClick: () => {
              soundFX.playDraft();
              if (cardDef.kind === 'synergy') {
                const newlyDiscovered = recordDiscoveredSynergy(cardDef.id);
                if (newlyDiscovered) {
                  this.showToastSafe(`🔮 New Secret Synergy Recorded: ${cardDef.name}!`);
                }
              }
              this.clearModal();
              this.bridge?.resumeAfterDraft(cardDef.id);
            },
          },
        ]);
        card.appendChild(pickHost);
        grid.appendChild(card);
      });
    };

    renderCards();
  }

  public openRouletteModal(floor: number, count: number, exclude: MutationId[]): void {
    this.clearModal();
    const rolled = rollBossMutations(this.rouletteRng, count, exclude);
    const biome = getBiomeForFloor(this.state.daily.biomeId, floor, this.state.daily.seed);
    const isLeader = isCultLeaderFloor(floor);
    const miniBossSpec = getMiniBossForFloor(this.state.daily.biomeId, floor, this.state.daily.seed);
    const endBossName = getEndBossNameForFloor(this.state.daily.biomeId, floor, this.state.daily.seed);
    const mechSource = BOSS_MUTATIONS.length > 0 ? biome : biome;
    void mechSource;

    const backdrop = this.el('div', 'modal-backdrop');
    const box = this.el('div', 'modal-box');
    const bannerHost = this.el('div', 'astryx-block-slot');
    mountAstryxModalBanner(bannerHost, {
      status: 'warning',
      title: isLeader
        ? `🎰 Floor ${floor} Cult Leader: ${endBossName}`
        : `🎰 Floor ${floor} Hall Master Ambush: ${miniBossSpec.name}`,
      description: isLeader
        ? `${biome.mechanicName}: ${biome.mechanicDescription}`
        : `${miniBossSpec.title} • ${biome.name} (${biome.mechanicName})`,
      badgeText: isLeader ? 'CULT LEADER' : 'HALL MASTER',
      badgeTier: 'boss',
    });
    box.appendChild(bannerHost);
    const windowEl = this.el('div', 'roulette-window', 'Spinning Boss Mutation...');
    const descEl = this.el('div', 'muted', 'Rolling active spire mutations...');
    descEl.style.textAlign = 'center';

    const goHost = this.el('div', 'camp-footer');
    const renderGoAction = (ready: boolean): void => {
      mountAstryxActionRow(goHost, [
        {
          label: '⚔️ FIGHT BOSS!',
          variant: 'primary',
          size: 'md',
          isDisabled: !ready,
          onClick: () => {
            this.clearModal();
            this.bridge?.resumeAfterRoulette(rolled);
          },
        },
      ]);
    };
    renderGoAction(false);

    box.appendChild(windowEl);
    box.appendChild(descEl);
    box.appendChild(goHost);
    backdrop.appendChild(box);
    this.root.appendChild(backdrop);
    this.activeModal = backdrop;

    let ticks = 0;
    const timer = window.setInterval(() => {
      ticks += 1;
      soundFX.playRouletteTick();
      const sample = BOSS_MUTATIONS[ticks % BOSS_MUTATIONS.length];
      if (sample && ticks < 11) {
        windowEl.textContent = `${sample.icon} ${sample.name}`;
      } else {
        window.clearInterval(timer);
        const defs = rolled.map((id) => getMutationById(id));
        windowEl.textContent = defs.map((d) => `${d.icon} ${d.name}`).join(' + ');
        descEl.textContent = defs.map((d) => `${d.name}: ${d.effectText}`).join(' | ');
        renderGoAction(true);
      }
    }, 105);
  }

  public openExtractionModal(floor: number, gold: number, shards: number, cores: number): void {
    this.clearModal();
    const backdrop = this.el('div', 'modal-backdrop');
    const box = this.el('div', 'modal-box');
    const bannerHost = this.el('div', 'astryx-block-slot');
    mountAstryxModalBanner(bannerHost, {
      status: 'success',
      title: `🏮 Floor ${floor} Cult Leader Vanquished — Milestone Checkpoint`,
      description: `Loot Secured (100% Kept): 🪙 ${gold} Taels • 💎 ${shards} Shards • 🔮 ${cores} Cores — Retreat to bank 100% + bonus Cult Leader Relic, or ascend endlessly to Floor ${floor + 1}!`,
      badgeText: `FLOOR ${floor} CLEAR`,
      badgeTier: 'prismatic',
    });
    box.appendChild(bannerHost);

    const row = this.el('div', 'camp-footer');
    mountAstryxActionRow(row, [
      {
        label: '🏮 RETREAT TO CAMP (100% Loot + Relic)',
        variant: 'secondary',
        size: 'md',
        onClick: () => {
          this.clearModal();
          this.bridge?.resumeAfterExtraction(true);
        },
      },
      {
        label: `⛰️ ASCEND TO FLOOR ${floor + 1} (Next Boss F${floor + 10})`,
        variant: 'primary',
        size: 'md',
        onClick: () => {
          this.clearModal();
          this.bridge?.resumeAfterExtraction(false);
        },
      },
    ]);
    box.appendChild(row);
    backdrop.appendChild(box);
    this.root.appendChild(backdrop);
    this.activeModal = backdrop;
  }

  public handleRunEnded(payload: RunEndPayload): void {
    if (payload.outcome === 'cleared' && payload.mode === 'daily') {
      this.openGreedGambleModal(payload);
      return;
    }
    void this.submitAndShowSummary(payload);
  }

  private openGreedGambleModal(payload: RunEndPayload): void {
    this.clearModal();
    const backdrop = this.el('div', 'modal-backdrop');
    const box = this.el('div', 'modal-box');
    const bannerHost = this.el('div', 'astryx-block-slot');
    mountAstryxModalBanner(bannerHost, {
      status: 'warning',
      title: '🏛️ Altar of Fate — Floor 10 Greed Gamble',
      description: `You conquered Floor 10! Guaranteed Unique Sect Relic (${getRelicLineageLabel(payload.classId)}). Roll Free Purification (50/50) for Pristine, or gain a Tuned Cursed Relic.`,
      badgeText: '50 / 50',
      badgeTier: 'gold',
    });
    box.appendChild(bannerHost);

    const statusEl = this.el('div', 'roulette-window', '✨ Ready to Roll Purification ✨');
    const rollHost = this.el('div', 'camp-footer');
    const renderRollBtn = (disabled: boolean): void => {
      mountAstryxActionRow(rollHost, [
        {
          label: '🎲 ROLL FREE PURIFICATION (50/50)',
          variant: 'primary',
          size: 'md',
          isDisabled: disabled,
          onClick: () => {
            renderRollBtn(true);
            const purified = this.rouletteRng() < 0.5;
            if (purified) {
              soundFX.playVictory();
              statusEl.textContent = '✨ PURIFIED! PRISTINE LEGENDARY ✨';
            } else {
              soundFX.playBossRoar();
              statusEl.textContent = '😈 CURSED! (Retains full Signature Power + Tuned Penalty)';
            }
            window.setTimeout(() => {
              void this.submitAndShowSummary({
                ...payload,
                greedGamblePurified: purified,
              });
            }, 950);
          },
        },
      ]);
    };
    renderRollBtn(false);

    box.appendChild(statusEl);
    box.appendChild(rollHost);
    backdrop.appendChild(box);
    this.root.appendChild(backdrop);
    this.activeModal = backdrop;
  }

  private applyRunCompleteLocally(payload: RunEndPayload): RunRewardSummary {
    const p = this.state.profile;
    const lootForfeited = false;
    const penalty = 1;
    const bountyApplied = payload.classId === this.state.daily.bountyClass;
    const restedApplied = p.restedStacks > 0;

    const clearedFloors =
      payload.outcome === 'died' ? Math.max(0, payload.floorReached - 1) : payload.floorReached;
    const cultLeadersDefeated = Math.floor(clearedFloors / 10);

    const goldBanked = Math.round(
      payload.goldCollected * penalty * (bountyApplied ? 1.25 : 1) * (restedApplied ? 2 : 1)
    );
    const shardsBase = Math.round(payload.shardsCollected * penalty * (restedApplied ? 2 : 1));
    const coresBanked =
      Math.round(payload.coresCollected * penalty) +
      Math.max(payload.outcome === 'cleared' ? 1 : 0, cultLeadersDefeated);
    const expBase =
      payload.floorReached * 42 +
      cultLeadersDefeated * 90 +
      (payload.outcome === 'cleared' ? 120 : payload.outcome === 'extracted' ? 50 : 15);
    const expGained = expBase * (bountyApplied ? 2 : 1);

    const dropSeed = hashString(`${payload.runId}:${p.username}:${payload.floorReached}`);
    const rng = mulberry32(dropSeed);
    const slots: readonly GearSlot[] = ['weapon', 'headgear', 'top', 'cape'];
    const rawDrops: GearItem[] = [];

    for (let f = 2; f <= clearedFloors; f++) {
      if (rawDrops.length >= 24) break;
      if (isCultLeaderFloor(f) || isRandomMiniBossFloor(f, dropSeed)) {
        const slot = slots[Math.floor(rng() * slots.length)] ?? 'weapon';
        rawDrops.push(createGearItem(rng, payload.classId, slot, 'rare', f, `f${f}`));
      } else if (rng() < 0.45) {
        const slot = slots[Math.floor(rng() * slots.length)] ?? 'weapon';
        rawDrops.push(createGearItem(rng, payload.classId, slot, 'normal', f, `f${f}`));
      }
    }

    const keptDrops: GearItem[] = [];
    let autoDismantledCount = 0;
    let autoDismantledShards = 0;
    for (const item of rawDrops) {
      if (p.autoDismantleNormal && item.tier === 'normal') {
        autoDismantledCount += 1;
        autoDismantledShards += getDismantleShardValue(item);
      } else {
        keptDrops.push(item);
      }
    }

    let legendaryDrop: GearItem | null = null;
    if (cultLeadersDefeated >= 1 || (payload.outcome === 'cleared' && payload.mode === 'daily')) {
      legendaryDrop = createLegendaryGearItem(
        rng,
        payload.classId,
        !payload.greedGamblePurified,
        'f10'
      );
      keptDrops.push(legendaryDrop);
    }

    const expResult = awardClassExp(p.classes[payload.classId], expGained);
    const shardsBanked = shardsBase + autoDismantledShards;
    const nextProfile: PlayerProfile = {
      ...p,
      gold: p.gold + goldBanked,
      shards: p.shards + shardsBanked,
      bossCores: p.bossCores + coresBanked,
      restedStacks: restedApplied ? Math.max(0, p.restedStacks - 1) : p.restedStacks,
      dailyRankedCompletedDate:
        payload.mode === 'daily' ? this.state.daily.dateKey : p.dailyRankedCompletedDate,
      classes: {
        ...p.classes,
        [payload.classId]: expResult.updated,
      },
      inventory: [...keptDrops, ...p.inventory].slice(0, 60),
    };
    this.state.profile = nextProfile;
    this.saveLocalProfile(nextProfile);

    return {
      goldBanked,
      shardsBanked,
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
      playerRank: null,
    };
  }

  private async submitAndShowSummary(payload: RunEndPayload): Promise<void> {
    let summary: RunRewardSummary | null = null;

    const reqBody: CompleteRunRequest = payload;
    try {
      const res = await fetch('/api/run/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      if (res.ok) {
        const raw: unknown = await res.json();
        this.applyInitOrCompletePayload(raw);
        this.saveLocalProfile(this.state.profile);
        if (isRecord(raw) && isRecord(raw.summary)) {
          const s = raw.summary;
          const drops: GearItem[] = [];
          if (Array.isArray(s.drops)) {
            for (const d of s.drops) {
              const parsed = parseGearItem(d);
              if (parsed) drops.push(parsed);
            }
          }
          summary = {
            goldBanked: isNumber(s.goldBanked) ? s.goldBanked : 0,
            shardsBanked: isNumber(s.shardsBanked) ? s.shardsBanked : 0,
            coresBanked: isNumber(s.coresBanked) ? s.coresBanked : 0,
            expGained: isNumber(s.expGained) ? s.expGained : 0,
            bountyApplied: isBoolean(s.bountyApplied) ? s.bountyApplied : false,
            restedApplied: isBoolean(s.restedApplied) ? s.restedApplied : false,
            lootForfeited: isBoolean(s.lootForfeited) ? s.lootForfeited : false,
            newLevel: isNumber(s.newLevel)
              ? s.newLevel
              : this.state.profile.classes[payload.classId].level,
            leveledUp: isBoolean(s.leveledUp) ? s.leveledUp : false,
            drops,
            autoDismantledCount: isNumber(s.autoDismantledCount) ? s.autoDismantledCount : 0,
            autoDismantledShards: isNumber(s.autoDismantledShards) ? s.autoDismantledShards : 0,
            legendaryDrop: parseGearItem(s.legendaryDrop),
            playerRank: isNumber(s.playerRank) ? s.playerRank : null,
          };
        }
      }
    } catch {
      // Fallback to local summary calculation below
    }

    if (!summary) {
      summary = this.applyRunCompleteLocally(payload);
    }

    for (const id of payload.draftedBuffIds) {
      if (getWuxiaSynergyById(id)) {
        recordDiscoveredSynergy(id);
      }
    }

    this.clearModal();
    const backdrop = this.el('div', 'modal-backdrop');
    const box = this.el('div', 'modal-box');
    const titleStr =
      payload.outcome === 'cleared'
        ? `🏆 CULT LEADER CONQUERED (FLOOR ${payload.floorReached})`
        : payload.outcome === 'extracted'
          ? `🏮 SAFE RETREAT AT FLOOR ${payload.floorReached}!`
          : `⚔️ FELL AT FLOOR ${payload.floorReached} — 100% LOOT KEPT`;

    const bannerHost = this.el('div', 'astryx-block-slot');
    mountAstryxModalBanner(bannerHost, {
      status:
        payload.outcome === 'cleared' || payload.outcome === 'extracted'
          ? 'success'
          : 'warning',
      title: titleStr,
      description: '100% of Silver Taels, Jade Shards, Sect Cores, and Relics are banked in Camp.',
      badgeText: summary.playerRank ? `Rank #${summary.playerRank}` : `FLOOR ${payload.floorReached}`,
      badgeTier: payload.outcome === 'cleared' ? 'gold' : payload.outcome === 'extracted' ? 'prismatic' : 'silver',
    });
    box.appendChild(bannerHost);

    const awakenedSyns = computeWuxiaLoadout(
      payload.draftedBuffIds,
      payload.floorReached
    ).awakenedSynergies;
    if (awakenedSyns.length > 0) {
      const synNames = awakenedSyns
        .map((id) => getWuxiaSynergyById(id))
        .filter((s) => s !== null)
        .map((s) => `${s.icon} ${s.name}`)
        .join(' • ');
      box.appendChild(
        this.el('div', 'card', `🔮 Secret Synergies Discovered This Run: ${synNames}`)
      );
    }

    box.appendChild(
      this.el(
        'div',
        'card',
        `Banked: 🪙 ${summary.goldBanked}g • 💎 ${summary.shardsBanked} Shards • 🔮 ${summary.coresBanked} Cores • ⭐ +${summary.expGained} EXP (Lv.${summary.newLevel}${summary.leveledUp ? ' LEVEL UP!' : ''})${summary.bountyApplied ? ' [2x Bounty]' : ''}${summary.restedApplied ? ' [2x Rested]' : ''}${summary.playerRank ? ` • Daily Rank #${summary.playerRank}` : ''}`
      )
    );

    const nonLegDrops = summary.drops.filter((d) => d.id !== summary.legendaryDrop?.id);
    const totalNewDrops = (summary.legendaryDrop ? 1 : 0) + nonLegDrops.length;

    if (totalNewDrops > 0) {
      const slotLabels: Record<GearSlot, string> = {
        weapon: '🗡️ Weapon',
        headgear: '👑 Headpiece',
        top: '🥋 Inner Robe',
        cape: '🧣 Mantle',
      };
      const tierPriority: Record<GearItem['tier'], number> = {
        legendary: 0,
        rare: 1,
        normal: 2,
      };
      const showcaseItems: GearItem[] = [
        ...(summary.legendaryDrop ? [summary.legendaryDrop] : []),
        ...[...nonLegDrops].sort((a, b) => tierPriority[a.tier] - tierPriority[b.tier]),
      ];

      const dropsSection = this.el('div', 'card');
      const dropsHeader = this.el('div', 'row-between');
      dropsHeader.appendChild(
        this.el('strong', '', `🎁 NEW SECT RELICS ACQUIRED (${totalNewDrops})`)
      );
      if (summary.autoDismantledCount > 0) {
        dropsHeader.appendChild(
          this.el(
            'span',
            'muted',
            `+${summary.autoDismantledCount} Normal auto-dismantled (+${summary.autoDismantledShards} Shards)`
          )
        );
      }
      dropsSection.appendChild(dropsHeader);

      const dropGrid = this.el('div', 'relic-drop-grid');
      for (const item of showcaseItems.slice(0, 6)) {
        const tierCls =
          item.tier === 'legendary'
            ? 'tier-legendary'
            : item.tier === 'rare'
              ? 'tier-rare'
              : 'tier-normal';
        const card = this.el(
          'div',
          `gear-item ${tierCls} ${item.isCursed ? 'cursed-tag' : ''}`
        );
        const topRow = this.el('div', 'row-between');
        topRow.appendChild(this.el('strong', '', item.name));
        const badgeHost = this.el('span', 'astryx-inline-slot');
        const astryxTier =
          item.tier === 'legendary'
            ? item.isCursed
              ? 'cursed'
              : 'pristine'
            : item.tier === 'rare'
              ? 'silver'
              : 'bronze';
        mountAstryxStatusBadge(badgeHost, {
          label: item.tier === 'legendary'
            ? item.isCursed
              ? 'LEGENDARY CURSED'
              : 'LEGENDARY ★'
            : item.tier.toUpperCase(),
          tier: astryxTier,
        });
        topRow.appendChild(badgeHost);
        card.appendChild(topRow);

        const currentEquipped = this.state.profile.classes[payload.classId].equipped[item.slot];
        const delta = currentEquipped
          ? item.baseStatBonus - currentEquipped.baseStatBonus
          : item.baseStatBonus;
        const deltaTxt =
          delta > 0 ? ` • ▲ +${delta} Upgrade!` : delta < 0 ? ` • ${delta} vs equipped` : '';
        card.appendChild(
          this.el(
            'div',
            'muted',
            `${slotLabels[item.slot]} • +${item.baseStatBonus} Power${deltaTxt}`
          )
        );
        card.appendChild(this.el('div', 'muted', item.affixText));

        if (item.isCursed && item.legendaryId) {
          const leg = getLegendaryById(item.legendaryId);
          if (leg) {
            card.appendChild(
              this.el(
                'div',
                'muted',
                `⚠️ ${leg.cursedName}: ${leg.cursedText} — Cleanse at The Sanctum!`
              )
            );
          }
        }

        const isAlreadyEquipped =
          this.state.profile.classes[payload.classId].equipped[item.slot]?.id === item.id;
        const equipBtn = this.el(
          'button',
          `btn btn-sm ${isAlreadyEquipped ? '' : delta > 0 ? 'btn-green' : 'btn-primary'}`,
          isAlreadyEquipped ? '✓ Equipped' : '⚔️ Equip Now'
        );
        if (equipBtn instanceof HTMLButtonElement) {
          equipBtn.disabled = isAlreadyEquipped;
          equipBtn.style.alignSelf = 'flex-start';
          equipBtn.addEventListener('click', () => {
            const msg = this.applyCampActionLocally({
              action: 'equip_item',
              itemId: item.id,
            });
            void this.sendCampAction({
              action: 'equip_item',
              itemId: item.id,
            });
            equipBtn.disabled = true;
            equipBtn.textContent = '✓ Equipped!';
            soundFX.playDraft();
            this.showToastSafe(msg ?? `Equipped ${item.name}!`);
          });
        }
        card.appendChild(equipBtn);
        dropGrid.appendChild(card);
      }

      dropsSection.appendChild(dropGrid);
      if (showcaseItems.length > 6) {
        dropsSection.appendChild(
          this.el(
            'div',
            'muted',
            `+${showcaseItems.length - 6} additional relics stored in Camp Armory bag.`
          )
        );
      }
      box.appendChild(dropsSection);
    } else if (summary.autoDismantledCount > 0) {
      box.appendChild(
        this.el(
          'div',
          'card',
          `♻️ Auto-Dismantled ${summary.autoDismantledCount} Normal Drops into +${summary.autoDismantledShards} Jade Shards`
        )
      );
    }

    const actions = this.el('div', 'camp-footer');
    let shareState: 'idle' | 'posting' | 'posted' | 'copied' = 'idle';
    const renderActions = (): void => {
      const shareLabel =
        shareState === 'posted'
          ? '✓ Posted to Comments!'
          : shareState === 'copied'
            ? '📋 Copied Summary!'
            : shareState === 'posting'
              ? '⏳ Sharing Build...'
              : '💬 Share Build to Reddit Comments';
      mountAstryxActionRow(actions, [
        {
          label: shareLabel,
          variant: 'secondary',
          size: 'md',
          isDisabled: shareState !== 'idle',
          onClick: () => {
            shareState = 'posting';
            renderActions();
            void this.shareRunToComments(payload, summary, (nextState) => {
              shareState = nextState;
              renderActions();
            });
          },
        },
        {
          label: '🏕️ Return to Camp',
          variant: 'primary',
          size: 'md',
          onClick: () => {
            this.clearModal();
            this.renderCamp();
          },
        },
      ]);
    };
    renderActions();
    box.appendChild(actions);

    backdrop.appendChild(box);
    this.root.appendChild(backdrop);
    this.activeModal = backdrop;
  }

  private async shareRunToComments(
    payload: RunEndPayload,
    summary: RunRewardSummary,
    onStatus: (next: 'idle' | 'posted' | 'copied') => void
  ): Promise<void> {
    try {
      const uniqueManuals = [...new Set(payload.draftedBuffIds)].sort((a, b) => {
        const aSyn = getWuxiaSynergyById(a) ? 0 : 1;
        const bSyn = getWuxiaSynergyById(b) ? 0 : 1;
        return aSyn - bSyn;
      });
      const res = await fetch('/api/share-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: payload.classId,
          floorReached: payload.floorReached,
          outcome: payload.outcome,
          durationMs: payload.durationMs,
          goldBanked: summary.goldBanked,
          topBuffIds: uniqueManuals.slice(0, 5),
          bossMutations: payload.bossMutations,
          legendaryName: summary.legendaryDrop ? summary.legendaryDrop.name : null,
          legendaryCursed: summary.legendaryDrop ? summary.legendaryDrop.isCursed : false,
        }),
      });
      const raw: unknown = await res.json();
      if (isRecord(raw)) {
        const msg = isString(raw.message) ? raw.message : 'Shared!';
        if (isString(raw.commentText) && raw.posted !== true && navigator.clipboard) {
          await navigator.clipboard.writeText(raw.commentText);
        }
        this.showToastSafe(msg);
        onStatus(raw.posted === true ? 'posted' : 'copied');
        return;
      }
    } catch {
      this.showToastSafe('Unable to share comment right now.');
    }
    onStatus('idle');
  }
}
