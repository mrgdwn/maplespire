import { showToast } from '@devvit/web/client';
import {
  BIOME_CATALOG,
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
  WUXIA_INNER_QI,
  WUXIA_SECRET_SYNERGIES,
  computeWuxiaLoadout,
  getActiveAwakenedSynergy,
  getWuxiaActiveArtById,
  getWuxiaEnlightenmentScrollById,
  getWuxiaInnerQiById,
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
  LEGENDARY_CATALOG,
  getLegendaryById,
} from '../../shared/catalogs/legendaries.ts';
import type {
  BiomeId,
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
import { initAstryxRootAttributes, unmountAstryxRootsInside } from './AstryxWidgets.tsx';
import {
  mountHdActionRow,
  mountHdBadge,
  mountHdBanner,
  mountHdCommandMenu,
  mountHdEmpty,
  type HdMenuItem,
} from './hd2d.ts';
import type {
  AppState,
  DungeonBridge,
  RunEndPayload,
  RunHudSnapshot,
} from './bridge.ts';

type CampTab = 'home' | 'roster' | 'buildings' | 'codex' | 'leaderboard';

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
  private activeTab: CampTab = 'home';
  private codexFilter: ClassId | 'synergies' | 'manuals' = 'synergies';
  private draftRng: () => number = mulberry32(1);
  private rouletteRng: () => number = mulberry32(2);
  private lastHud: RunHudSnapshot | null = null;
  private currentRunSeed: number = 1;
  private currentRunBiomeId: BiomeId = 'slime_bog';
  private lastHudBuffsKey: string = '';
  private activeModal: HTMLElement | null = null;
  private menuCleanup: (() => void) | null = null;
  private codexDrawerOpen: boolean = false;
  private bankedRerolls: number = 2;
  private isDraftMinimized: boolean = false;

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

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.mode !== 'dungeon') return;
      if (e.code === 'Tab' || e.code === 'KeyC') {
        e.preventDefault();
        this.toggleCodexDrawer();
      } else if (e.code === 'Escape') {
        if (this.codexDrawerOpen) {
          e.preventDefault();
          this.toggleCodexDrawer(false);
        }
      }
    });
  }

  public toggleCodexDrawer(forceState?: boolean): void {
    const drawer = document.getElementById('hud-codex-drawer');
    const backdrop = document.getElementById('hud-codex-backdrop');
    const trigger = document.getElementById('hud-codex-trigger');
    if (!drawer) return;
    this.codexDrawerOpen = forceState !== undefined ? forceState : !this.codexDrawerOpen;
    if (this.codexDrawerOpen) {
      drawer.classList.remove('hidden');
      drawer.style.display = 'flex';
      if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.style.display = 'block';
      }
      if (trigger) trigger.classList.add('hud-codex-trigger--active');
    } else {
      drawer.classList.add('hidden');
      drawer.style.display = 'none';
      if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.style.display = 'none';
      }
      if (trigger) trigger.classList.remove('hud-codex-trigger--active');
    }
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
    this.toggleCodexDrawer(false);
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

  private releaseMenuKeys(): void {
    if (this.menuCleanup) {
      this.menuCleanup();
      this.menuCleanup = null;
    }
  }

  private openCampTab(tab: CampTab): void {
    soundFX.playRouletteTick();
    this.activeTab = tab;
    this.renderCamp();
  }

  public renderCamp(): void {
    this.mode = 'camp';
    this.clearModal();
    this.releaseMenuKeys();
    unmountAstryxRootsInside(this.root);
    this.root.innerHTML = '';

    const p = this.state.profile;
    const daily = this.state.daily;
    const biome = getBiomeById(daily.biomeId);
    const dailyCompleted = p.dailyRankedCompletedDate === daily.dateKey;
    const selProg = p.classes[p.selectedClass];

    const wrap = this.el('div', 'hd-camp');
    wrap.style.setProperty('--hd-accent', biome.accentHex);
    wrap.appendChild(this.el('div', 'hd-scene'));

    // Top status window: realm level + currencies + sound
    const topbar = this.el('div', 'hd-topbar hd-win');
    topbar.appendChild(this.el('span', 'hd-topbar__lv', `Lv ${selProg.level}`));
    const purse = this.el('div', 'hd-purse');
    const purseItems: readonly { label: string; value: number; cls: string }[] = [
      { label: 'Gold', value: p.gold, cls: 'is-gold' },
      { label: 'Shards', value: p.shards, cls: 'is-jade' },
      { label: 'Cores', value: p.bossCores, cls: 'is-violet' },
    ];
    for (const item of purseItems) {
      const cell = this.el('span', `hd-purse__item ${item.cls}`);
      cell.appendChild(this.el('span', 'hd-purse__label', item.label));
      cell.appendChild(this.el('span', 'hd-purse__val', item.value.toLocaleString()));
      purse.appendChild(cell);
    }
    topbar.appendChild(purse);
    const muteBtn = this.el('button', 'hd-icon-btn', soundFX.isMuted() ? 'Muted' : 'Audio');
    muteBtn.title = 'Toggle sound';
    muteBtn.addEventListener('click', () => {
      muteBtn.textContent = soundFX.toggleMute() ? 'Muted' : 'Audio';
    });
    topbar.appendChild(muteBtn);
    wrap.appendChild(topbar);

    if (this.activeTab === 'home') {
      this.renderHomeScreen(wrap, dailyCompleted, biome.name);
    } else {
      const titles: Record<Exclude<CampTab, 'home'>, string> = {
        roster: 'Hero',
        buildings: 'Upgrades',
        codex: 'Codex',
        leaderboard: 'Leaderboard',
      };
      const screen = this.el('div', 'hd-screen');
      const head = this.el('div', 'hd-screen__head hd-win');
      const back = this.el('button', 'hd-back', '◀ Back');
      back.addEventListener('click', () => this.openCampTab('home'));
      head.appendChild(back);
      head.appendChild(this.el('div', 'hd-screen__title', titles[this.activeTab]));
      head.appendChild(this.el('span', 'hd-screen__spacer'));
      screen.appendChild(head);

      const body = this.el('div', 'hd-screen__body hd-win');
      if (this.activeTab === 'roster') this.renderRosterTab(body);
      else if (this.activeTab === 'buildings') this.renderBuildingsTab(body);
      else if (this.activeTab === 'codex') this.renderCodexTab(body);
      else this.renderLeaderboardTab(body);
      screen.appendChild(body);
      wrap.appendChild(screen);

      const onEsc = (event: KeyboardEvent): void => {
        if (event.key === 'Escape' || event.key === 'Backspace') {
          const target = event.target;
          if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
          event.preventDefault();
          this.openCampTab('home');
        }
      };
      document.addEventListener('keydown', onEsc);
      this.menuCleanup = () => document.removeEventListener('keydown', onEsc);
    }

    this.root.appendChild(wrap);
  }

  private renderHomeScreen(wrap: HTMLElement, dailyCompleted: boolean, biomeName: string): void {
    const p = this.state.profile;
    const selProg = p.classes[p.selectedClass];

    const titleBlock = this.el('div', 'hd-title');
    titleBlock.appendChild(this.el('h1', 'hd-title__main', 'WUXIA SPIRE'));
    titleBlock.appendChild(this.el('div', 'hd-title__sub', 'Tower Roguelite'));
    wrap.appendChild(titleBlock);

    const heroStage = this.el('div', 'hd-hero');
    const heroCanvas = document.createElement('canvas');
    heroCanvas.width = 92;
    heroCanvas.height = 92;
    heroCanvas.className = 'hd-hero__sprite';
    renderHeroPaperdollCanvas(heroCanvas, p.selectedClass, selProg.equipped);
    heroStage.appendChild(heroCanvas);
    heroStage.appendChild(this.el('div', 'hd-hero__shadow'));
    wrap.appendChild(heroStage);

    const discovered = loadDiscoveredSynergies().size;
    const items: HdMenuItem[] = [];
    if (!dailyCompleted) {
      items.push({
        label: 'Daily Run',
        hint: biomeName,
        onSelect: () => {
          void this.launchRun('daily', false);
        },
      });
    } else if (p.goldenTickets > 0) {
      items.push({
        label: 'Ranked Daily Run',
        hint: `Tickets: ${p.goldenTickets}`,
        onSelect: () => {
          void this.launchRun('daily', true);
        },
      });
    }
    items.push({
      label: 'Practice Run',
      hint: 'Endless',
      onSelect: () => {
        void this.launchRun('practice', false);
      },
    });
    items.push({
      label: 'Hero',
      hint: `Bag: ${p.inventory.length}`,
      onSelect: () => this.openCampTab('roster'),
    });
    items.push({ label: 'Upgrades', onSelect: () => this.openCampTab('buildings') });
    items.push({
      label: 'Codex',
      hint: `${discovered}/${WUXIA_SECRET_SYNERGIES.length}`,
      onSelect: () => this.openCampTab('codex'),
    });
    items.push({ label: 'Leaderboard', onSelect: () => this.openCampTab('leaderboard') });

    const menuWin = this.el('div', 'hd-command hd-win');
    this.menuCleanup = mountHdCommandMenu(menuWin, items);
    wrap.appendChild(menuWin);
  }

  private renderRosterTab(container: HTMLElement): void {
    const p = this.state.profile;

    // Selected Wanderer paperdoll + stats + equipped Relics + bag
    const selId = p.selectedClass;
    const selProg = p.classes[selId];
    const selJob = getJobAdvancementTitle(selProg.level);
    const nextExp = expForNextLevel(selProg.level);
    const stats = computeHeroCombatStats(p, selId, [], 0, 0);

    const split = this.el('div', 'grid-2');

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
      `Wanderer Lv.${selProg.level} · ${selJob.title} (${selProg.exp}/${nextExp} EXP)`
    );
    metaCol.appendChild(heroTitle);

    const statGrid = this.el('div', 'stat-grid');
    const statItems: readonly string[] = [
      `HP ${stats.maxHp}`,
      `ATK ${stats.atk}`,
      `SPD ${stats.attackSpeed}/s`,
      `ARM ${stats.armor}`,
      `CRIT ${Math.round(stats.critRate * 100)}%`,
      `EVA ${Math.round(stats.dodgeRate * 100)}%`,
    ];
    for (const sText of statItems) {
      statGrid.appendChild(this.el('span', 'pill', sText));
    }
    metaCol.appendChild(statGrid);
    showcase.appendChild(metaCol);
    eqBox.appendChild(showcase);

    const slotLabels: Record<GearSlot, string> = {
      weapon: 'Weapon',
      headgear: 'Crown',
      top: 'Robe',
      cape: 'Mantle',
    };

    for (const slot of GEAR_SLOTS) {
      const item = selProg.equipped[slot];
      const leg = item?.legendaryId ? getLegendaryById(item.legendaryId) : null;
      const displayName = leg ? leg.name : item ? item.name : `Empty ${slotLabels[slot]}`;
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
          `${slotLabels[slot]} · ${
            slot === 'weapon' && (!item || item.id.startsWith('starter_wep_'))
              ? 'Unarmed (Taiji Fist)'
              : displayName
          }`
        )
      );
      const rightTags = this.el('div', 'row-wrap');
      rightTags.appendChild(this.el('span', 'pill', `+${slotLvl * 10}%`));
      if (item) {
        rightTags.appendChild(
          this.el(
            'span',
            `pill ${item.tier === 'legendary' ? 'pill-gold' : item.tier === 'rare' ? 'pill-shard' : ''}`,
            item.tier.toUpperCase()
          )
        );
      }
      if (item?.isCursed) {
        rightTags.appendChild(this.el('span', 'pill pill-core', 'CURSED'));
      }
      row.appendChild(rightTags);
      box.appendChild(row);
      if (item) {
        box.appendChild(
          this.el(
            'div',
            'muted',
            `+${item.baseStatBonus} Power · ${displayAffix}${leg && item.isCursed ? ` · Curse: ${leg.cursedName}` : ''}`
          )
        );
      }
      eqBox.appendChild(box);
    }
    split.appendChild(eqBox);

    // Inventory bag column
    const bagBox = this.el('div', 'card');
    const bagHead = this.el('div', 'row-between');
    bagHead.appendChild(this.el('div', 'class-name', `Relic Bag (${p.inventory.length}/60)`));
    const bulkBtn = this.el('button', 'btn btn-sm', 'Dismantle Normal/Rare');
    bulkBtn.addEventListener('click', () => {
      void this.sendCampAction({ action: 'dismantle_all_normal_rare' });
    });
    bagHead.appendChild(bulkBtn);
    bagBox.appendChild(bagHead);

    if (p.inventory.length === 0) {
      const emptyHost = this.el('div', 'astryx-block-slot');
      mountHdEmpty(emptyHost, {
        title: 'Relic Bag Empty',
        description: 'Ascend the Spire to recover Normal, Rare, and Legendary Sect Relics.',
      });
      bagBox.appendChild(emptyHost);
    } else {
      for (const item of p.inventory) {
        const leg = item.legendaryId ? getLegendaryById(item.legendaryId) : null;
        const displayName = leg ? leg.name : item.name;
        const displayAffix = leg ? leg.signatureText : item.affixText;
        const equippedInSlot = p.classes[item.classId].equipped[item.slot];
        const eqLeg = equippedInSlot?.legendaryId ? getLegendaryById(equippedInSlot.legendaryId) : null;
        const eqName = equippedInSlot ? (eqLeg ? eqLeg.name : equippedInSlot.name) : null;
        const delta = item.baseStatBonus - (equippedInSlot?.baseStatBonus ?? 0);

        const card = this.el(
          'div',
          `gear-item tier-${item.tier} ${item.isCursed ? 'cursed-tag' : ''} ${delta > 0 ? 'gear-upgrade' : ''}`
        );
        const top = this.el('div', 'row-between');
        top.appendChild(
          this.el(
            'strong',
            '',
            `${displayName} · Lv.${item.level} (${getRelicLineageLabel(item.classId)} ${item.slot})`
          )
        );
        const badgesWrap = this.el('div', 'row-wrap');
        const cmpPill = this.el(
          'span',
          `pill ${
            !equippedInSlot
              ? 'pill-gold'
              : delta > 0
                ? 'pill-upgrade'
                : delta < 0
                  ? 'pill-downgrade'
                  : ''
          }`,
          !equippedInSlot
            ? `NEW (+${item.baseStatBonus})`
            : delta > 0
              ? `+${delta} Power`
              : delta < 0
                ? `${delta} Power`
                : '0 Same'
        );
        badgesWrap.appendChild(cmpPill);
        const itemBadgeHost = this.el('span', 'astryx-inline-slot');
        mountHdBadge(itemBadgeHost, {
          label: `${item.tier.toUpperCase()}${item.isCursed ? ' · CURSED' : ''}`,
          tier: item.isCursed ? 'cursed' : item.tier,
        });
        badgesWrap.appendChild(itemBadgeHost);
        top.appendChild(badgesWrap);
        card.appendChild(top);
        card.appendChild(this.el('div', 'muted', `+${item.baseStatBonus} Power · ${displayAffix}`));
        card.appendChild(
          this.el(
            'div',
            'gear-compare-line',
            equippedInSlot
              ? `vs Equipped: ${eqName} (+${equippedInSlot.baseStatBonus} Power)`
              : `vs Equipped: Empty ${item.slot} slot`
          )
        );

        const acts = this.el('div', 'astryx-inline-slot');
        mountHdActionRow(acts, [
          {
            label: delta > 0 || !equippedInSlot ? 'Equip ▲' : 'Equip',
            variant: 'primary',
            size: 'sm',
            onClick: () => {
              void this.sendCampAction({ action: 'equip_item', itemId: item.id });
            },
          },
          {
            label: `Dismantle (+${getDismantleShardValue(item)} Shards)`,
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
    smith.appendChild(this.el('div', 'class-name', 'Sect Forge · Slot Tempering (+10% / Lv)'));

    const autoRow = this.el('div', 'row-between');
    autoRow.appendChild(
      this.el('span', 'muted', `Auto-Dismantle Normal Drops: ${p.autoDismantleNormal ? 'ON' : 'OFF'}`)
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
        `Upgrade (${cost.gold} Gold, ${cost.shards} Shards)`
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
    sanctum.appendChild(
      this.el(
        'div',
        'class-name',
        `The Sanctum · Purify Cursed (${SANCTUM_PURIFY_COST.shards} Jade + ${SANCTUM_PURIFY_COST.bossCores} Cores)`
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
      sanctum.appendChild(this.el('div', 'muted', 'No Cursed Relics owned.'));
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
          `Purify (${SANCTUM_PURIFY_COST.shards} Jade, ${SANCTUM_PURIFY_COST.bossCores} Cores)`
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
        `Alchemy Altar · Banish (${p.banishedBuffIds.length}/${p.unlockedBanishSlots})`
      )
    );

    const nextSlotCost = getNextBanishSlotCost(p.unlockedBanishSlots);
    if (nextSlotCost !== null) {
      const unlockBtn = this.el(
        'button',
        'btn btn-sm btn-gold',
        `Unlock Slot #${p.unlockedBanishSlots + 1} (${nextSlotCost} Gold)`
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
        `${b.name}${isBanished ? ' [SEALED]' : ''}`
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
    legion.appendChild(this.el('div', 'class-name', 'Stat Upgrades · Permanent'));

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
      row.appendChild(this.el('span', '', `${n.label} (Lv.${lvl})`));
      const btn = this.el('button', 'btn btn-sm btn-gold', `Upgrade (${cost} Gold)`);
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
      `Synergies (${discovered.size}/${WUXIA_SECRET_SYNERGIES.length})`
    );
    synBtn.addEventListener('click', () => {
      this.codexFilter = 'synergies';
      this.renderCamp();
    });
    filterRow.appendChild(synBtn);

    const manualsBtn = this.el(
      'button',
      `tab-btn ${this.codexFilter === 'manuals' ? 'active' : ''}`,
      `Skills (${WUXIA_ACTIVE_ARTS.length + WUXIA_INNER_QI.length})`
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
        `${c.name} Relics`
      );
      btn.addEventListener('click', () => {
        this.codexFilter = c.id;
        this.renderCamp();
      });
      filterRow.appendChild(btn);
    }
    container.appendChild(filterRow);

    if (this.codexFilter === 'synergies') {
      const grid = this.el('div', 'grid-2');
      for (const syn of WUXIA_SECRET_SYNERGIES) {
        const isKnown = discovered.has(syn.id);
        const card = this.el('div', `draft-card ${isKnown ? 'tier-prismatic' : 'tier-cursed'}`);
        if (isKnown) {
          const art = getWuxiaActiveArtById(syn.activeId);
          const qi = getWuxiaInnerQiById(syn.innerQiId);
          card.appendChild(this.el('span', 'tier-badge', 'SYNERGY'));
          card.appendChild(this.el('strong', '', syn.name));
          card.appendChild(
            this.el(
              'div',
              'muted',
              `${art ? art.name : syn.activeId} + ${qi ? qi.name : syn.innerQiId}`
            )
          );
          card.appendChild(this.el('div', 'muted', syn.description));
        } else {
          card.appendChild(this.el('span', 'tier-badge', 'LOCKED'));
          card.appendChild(this.el('strong', '', 'Undiscovered Synergy'));
          card.appendChild(this.el('div', 'muted', `"${syn.riddleHint}"`));
        }
        grid.appendChild(card);
      }
      container.appendChild(grid);
      return;
    }

    if (this.codexFilter === 'manuals') {
      container.appendChild(this.el('strong', '', 'Active Skills'));
      const activeGrid = this.el('div', 'grid-3');
      activeGrid.style.marginTop = '6px';
      for (const art of WUXIA_ACTIVE_ARTS) {
        const card = this.el('div', 'draft-card tier-gold');
        card.appendChild(this.el('span', 'tier-badge', art.sectOrigin));
        card.appendChild(this.el('strong', '', art.name));
        card.appendChild(this.el('div', 'muted', `Lv.1: ${art.levelDescriptions[0]}`));
        card.appendChild(this.el('div', 'muted', `Lv.5: ${art.levelDescriptions[4]}`));
        activeGrid.appendChild(card);
      }
      container.appendChild(activeGrid);

      const qiHeading = this.el('strong', '', 'Passive Skills');
      qiHeading.style.display = 'block';
      qiHeading.style.marginTop = '12px';
      container.appendChild(qiHeading);
      const qiGrid = this.el('div', 'grid-4');
      qiGrid.style.marginTop = '6px';
      for (const qi of WUXIA_INNER_QI) {
        const card = this.el('div', 'draft-card tier-silver');
        card.appendChild(this.el('span', 'tier-badge', qi.sectOrigin));
        card.appendChild(this.el('strong', '', qi.name));
        card.appendChild(this.el('div', 'muted', `Lv.1: ${qi.levelDescriptions[0]}`));
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

    container.appendChild(grid);
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
    this.releaseMenuKeys();
    this.currentRunSeed = seed;
    this.bankedRerolls = 2;
    this.isDraftMinimized = false;
    this.currentRunBiomeId =
      actualMode === 'daily'
        ? this.state.daily.biomeId
        : (BIOME_CATALOG[Math.abs(seed) % BIOME_CATALOG.length]?.id ?? this.state.daily.biomeId);
    this.renderDungeonHudShell();

    this.bridge.startRun({
      runId,
      mode: actualMode,
      seed,
      biomeId: this.currentRunBiomeId,
      classId: this.state.profile.selectedClass,
      profile: this.state.profile,
      daily: this.state.daily,
    });
  }

  private renderDungeonHudShell(): void {
    unmountAstryxRootsInside(this.root);
    this.root.innerHTML = '';
    this.lastHudBuffsKey = '';
    this.codexDrawerOpen = false;

    // Design A: HD-2D JRPG Battle Window
    const top = this.el('div', 'hud-jrpg-top');
    top.id = 'hud-top';

    const leftRibbon = this.el('div', 'hd-win hud-jrpg-ribbon');
    const floorLbl = this.el('strong', 'hud-jrpg-floor', 'FLOOR 1 • WAVE 1');
    floorLbl.id = 'hud-floor';
    const lootTxt = this.el('span', 'hud-jrpg-loot', '0 Gold • 0 Shards');
    lootTxt.id = 'hud-loot';
    leftRibbon.appendChild(floorLbl);
    leftRibbon.appendChild(this.el('span', 'hud-jrpg-sep', '|'));
    leftRibbon.appendChild(lootTxt);
    top.appendChild(leftRibbon);

    const bossBox = this.el('div', 'hd-win hud-boss-box');
    bossBox.id = 'hud-boss-box';
    bossBox.style.display = 'none';
    const bossName = this.el('strong', '', 'BOSS');
    bossName.id = 'hud-boss-name';
    const bossTrack = this.el('div', 'bar-track');
    const bossFill = this.el('div', 'bar-fill');
    bossFill.id = 'hud-boss-fill';
    bossFill.style.background = 'linear-gradient(90deg, #dc2626, #f59e0b)';
    bossTrack.appendChild(bossFill);
    const bossSub = this.el('div', 'muted', '');
    bossSub.id = 'hud-boss-sub';
    bossBox.appendChild(bossName);
    bossBox.appendChild(bossTrack);
    bossBox.appendChild(bossSub);
    top.appendChild(bossBox);

    const rightRibbon = this.el('div', 'hd-win hud-jrpg-ribbon');
    const spdBtn = this.el('button', 'btn btn-sm', '1x');
    spdBtn.id = 'hud-spd-btn';
    spdBtn.addEventListener('click', () => {
      const next = this.bridge?.toggleSpeed() ?? 1;
      spdBtn.textContent = `${next}x`;
    });
    rightRibbon.appendChild(spdBtn);

    const autoBtn = this.el('button', 'btn btn-sm btn-green', 'Auto: ON');
    autoBtn.id = 'hud-auto-btn';
    autoBtn.addEventListener('click', () => {
      const next = this.bridge?.toggleAutoSkill() ?? true;
      autoBtn.textContent = `Auto: ${next ? 'ON' : 'OFF'}`;
    });
    rightRibbon.appendChild(autoBtn);

    const muteBtn = this.el('button', 'btn btn-sm', soundFX.isMuted() ? 'Muted' : 'Audio');
    muteBtn.addEventListener('click', () => {
      muteBtn.textContent = soundFX.toggleMute() ? 'Muted' : 'Audio';
    });
    rightRibbon.appendChild(muteBtn);

    const retreatBtn = this.el('button', 'btn btn-sm btn-gold', 'Retreat');
    retreatBtn.addEventListener('click', () => {
      this.bridge?.retreatWithLoot();
    });
    rightRibbon.appendChild(retreatBtn);
    top.appendChild(rightRibbon);

    // 2. Streamlined Unified Bottom Combat Dock (Strict 50px height)
    const bottom = this.el('div', 'hud-jrpg-bottom');
    const unifiedDock = this.el('div', 'hd-win hud-unified-dock');

    // Section A: Vitals (HP & Qi Gauge)
    const vitalsCol = this.el('div', 'hud-dock-vitals');

    const hpRow = this.el('div', 'hud-dock-vital-row');
    const hpHead = this.el('div', 'hud-dock-vital-head');
    hpHead.appendChild(this.el('span', 'hud-stat-lbl', 'HP'));
    const hpText = this.el('span', 'hud-stat-val', '200 / 200');
    hpText.id = 'hud-hp-text';
    hpHead.appendChild(hpText);
    const hpTrack = this.el('div', 'bar-track bar-track--slim');
    const hpFill = this.el('div', 'bar-fill');
    hpFill.id = 'hud-hp-fill';
    hpTrack.appendChild(hpFill);
    hpRow.appendChild(hpHead);
    hpRow.appendChild(hpTrack);

    const ultRow = this.el('div', 'hud-dock-vital-row');
    const ultHead = this.el('div', 'hud-dock-vital-head');
    ultHead.appendChild(this.el('span', 'hud-stat-lbl hud-stat-lbl--gold', 'QI'));
    const ultText = this.el('span', 'hud-stat-val', '0/3 (0%)');
    ultText.id = 'hud-ult-text';
    ultHead.appendChild(ultText);
    const ultTrack = this.el('div', 'bar-track bar-track--slim');
    const ultFill = this.el('div', 'bar-fill bar-fill--ult');
    ultFill.id = 'hud-ult-fill';
    ultTrack.appendChild(ultFill);
    ultRow.appendChild(ultHead);
    ultRow.appendChild(ultTrack);

    vitalsCol.appendChild(hpRow);
    vitalsCol.appendChild(ultRow);
    unifiedDock.appendChild(vitalsCol);

    unifiedDock.appendChild(this.el('div', 'hud-dock-divider'));

    // Section B: Action Quick-Slots Strip (4 buttons: [Q], [W], [␣], [R])
    const actionStrip = this.el('div', 'hud-action-strip');

    const skillBtn = this.el('button', 'hud-action-btn hud-action-btn--tech');
    skillBtn.id = 'hud-skill-btn';
    skillBtn.innerHTML =
      '<span class="hud-action-key">Q</span><span class="hud-action-sub">TECH</span>';
    skillBtn.addEventListener('click', () => {
      this.bridge?.triggerActiveSkill();
    });

    const potBtn = this.el('button', 'hud-action-btn hud-action-btn--pot');
    potBtn.id = 'hud-pot-btn';
    potBtn.innerHTML =
      '<span class="hud-action-key">W</span><span class="hud-action-sub">POT ×1</span>';
    potBtn.addEventListener('click', () => {
      this.bridge?.triggerPotion();
    });

    const dashBtn = this.el('button', 'hud-action-btn hud-action-btn--dash');
    dashBtn.id = 'hud-dash-btn';
    dashBtn.innerHTML =
      '<span class="hud-action-key">␣</span><span class="hud-action-sub">DASH</span>';
    dashBtn.addEventListener('click', () => {
      this.bridge?.triggerDash();
    });

    const ultBtn = this.el('button', 'hud-action-btn hud-action-btn--ult');
    ultBtn.id = 'hud-ult-btn';
    ultBtn.disabled = true;
    ultBtn.innerHTML =
      '<span class="hud-action-key">R</span><span class="hud-action-sub">ULT 0%</span>';
    ultBtn.addEventListener('click', () => {
      this.bridge?.triggerUltimateSkill();
    });

    actionStrip.appendChild(skillBtn);
    actionStrip.appendChild(potBtn);
    actionStrip.appendChild(dashBtn);
    actionStrip.appendChild(ultBtn);
    unifiedDock.appendChild(actionStrip);

    unifiedDock.appendChild(this.el('div', 'hud-dock-divider'));

    // Section C: Arsenal Micro-Dock (Single Row!)
    const arsenalCol = this.el('div', 'hud-dock-arsenal');
    const arsenalHead = this.el('div', 'hud-dock-arsenal-head');
    const arsenalTitle = this.el('span', 'hud-dock-arsenal-title', 'SKILLS (0)');
    arsenalTitle.id = 'hud-arsenal-title';
    const codexTrigger = this.el('button', 'hud-codex-trigger');
    codexTrigger.id = 'hud-codex-trigger';
    codexTrigger.innerHTML =
      '<span class="hud-codex-label">Codex</span><span class="hud-codex-badge" id="hud-codex-badge">0</span><span class="hud-action-key">TAB</span>';
    codexTrigger.addEventListener('click', () => {
      this.toggleCodexDrawer();
    });
    arsenalHead.appendChild(arsenalTitle);
    arsenalHead.appendChild(codexTrigger);

    const microTiles = this.el('div', 'hud-micro-tiles');
    microTiles.id = 'hud-micro-dock';
    arsenalCol.appendChild(arsenalHead);
    arsenalCol.appendChild(microTiles);
    unifiedDock.appendChild(arsenalCol);

    bottom.appendChild(unifiedDock);

    // 3. Floating Slide-Out Martial Codex Drawer & Backdrop
    const codexBackdrop = this.el('div', 'hud-codex-backdrop hidden');
    codexBackdrop.id = 'hud-codex-backdrop';
    codexBackdrop.style.display = 'none';
    codexBackdrop.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCodexDrawer(false);
    });

    const codexDrawer = this.el('div', 'hd-win hud-codex-drawer hidden');
    codexDrawer.id = 'hud-codex-drawer';
    codexDrawer.style.display = 'none';
    const drawerHead = this.el('div', 'hud-codex-drawer-head');
    drawerHead.appendChild(this.el('span', 'hud-codex-drawer-title', 'Skills & Synergies'));
    const drawerCloseBtn = this.el('button', 'btn btn-sm btn-gold hud-codex-close-btn', 'Close');
    drawerCloseBtn.setAttribute('type', 'button');
    drawerCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCodexDrawer(false);
    });
    drawerHead.appendChild(drawerCloseBtn);
    codexDrawer.appendChild(drawerHead);

    const drawerBody = this.el('div', 'hud-codex-drawer-body');
    drawerBody.id = 'hud-codex-drawer-body';
    codexDrawer.appendChild(drawerBody);

    this.root.appendChild(top);
    this.root.appendChild(codexBackdrop);
    this.root.appendChild(codexDrawer);
    this.root.appendChild(bottom);
  }

  public updateRunHud(hud: RunHudSnapshot): void {
    if (this.mode !== 'dungeon') return;
    this.lastHud = hud;

    const floorEl = document.getElementById('hud-floor');
    if (floorEl) floorEl.textContent = `FLOOR ${hud.floor} • ${hud.waveLabel.toUpperCase()}`;

    const hpFill = document.getElementById('hud-hp-fill');
    if (hpFill) {
      hpFill.style.width = `${Math.min(100, Math.round((hud.hp / Math.max(1, hud.maxHp)) * 100))}%`;
    }

    const hpText = document.getElementById('hud-hp-text');
    if (hpText) {
      hpText.textContent = `${hud.hp}/${hud.maxHp}${hud.shield > 0 ? ` (+${hud.shield})` : ''}`;
    }

    const ultFill = document.getElementById('hud-ult-fill');
    if (ultFill) {
      ultFill.style.width = `${hud.ultimateStocks >= hud.maxUltimateStocks ? 100 : Math.min(100, hud.ultimateGauge)}%`;
    }

    const ultText = document.getElementById('hud-ult-text');
    if (ultText) {
      ultText.textContent =
        hud.ultimateStocks >= hud.maxUltimateStocks
          ? `${hud.ultimateStocks}/${hud.maxUltimateStocks} MAX`
          : `${hud.ultimateStocks}/${hud.maxUltimateStocks} (${hud.ultimateGauge}%)`;
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
          bSub.textContent = `${hud.activeBossHp}/${hud.activeBossMaxHp}${hud.activeBossShield > 0 ? ` • Shield ${hud.activeBossShield}` : ''}${muts ? ` • ${muts}` : ''}`;
        }
      } else {
        bossBox.style.display = 'none';
      }
    }

    const lootEl = document.getElementById('hud-loot');
    if (lootEl) lootEl.textContent = `${hud.gold} Gold • ${hud.shards} Shards`;

    const ultBtn = document.getElementById('hud-ult-btn');
    if (ultBtn instanceof HTMLButtonElement) {
      const hasStock = hud.ultimateStocks > 0;
      ultBtn.disabled = !hasStock;
      ultBtn.className = hasStock
        ? 'hud-action-btn hud-action-btn--ult hud-action-btn--ult-ready'
        : 'hud-action-btn hud-action-btn--ult';
      ultBtn.innerHTML = hasStock
        ? `<span class="hud-action-key">R</span><span class="hud-action-sub">ULT MAX</span>`
        : `<span class="hud-action-key">R</span><span class="hud-action-sub">ULT ${hud.ultimateGauge}%</span>`;
      ultBtn.title = `${hud.ultimateName}: ${hud.ultimateStocks}/${hud.maxUltimateStocks} stored (${hud.ultimateGauge}%)`;
    }

    const skillBtn = document.getElementById('hud-skill-btn');
    if (skillBtn instanceof HTMLButtonElement) {
      skillBtn.disabled = !hud.skillReady;
      skillBtn.title = hud.skillName;
      skillBtn.className = hud.skillReady
        ? 'hud-action-btn hud-action-btn--tech hud-action-btn--ready'
        : 'hud-action-btn hud-action-btn--tech';
      skillBtn.innerHTML = hud.skillReady
        ? '<span class="hud-action-key">Q</span><span class="hud-action-sub">TECH RDY</span>'
        : `<span class="hud-action-key">Q</span><span class="hud-action-sub">TECH ${Math.ceil(hud.skillCooldownPct * 10)}s</span>`;
    }

    const dashBtn = document.getElementById('hud-dash-btn');
    if (dashBtn instanceof HTMLButtonElement) {
      dashBtn.disabled = !hud.dashReady;
      dashBtn.className = hud.dashReady
        ? 'hud-action-btn hud-action-btn--dash hud-action-btn--ready'
        : 'hud-action-btn hud-action-btn--dash';
      dashBtn.innerHTML = hud.dashReady
        ? '<span class="hud-action-key">␣</span><span class="hud-action-sub">DASH RDY</span>'
        : `<span class="hud-action-key">␣</span><span class="hud-action-sub">DASH ${Math.ceil(hud.dashCooldownPct * 5)}s</span>`;
    }

    const potBtn = document.getElementById('hud-pot-btn');
    if (potBtn instanceof HTMLButtonElement) {
      const canUse = hud.potionCharges > 0 && hud.potionDisabledReason === null;
      potBtn.disabled = !canUse;
      potBtn.className = canUse
        ? 'hud-action-btn hud-action-btn--pot hud-action-btn--ready'
        : 'hud-action-btn hud-action-btn--pot';
      potBtn.innerHTML = hud.potionDisabledReason
        ? '<span class="hud-action-key">W</span><span class="hud-action-sub">POT OFF</span>'
        : `<span class="hud-action-key">W</span><span class="hud-action-sub">POT ×${hud.potionCharges}</span>`;
      potBtn.title =
        hud.potionDisabledReason ?? `Healing Elixir: ${hud.potionCharges} charges left [W]`;
    }

    const microDock = document.getElementById('hud-micro-dock');
    const arsenalTitle = document.getElementById('hud-arsenal-title');
    const codexBadge = document.getElementById('hud-codex-badge');
    const codexBody = document.getElementById('hud-codex-drawer-body');
    const buffsKey = `${hud.floor}:${hud.draftedBuffIds.join(',')}`;

    if (microDock && buffsKey !== this.lastHudBuffsKey) {
      this.lastHudBuffsKey = buffsKey;
      microDock.innerHTML = '';
      if (codexBody) codexBody.innerHTML = '';

      const loadout = computeWuxiaLoadout(hud.draftedBuffIds, hud.floor);
      const totalCount =
        loadout.actives.length +
        loadout.innerQis.length +
        Object.keys(loadout.enlightenmentCounts).length;

      if (arsenalTitle) {
        arsenalTitle.textContent = `SKILLS (${totalCount})`;
      }
      if (codexBadge) {
        codexBadge.textContent = `${totalCount}`;
      }

      // 1. Populate Single-Row Micro-Dock Tiles
      for (const slot of loadout.actives) {
        const art = getWuxiaActiveArtById(slot.id);
        if (!art) continue;
        const syn = getActiveAwakenedSynergy(art.id, loadout.awakenedSynergies);
        const tierClass = syn
          ? 'hud-skill-tile--transcendent'
          : slot.level >= 5
            ? 'hud-skill-tile--transcendent'
            : slot.level >= 3
              ? 'hud-skill-tile--gold'
              : 'hud-skill-tile--silver';
        const tile = this.el('button', `hud-skill-tile ${tierClass}`);
        const iconSpan = this.el('span', 'hud-tile-icon', art.shortName.slice(0, 3).toUpperCase());
        const lvlSpan = this.el('span', 'hud-tile-lvl', syn ? `${slot.level}S` : `${slot.level}`);
        tile.appendChild(iconSpan);
        tile.appendChild(lvlSpan);
        const info = syn
          ? `[Synergy] ${syn.name}: ${syn.description}`
          : `${art.name} (Lv.${slot.level}/${loadout.maxManualLevel}): ${art.levelDescriptions[slot.level - 1] ?? ''}`;
        tile.title = info;
        tile.addEventListener('click', () => {
          this.showToastSafe(info);
        });
        microDock.appendChild(tile);
      }

      for (const slot of loadout.innerQis) {
        const qi = getWuxiaInnerQiById(slot.id);
        if (!qi) continue;
        const tierClass =
          slot.level >= 5
            ? 'hud-skill-tile--transcendent'
            : slot.level >= 4
              ? 'hud-skill-tile--gold'
              : 'hud-skill-tile--silver';
        const tile = this.el('button', `hud-skill-tile ${tierClass}`);
        const iconSpan = this.el('span', 'hud-tile-icon', qi.name.slice(0, 3).toUpperCase());
        const lvlSpan = this.el('span', 'hud-tile-lvl', `${slot.level}`);
        tile.appendChild(iconSpan);
        tile.appendChild(lvlSpan);
        const info = `${qi.name} (Lv.${slot.level}/${loadout.maxManualLevel}): ${qi.levelDescriptions[slot.level - 1] ?? ''}`;
        tile.title = info;
        tile.addEventListener('click', () => {
          this.showToastSafe(info);
        });
        microDock.appendChild(tile);
      }

      for (const [scrollId, count] of Object.entries(loadout.enlightenmentCounts)) {
        const manual = getWuxiaEnlightenmentScrollById(scrollId);
        if (!manual || count <= 0) continue;
        const tile = this.el('button', 'hud-skill-tile hud-skill-tile--scroll');
        const iconSpan = this.el('span', 'hud-tile-icon', manual.name.slice(0, 3).toUpperCase());
        const lvlSpan = this.el('span', 'hud-tile-lvl', `×${count}`);
        tile.appendChild(iconSpan);
        tile.appendChild(lvlSpan);
        const info = `${manual.name} (×${count}): ${manual.description}`;
        tile.title = info;
        tile.addEventListener('click', () => {
          this.showToastSafe(info);
        });
        microDock.appendChild(tile);
      }

      // 2. Populate Slide-out Martial Codex
      if (codexBody) {
        if (loadout.awakenedSynergies.length > 0) {
          const synSec = this.el('div', 'codex-section');
          synSec.appendChild(this.el('div', 'codex-section-title', 'Synergies'));
          for (const synId of loadout.awakenedSynergies) {
            const syn = getWuxiaSynergyById(synId);
            if (!syn) continue;
            const card = this.el('div', 'codex-card codex-card--prismatic');
            const head = this.el('div', 'codex-card-head');
            head.appendChild(this.el('span', 'codex-card-name', syn.name));
            head.appendChild(this.el('span', 'tier-badge tier-prismatic', 'AWAKENED'));
            card.appendChild(head);
            card.appendChild(this.el('div', 'codex-card-desc', syn.description));
            synSec.appendChild(card);
          }
          codexBody.appendChild(synSec);
        }

        if (loadout.actives.length > 0) {
          const actSec = this.el('div', 'codex-section');
          actSec.appendChild(
            this.el(
              'div',
              'codex-section-title',
              `Active Skills (${loadout.actives.length}/${loadout.maxActiveSlots})`
            )
          );
          for (const slot of loadout.actives) {
            const art = getWuxiaActiveArtById(slot.id);
            if (!art) continue;
            const syn = getActiveAwakenedSynergy(art.id, loadout.awakenedSynergies);
            const card = this.el('div', `codex-card ${syn ? 'codex-card--prismatic' : ''}`);
            const head = this.el('div', 'codex-card-head');
            head.appendChild(
              this.el(
                'span',
                'codex-card-name',
                `${art.name} (Lv.${slot.level}/${loadout.maxManualLevel})`
              )
            );
            head.appendChild(
              this.el(
                'span',
                `tier-badge ${syn ? 'tier-prismatic' : slot.level >= 3 ? 'tier-gold' : 'tier-silver'}`,
                syn ? 'SYNERGY' : `RANK ${slot.level}`
              )
            );
            card.appendChild(head);
            const desc = art.levelDescriptions[slot.level - 1] ?? '';
            card.appendChild(this.el('div', 'codex-card-desc', desc));
            actSec.appendChild(card);
          }
          codexBody.appendChild(actSec);
        }

        if (loadout.innerQis.length > 0) {
          const qiSec = this.el('div', 'codex-section');
          qiSec.appendChild(
            this.el(
              'div',
              'codex-section-title',
              `Passive Skills (${loadout.innerQis.length}/${loadout.maxInnerQiSlots})`
            )
          );
          for (const slot of loadout.innerQis) {
            const qi = getWuxiaInnerQiById(slot.id);
            if (!qi) continue;
            const card = this.el('div', 'codex-card');
            const head = this.el('div', 'codex-card-head');
            head.appendChild(
              this.el(
                'span',
                'codex-card-name',
                `${qi.name} (Lv.${slot.level}/${loadout.maxManualLevel})`
              )
            );
            head.appendChild(
              this.el(
                'span',
                `tier-badge ${slot.level >= 4 ? 'tier-gold' : 'tier-silver'}`,
                `RANK ${slot.level}`
              )
            );
            card.appendChild(head);
            const desc = qi.levelDescriptions[slot.level - 1] ?? '';
            card.appendChild(this.el('div', 'codex-card-desc', desc));
            qiSec.appendChild(card);
          }
          codexBody.appendChild(qiSec);
        }

        const scrollEntries = Object.entries(loadout.enlightenmentCounts).filter(
          ([, cnt]) => cnt > 0
        );
        if (scrollEntries.length > 0) {
          const scrSec = this.el('div', 'codex-section');
          scrSec.appendChild(
            this.el('div', 'codex-section-title', 'Tomes')
          );
          for (const [scrollId, count] of scrollEntries) {
            const manual = getWuxiaEnlightenmentScrollById(scrollId);
            if (!manual) continue;
            const card = this.el('div', 'codex-card');
            const head = this.el('div', 'codex-card-head');
            head.appendChild(
              this.el('span', 'codex-card-name', manual.name)
            );
            head.appendChild(this.el('span', 'tier-badge tier-gold', `×${count}`));
            card.appendChild(head);
            card.appendChild(
              this.el(
                'div',
                'codex-card-desc',
                `${manual.description} (Rank ×${count})`
              )
            );
            scrSec.appendChild(card);
          }
          codexBody.appendChild(scrSec);
        }

        if (totalCount === 0) {
          const empty = this.el('div', 'hd-empty');
          empty.appendChild(this.el('div', 'hd-empty__title', 'No Manuals Mastered Yet'));
          empty.appendChild(
            this.el(
              'div',
              'hd-empty__desc',
              'Defeat cultists and clear waves to draft Active and Passive Skills.'
            )
          );
          codexBody.appendChild(empty);
        }
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
    this.bankedRerolls += 1;
    this.isDraftMinimized = false;

    const backdrop = this.el('div', 'modal-backdrop');
    const box = this.el('div', 'modal-box');

    // Minimized Floating Banner (shown only when collapsed to inspect field)
    const minPill = this.el('div', 'modal-minimized-pill hidden');
    minPill.innerHTML = `<span>Floor ${floor} Skill Draft Paused</span><span class="btn btn-xs btn-gold">Resume</span>`;
    box.appendChild(minPill);

    const toggleMinimize = (): void => {
      this.isDraftMinimized = !this.isDraftMinimized;
      if (this.isDraftMinimized) {
        backdrop.classList.add('modal-backdrop--minimized');
        box.classList.add('modal-box--minimized');
        minPill.classList.remove('hidden');
      } else {
        backdrop.classList.remove('modal-backdrop--minimized');
        box.classList.remove('modal-box--minimized');
        minPill.classList.add('hidden');
      }
    };

    minPill.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMinimize();
    });

    // Top action row: Banked Rolls badge, Skip button, Minimize button
    const actionRow = this.el('div', 'draft-header-actions');
    const rollBadge = this.el(
      'span',
      'tier-badge tier-gold',
      `${this.bankedRerolls} Reroll${this.bankedRerolls === 1 ? '' : 's'}`
    );
    actionRow.appendChild(rollBadge);

    const rightActions = this.el('div', 'row-gap-2');
    const skipBtn = this.el('button', 'btn btn-sm btn-ghost', 'Skip (+1 Reroll)');
    skipBtn.title = 'Skip choosing a skill for this floor to bank +1 extra reroll';
    skipBtn.addEventListener('click', () => {
      this.bankedRerolls += 1;
      soundFX.playDraft();
      this.showToastSafe(`Draft skipped (+1 Reroll)`);
      this.clearModal();
      this.bridge?.resumeAfterDraft('skip');
    });

    const minBtn = this.el('button', 'btn btn-sm btn-ghost', 'Minimize');
    minBtn.title = 'Collapse skill draft to view your hero, arena, and Codex';
    minBtn.addEventListener('click', toggleMinimize);

    rightActions.appendChild(skipBtn);
    rightActions.appendChild(minBtn);
    actionRow.appendChild(rightActions);
    box.appendChild(actionRow);

    // Current Equipped Loadout bar
    const loadoutBar = this.el('div', 'draft-loadout-preview');
    loadoutBar.appendChild(this.el('span', 'draft-loadout-label', 'Equipped Skills:'));
    const chipsWrap = this.el('div', 'draft-loadout-chips');
    if (loadout.actives.length === 0 && loadout.innerQis.length === 0) {
      chipsWrap.appendChild(this.el('span', 'muted text-xs', 'None yet'));
    } else {
      for (const a of loadout.actives) {
        const art = getWuxiaActiveArtById(a.id);
        if (!art) continue;
        const syn = Boolean(getActiveAwakenedSynergy(art.id, loadout.awakenedSynergies));
        const cls = syn
          ? 'tier-transcendent'
          : a.level >= 5
            ? 'tier-transcendent'
            : a.level >= 3
              ? 'tier-gold'
              : 'tier-silver';
        chipsWrap.appendChild(this.el('span', `buff-chip ${cls}`, `${art.shortName} Lv.${a.level}`));
      }
      for (const q of loadout.innerQis) {
        const qi = getWuxiaInnerQiById(q.id);
        if (!qi) continue;
        const cls = q.level >= 5 ? 'tier-transcendent' : q.level >= 4 ? 'tier-gold' : 'tier-silver';
        chipsWrap.appendChild(this.el('span', `buff-chip ${cls}`, `${qi.name} Lv.${q.level}`));
      }
    }
    loadoutBar.appendChild(chipsWrap);
    box.appendChild(loadoutBar);

    const bannerHost = this.el('div', 'astryx-block-slot');
    const updateBanner = (): void => {
      rollBadge.textContent = `${this.bankedRerolls} Reroll${this.bankedRerolls === 1 ? '' : 's'}`;
      mountHdBanner(bannerHost, {
        status: loadout.availableSynergies.length > 0 ? 'success' : 'info',
        title: `Floor ${floor} • Choose 1 Skill`,
        description: `Active Skills ${loadout.actives.length}/${loadout.maxActiveSlots} • Passive Skills ${loadout.innerQis.length}/${loadout.maxInnerQiSlots}`,
        badgeText: `${this.bankedRerolls} Rerolls`,
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
        const isHigherClass = cardDef.isSecretAwakening || cardDef.nextLevel >= 5;
        const tierCss = isHigherClass
          ? 'tier-transcendent'
          : cardDef.kind === 'active' || cardDef.kind === 'enlightenment'
            ? 'tier-gold'
            : 'tier-silver';
        const astryxTier = isHigherClass
          ? 'prismatic'
          : cardDef.kind === 'active' || cardDef.kind === 'enlightenment'
            ? 'gold'
            : 'silver';

        const card = this.el('div', `draft-card ${tierCss}`);
        const badgeHost = this.el('span', 'astryx-inline-slot');
        mountHdBadge(badgeHost, {
          label: cardDef.badge,
          tier: astryxTier,
        });
        card.appendChild(badgeHost);

        const rollCard = (): void => {
          if (this.bankedRerolls <= 0) return;
          const handIds = cards.map((entry) => entry.id);
          const nextCard = refreshWuxiaDraftCard(
            this.draftRng,
            equippedBuffIds,
            floor,
            handIds,
            cardDef.id
          );
          if (!nextCard) {
            this.showToastSafe('No alternate skills remain for this loadout');
            return;
          }
          this.bankedRerolls -= 1;
          soundFX.playRouletteTick();
          cards = cards.map((existing, cIdx) => (cIdx === idx ? nextCard : existing));
          renderCards();
        };

        card.appendChild(this.el('strong', '', cardDef.name));
        card.appendChild(this.el('div', 'muted', cardDef.description));

        const pickHost = this.el('div', 'astryx-inline-slot');
        mountHdActionRow(pickHost, [
          {
            label: `Reroll (${this.bankedRerolls})`,
            variant: 'secondary',
            size: 'sm',
            isDisabled: this.bankedRerolls <= 0,
            onClick: rollCard,
          },
          {
            label: cardDef.isSecretAwakening
              ? 'Awaken Synergy'
              : cardDef.currentLevel > 0 && cardDef.kind !== 'enlightenment'
                ? `Upgrade Lv.${cardDef.nextLevel}`
                : 'Learn Skill',
            variant: 'primary',
            size: 'md',
            onClick: () => {
              soundFX.playDraft();
              if (cardDef.kind === 'synergy') {
                const newlyDiscovered = recordDiscoveredSynergy(cardDef.id);
                if (newlyDiscovered) {
                  this.showToastSafe(`New Synergy Recorded: ${cardDef.name}`);
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
    const biome = getBiomeForFloor(this.currentRunBiomeId, floor, this.currentRunSeed);
    const isLeader = isCultLeaderFloor(floor);
    const miniBossSpec = getMiniBossForFloor(this.currentRunBiomeId, floor, this.currentRunSeed);
    const endBossName = getEndBossNameForFloor(this.currentRunBiomeId, floor, this.currentRunSeed);
    const mechSource = BOSS_MUTATIONS.length > 0 ? biome : biome;
    void mechSource;

    const backdrop = this.el('div', 'modal-backdrop');
    const box = this.el('div', 'modal-box');
    const bannerHost = this.el('div', 'astryx-block-slot');
    mountHdBanner(bannerHost, {
      status: 'warning',
      title: isLeader
        ? `Floor ${floor} Boss: ${endBossName}`
        : `Floor ${floor} Mini-Boss: ${miniBossSpec.name}`,
      description: isLeader
        ? `${biome.mechanicName}: ${biome.mechanicDescription}`
        : `${miniBossSpec.title} • ${biome.name} (${biome.mechanicName})`,
      badgeText: isLeader ? 'BOSS' : 'MINI-BOSS',
      badgeTier: 'boss',
    });
    box.appendChild(bannerHost);
    const windowEl = this.el('div', 'roulette-window', 'Spinning Boss Mutation...');
    const descEl = this.el('div', 'muted', 'Rolling active spire mutations...');
    descEl.style.textAlign = 'center';

    const goHost = this.el('div', 'camp-footer');
    const renderGoAction = (ready: boolean): void => {
      mountHdActionRow(goHost, [
        {
          label: 'Fight Boss',
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
        windowEl.textContent = sample.name;
      } else {
        window.clearInterval(timer);
        const defs = rolled.map((id) => getMutationById(id));
        windowEl.textContent = defs.map((d) => d.name).join(' + ');
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
    mountHdBanner(bannerHost, {
      status: 'success',
      title: `Floor ${floor} Boss Cleared`,
      description: `Loot Secured: ${gold} Gold • ${shards} Shards • ${cores} Cores. Return to Camp with 100% rewards or continue to Floor ${floor + 1}.`,
      badgeText: `FLOOR ${floor} CLEAR`,
      badgeTier: 'prismatic',
    });
    box.appendChild(bannerHost);

    const row = this.el('div', 'camp-footer');
    mountHdActionRow(row, [
      {
        label: 'Return to Camp (100% Loot)',
        variant: 'secondary',
        size: 'md',
        onClick: () => {
          this.clearModal();
          this.bridge?.resumeAfterExtraction(true);
        },
      },
      {
        label: `Ascend to Floor ${floor + 1}`,
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
    const clearedFloors =
      payload.outcome === 'died' ? Math.max(0, payload.floorReached - 1) : payload.floorReached;
    if (clearedFloors >= 10 || (payload.outcome === 'cleared' && payload.mode === 'daily')) {
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
    const clearedFloors =
      payload.outcome === 'died' ? Math.max(0, payload.floorReached - 1) : payload.floorReached;
    const bossCount = Math.max(1, Math.floor(clearedFloors / 10));
    mountHdBanner(bannerHost, {
      status: 'warning',
      title: 'Altar of Fate — Legendary Purification',
      description: `You defeated ${bossCount} Boss${bossCount > 1 ? 'es' : ''}! Guaranteed Legendary Drop (${getRelicLineageLabel(payload.classId)}). Purify (50/50) for Pristine, or claim it Cursed with full power.`,
      badgeText: 'LEGENDARY',
      badgeTier: 'gold',
    });
    box.appendChild(bannerHost);

    const statusEl = this.el('div', 'roulette-window', 'Ready to Purify');
    const rollHost = this.el('div', 'camp-footer');
    const renderRollBtn = (disabled: boolean): void => {
      mountHdActionRow(rollHost, [
        {
          label: 'Purify Item (50/50)',
          variant: 'primary',
          size: 'md',
          isDisabled: disabled,
          onClick: () => {
            renderRollBtn(true);
            const purified = this.rouletteRng() < 0.5;
            if (purified) {
              soundFX.playVictory();
              statusEl.textContent = 'Purified: Pristine Legendary';
            } else {
              soundFX.playBossRoar();
              statusEl.textContent = 'Cursed: Penalty Retained';
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

    const legendaryDrops: GearItem[] = [];
    const totalBossLegendaries =
      cultLeadersDefeated >= 1
        ? cultLeadersDefeated
        : payload.outcome === 'cleared' && payload.mode === 'daily'
          ? 1
          : 0;
    for (let b = 1; b <= totalBossLegendaries; b++) {
      const bossFloor = Math.max(10, b * 10);
      const isCursed = b === 1 ? !payload.greedGamblePurified : rng() >= 0.65;
      legendaryDrops.push(
        createLegendaryGearItem(rng, payload.classId, isCursed, `b${bossFloor}`, bossFloor)
      );
    }
    for (let f = 6; f <= clearedFloors; f++) {
      if (
        !isCultLeaderFloor(f) &&
        (isRandomMiniBossFloor(f, dropSeed) || (f >= 25 && f % 10 === 5))
      ) {
        if (rng() < 0.35) {
          legendaryDrops.push(
            createLegendaryGearItem(rng, payload.classId, rng() >= 0.65, `mb${f}`, f)
          );
        }
      }
    }
    const legendaryDrop: GearItem | null = legendaryDrops[legendaryDrops.length - 1] ?? null;
    const allKeptDrops = [...legendaryDrops, ...keptDrops];

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
      inventory: [...allKeptDrops, ...p.inventory].slice(0, 60),
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
      drops: allKeptDrops,
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
        ? `Floor ${payload.floorReached} Cleared`
        : payload.outcome === 'extracted'
          ? `Floor ${payload.floorReached} Completed (Retreated)`
          : `Floor ${payload.floorReached} Defeated`;

    const bannerHost = this.el('div', 'astryx-block-slot');
    mountHdBanner(bannerHost, {
      status:
        payload.outcome === 'cleared' || payload.outcome === 'extracted'
          ? 'success'
          : 'warning',
      title: titleStr,
      description: '100% of Gold, Shards, Cores, and Gear are banked in Camp.',
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
        .map((s) => s.name)
        .join(' • ');
      box.appendChild(
        this.el('div', 'card', `Synergies Discovered This Run: ${synNames}`)
      );
    }

    box.appendChild(
      this.el(
        'div',
        'card',
        `Banked: Gold ${summary.goldBanked} • Shards ${summary.shardsBanked} • Cores ${summary.coresBanked} • +${summary.expGained} EXP (Lv.${summary.newLevel}${summary.leveledUp ? ' Level Up!' : ''})${summary.bountyApplied ? ' [2x Bounty]' : ''}${summary.restedApplied ? ' [2x Rested]' : ''}${summary.playerRank ? ` • Daily Rank #${summary.playerRank}` : ''}`
      )
    );

    const nonLegDrops = summary.drops.filter((d) => d.id !== summary.legendaryDrop?.id);
    const totalNewDrops = (summary.legendaryDrop ? 1 : 0) + nonLegDrops.length;

    if (totalNewDrops > 0) {
      const slotLabels: Record<GearSlot, string> = {
        weapon: 'Weapon',
        headgear: 'Headpiece',
        top: 'Armor',
        cape: 'Cape',
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
        this.el('strong', '', `NEW GEAR ACQUIRED (${totalNewDrops})`)
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
        mountHdBadge(badgeHost, {
          label: item.tier === 'legendary'
            ? item.isCursed
              ? 'LEGENDARY CURSED'
              : 'LEGENDARY'
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
          delta > 0 ? ` • +${delta} Upgrade` : delta < 0 ? ` • ${delta} vs equipped` : '';
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
                `Cursed (${leg.cursedName}): ${leg.cursedText} — Cleanse at Upgrades`
              )
            );
          }
        }

        const isAlreadyEquipped =
          this.state.profile.classes[payload.classId].equipped[item.slot]?.id === item.id;
        const equipBtn = this.el(
          'button',
          `btn btn-sm ${isAlreadyEquipped ? '' : delta > 0 ? 'btn-green' : 'btn-primary'}`,
          isAlreadyEquipped ? 'Equipped' : 'Equip'
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
            equipBtn.textContent = 'Equipped';
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
            `+${showcaseItems.length - 6} additional items stored in Hero bag.`
          )
        );
      }
      box.appendChild(dropsSection);
    } else if (summary.autoDismantledCount > 0) {
      box.appendChild(
        this.el(
          'div',
          'card',
          `Auto-Dismantled ${summary.autoDismantledCount} Normal items into +${summary.autoDismantledShards} Shards`
        )
      );
    }

    const actions = this.el('div', 'camp-footer');
    let shareState: 'idle' | 'posting' | 'posted' | 'copied' = 'idle';
    const renderActions = (): void => {
      const shareLabel =
        shareState === 'posted'
          ? 'Posted to Comments'
          : shareState === 'copied'
            ? 'Copied Summary'
            : shareState === 'posting'
              ? 'Sharing Build...'
              : 'Share Build to Reddit Comments';
      mountHdActionRow(actions, [
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
          label: 'Return to Camp',
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
