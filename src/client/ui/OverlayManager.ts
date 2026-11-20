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
import { getBuffById } from '../../shared/catalogs/buffs.ts';
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
  DAILY_CHEST_FLOORS,
  DAILY_REWARD_MULT,
  ENDLESS_REWARD_MULT,
  SANCTUM_PURIFY_COST,
  awardClassExp,
  claimLoginStreakReward,
  createGearItem,
  createInitialProfile,
  createLegendaryGearItem,
  evaluateDailyMasteryBounty,
  expForNextLevel,
  getDailyChallengeConfig,
  getDailyChestRewards,
  getDailyMasteryBounty,
  getDailySectDecree,
  getDay14SlotLegendaryChoices,
  getDismantleShardValue,
  getLegionUpgradeCost,
  getLoginStreakStatus,
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
  private equipSlotFilter: GearSlot | 'all' = 'all';
  private selectedInspectItemId: string | null = null;
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
  private utilityMenuOpen: boolean = false;
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
        this.toggleUtilityMenu(false);
        this.toggleCodexDrawer();
      } else if (e.code === 'Escape') {
        if (this.utilityMenuOpen) {
          e.preventDefault();
          this.toggleUtilityMenu(false);
        } else if (this.codexDrawerOpen) {
          e.preventDefault();
          this.toggleCodexDrawer(false);
        }
      }
    });

    window.addEventListener('pointerdown', (e: PointerEvent) => {
      if (!this.utilityMenuOpen || this.mode !== 'dungeon') return;
      const target = e.target;
      if (!(target instanceof Node)) return;
      const menuWrap = document.getElementById('hud-menu-wrap');
      if (menuWrap && !menuWrap.contains(target)) {
        this.toggleUtilityMenu(false);
      }
    });
  }

  public toggleUtilityMenu(forceState?: boolean): void {
    const popover = document.getElementById('hud-utility-popover');
    const trigger = document.getElementById('hud-menu-btn');
    if (!popover) return;
    this.utilityMenuOpen = forceState !== undefined ? forceState : !this.utilityMenuOpen;
    if (this.utilityMenuOpen) {
      popover.classList.remove('hidden');
      popover.style.display = 'flex';
      if (trigger) {
        trigger.classList.add('hud-ink-pill--active');
        trigger.setAttribute('aria-expanded', 'true');
      }
    } else {
      popover.classList.add('hidden');
      popover.style.display = 'none';
      if (trigger) {
        trigger.classList.remove('hud-ink-pill--active');
        trigger.setAttribute('aria-expanded', 'false');
      }
    }
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

  private buildHighlightedText(text: string): DocumentFragment {
    const frag = document.createDocumentFragment();
    const pattern = /([+-]?\d+(?:\.\d+)?(?:%|x|s|px)?)/g;
    let lastIndex = 0;
    let match = pattern.exec(text);
    while (match !== null) {
      if (match.index > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const token = match[0];
      const cls = token.startsWith('+') ? 'stat-hl stat-hl--emerald' : 'stat-hl';
      frag.appendChild(this.el('span', cls, token));
      lastIndex = match.index + token.length;
      match = pattern.exec(text);
    }
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    return frag;
  }

  private renderLevelPips(
    currentLevel: number,
    maxLevel: number,
    nextLevel?: number
  ): HTMLElement {
    const row = this.el('div', 'lvl-pips');
    const clampedMax = Math.max(1, maxLevel);
    row.setAttribute(
      'aria-label',
      nextLevel !== undefined
        ? `Level ${currentLevel} to ${nextLevel} of ${clampedMax}`
        : `Level ${currentLevel} of ${clampedMax}`
    );
    for (let i = 1; i <= clampedMax; i++) {
      let stateClass = 'lvl-pip--empty';
      if (i <= currentLevel) {
        stateClass = 'lvl-pip--filled';
      } else if (nextLevel !== undefined && i <= nextLevel) {
        stateClass = 'lvl-pip--next';
      }
      row.appendChild(this.el('span', `lvl-pip ${stateClass}`));
    }
    return row;
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
        const selectedClsId = p.selectedClass;
        const selectedCls = p.classes[selectedClsId];
        const prevEquipped = selectedCls.equipped[item.slot];
        const nextInv = p.inventory.filter((i) => i.id !== item.id);
        if (prevEquipped && !prevEquipped.id.startsWith('starter_wep_')) {
          nextInv.unshift(prevEquipped);
        }
        const nextClasses = {
          ...p.classes,
          [selectedClsId]: {
            ...selectedCls,
            equipped: { ...selectedCls.equipped, [item.slot]: item },
          },
        };
        p = {
          ...p,
          inventory: nextInv,
          classes: nextClasses,
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
        if (p.shards < cost.shards) {
          this.showToastSafe(`Need ${cost.shards} Spirit Shards`);
          return null;
        }
        p = {
          ...p,
          shards: p.shards - cost.shards,
          classes: {
            ...p.classes,
            [req.classId]: {
              ...cls,
              slotLevels: { ...cls.slotLevels, [req.slot]: lvl + 1 },
            },
          },
        };
        message = `Tempered ${req.slot} slot to Lv.${lvl + 1}`;
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
        if (p.gold < cost) {
          this.showToastSafe(`Need ${cost} Gold`);
          return null;
        }
        p = {
          ...p,
          gold: p.gold - cost,
          legion: { ...p.legion, [req.stat]: lvl + 1 },
        };
        message = `Permanent ${req.stat.toUpperCase()} upgraded to Lv.${lvl + 1}`;
        break;
      }
      case 'toggle_auto_dismantle': {
        p = { ...p, autoDismantleNormal: !p.autoDismantleNormal };
        message = p.autoDismantleNormal ? 'Auto-dismantle ON' : 'Auto-dismantle OFF';
        break;
      }
      case 'claim_login_reward': {
        const todayKey = getUtcDateKey();
        const status = getLoginStreakStatus(p, todayKey);
        if (!status.canClaimToday) {
          this.showToastSafe('Daily login reward already claimed today.');
          return null;
        }
        const claimed = claimLoginStreakReward(
          p,
          todayKey,
          req.chosenSlot,
          req.chosenLegendaryId
        );
        p = claimed.profile;
        message = claimed.message;
        break;
      }
    }

    this.state.profile = p;
    this.saveLocalProfile(p);
    return message;
  }

  private async sendCampAction(
    req: CampActionRequest,
    options?: { silent?: boolean; skipRender?: boolean }
  ): Promise<boolean> {
    const silent = options?.silent ?? false;
    const skipRender = options?.skipRender ?? false;
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
          if (!silent && isString(raw.message)) this.showToastSafe(raw.message);
          if (!skipRender) this.renderCamp();
          return true;
        }
      } else {
        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const raw: unknown = await res.json();
          if (isRecord(raw) && isString(raw.message)) {
            if (!silent) this.showToastSafe(raw.message);
            return false;
          }
        }
      }
    } catch {
      // Fallback to local profile storage below
    }

    const localMsg = this.applyCampActionLocally(req);
    if (localMsg) {
      if (!silent) this.showToastSafe(localMsg);
      if (!skipRender) this.renderCamp();
      return true;
    }
    return false;
  }

  private async equipBestGear(): Promise<void> {
    let equippedCount = 0;
    for (const slot of GEAR_SLOTS) {
      const p = this.state.profile;
      const selProg = p.classes[p.selectedClass];
      const currentEquipped = selProg.equipped[slot];
      const currentPower = currentEquipped ? currentEquipped.baseStatBonus : 0;

      let bestCandidate: GearItem | null = null;
      for (const item of p.inventory) {
        if (item.slot !== slot || item.isCursed) continue;
        if (item.baseStatBonus <= currentPower) continue;
        if (!bestCandidate || item.baseStatBonus > bestCandidate.baseStatBonus) {
          bestCandidate = item;
        }
      }

      if (bestCandidate) {
        const ok = await this.sendCampAction(
          { action: 'equip_item', itemId: bestCandidate.id },
          { silent: true, skipRender: true }
        );
        if (ok) {
          equippedCount += 1;
          this.selectedInspectItemId = bestCandidate.id;
        }
      }
    }

    if (equippedCount > 0) {
      soundFX.playRouletteTick();
      this.showToastSafe(
        `Equipped ${equippedCount} upgrade${equippedCount === 1 ? '' : 's'}!`
      );
      this.renderCamp();
    } else {
      this.showToastSafe('Already wearing your strongest gear.');
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
    const todayKey = this.state.daily.dateKey;
    const decree = getDailySectDecree(todayKey);
    const bounty = getDailyMasteryBounty(todayKey);
    const bountyDone = p.loginStreak.dailyBountyCompletedDate === todayKey;
    const chestsClaimedToday =
      p.loginStreak.dailyChestsDate === todayKey ? p.loginStreak.dailyChestsClaimed : [];
    const streakStatus = getLoginStreakStatus(p, todayKey);

    const titleBlock = this.el('div', 'hd-title');
    titleBlock.appendChild(this.el('h1', 'hd-title__main', 'WUXIA SPIRE'));
    titleBlock.appendChild(this.el('div', 'hd-title__sub', 'Tower Roguelite'));

    const loginActionRow = this.el('div', 'home-login-row');
    if (streakStatus.canClaimToday) {
      const claimLabel = streakStatus.isMilestone30
        ? `Daily Login (Day ${streakStatus.nextStreak} · Relic Pick)`
        : streakStatus.isMilestone21
          ? `Daily Login (Day ${streakStatus.nextStreak} · Free Purify)`
          : streakStatus.isMilestone14
            ? `Daily Login (Day ${streakStatus.nextStreak} · 1-of-3 Relic)`
            : streakStatus.nextCycleDay === 7
              ? `Daily Login (Day ${streakStatus.nextStreak} · Legendary)`
              : `Daily Login (Day ${streakStatus.nextStreak})`;
      const loginBtn = this.el('button', 'home-login-btn is-claimable', claimLabel);
      loginBtn.type = 'button';
      loginBtn.addEventListener('click', () => {
        soundFX.playRouletteTick();
        this.openLoginStreakModal();
      });
      loginActionRow.appendChild(loginBtn);
    } else {
      const streakPill = this.el(
        'button',
        'home-login-btn is-claimed',
        `Streak: ${p.loginStreak.currentStreak}d`
      );
      streakPill.type = 'button';
      streakPill.title = 'View 7-Day Login Cycle & Long-Streak Milestones';
      streakPill.addEventListener('click', () => {
        soundFX.playRouletteTick();
        this.openLoginStreakModal();
      });
      loginActionRow.appendChild(streakPill);
    }
    titleBlock.appendChild(loginActionRow);
    wrap.appendChild(titleBlock);

    // Compact Daily Spire Briefing Strip
    const briefing = this.el('div', 'daily-briefing hd-win');

    const decreeRow = this.el('div', 'daily-briefing__row');
    decreeRow.appendChild(this.el('span', 'daily-briefing__tag is-gold', 'Sect Decree'));
    const decreeBody = this.el('div', 'daily-briefing__text');
    decreeBody.appendChild(this.el('strong', 'daily-briefing__name', decree.name));
    decreeBody.appendChild(this.el('span', 'daily-briefing__desc', ` — ${decree.summary}`));
    decreeRow.appendChild(decreeBody);
    briefing.appendChild(decreeRow);

    const bountyRow = this.el('div', 'daily-briefing__row');
    bountyRow.appendChild(this.el('span', 'daily-briefing__tag is-jade', 'Mastery Bounty'));
    const bountyBody = this.el('div', 'daily-briefing__text');
    bountyBody.appendChild(this.el('span', 'daily-briefing__desc', bounty.description));
    bountyRow.appendChild(bountyBody);
    const bountyMeta = this.el('div', 'daily-briefing__meta');
    bountyMeta.appendChild(
      this.el('span', 'daily-briefing__reward', `+${bounty.shardReward} Shards`)
    );
    bountyMeta.appendChild(
      this.el(
        'span',
        `daily-briefing__status ${bountyDone ? 'is-done' : 'is-active'}`,
        bountyDone ? 'Done' : 'Active'
      )
    );
    bountyRow.appendChild(bountyMeta);
    briefing.appendChild(bountyRow);

    const chestRow = this.el('div', 'daily-briefing__row daily-briefing__row--chests');
    chestRow.appendChild(this.el('span', 'daily-briefing__tag', 'Daily Chests'));
    const chestPills = this.el('div', 'daily-chest-pills');
    for (const floor of DAILY_CHEST_FLOORS) {
      const claimed = chestsClaimedToday.includes(floor);
      const pill = this.el(
        'span',
        `daily-chest-pill ${claimed ? 'is-claimed' : ''}`,
        `F${floor}`
      );
      const reward = getDailyChestRewards(floor);
      pill.title = claimed
        ? `Floor ${floor} Daily Chest claimed today`
        : `Reach Floor ${floor} in Daily Run: +${reward.gold}g, +${reward.shards} Shards${reward.legendaryDrop ? ', Pristine Legendary' : reward.rareDrop ? ', Rare Relic' : ''}`;
      chestPills.appendChild(pill);
    }
    chestRow.appendChild(chestPills);
    briefing.appendChild(chestRow);

    wrap.appendChild(briefing);

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
    } else {
      items.push({
        label: 'Daily Completed',
        hint: 'Resets 00:00 UTC',
        isDisabled: true,
        onSelect: () => {},
      });
    }
    const endlessBest = p.loginStreak.endlessBestFloor;
    items.push({
      label: 'Practice Run',
      hint: endlessBest > 0 ? `Endless PB: F${endlessBest}` : 'Endless',
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

  private openLoginStreakModal(): void {
    this.clearModal();
    const p = this.state.profile;
    const todayKey = getUtcDateKey();
    const status = getLoginStreakStatus(p, todayKey);

    const slotLabels: Record<GearSlot, string> = {
      weapon: 'Weapon',
      headgear: 'Crown',
      top: 'Robe',
      cape: 'Mantle',
    };

    const backdrop = this.el('div', 'modal-backdrop');
    const box = this.el('div', 'modal-box login-modal hd-win');

    const header = this.el('div', 'login-modal__head');
    const titleWrap = this.el('div', 'login-modal__title-wrap');
    titleWrap.appendChild(this.el('h2', 'login-modal__title', 'Daily Login Streak'));
    const subText = status.canClaimToday
      ? `Day ${status.nextStreak} Ready · Longest: ${Math.max(p.loginStreak.longestStreak, status.nextStreak)}d`
      : `Current Streak: ${p.loginStreak.currentStreak}d · Longest: ${p.loginStreak.longestStreak}d`;
    titleWrap.appendChild(this.el('div', 'login-modal__sub', subText));
    header.appendChild(titleWrap);

    const closeBtn = this.el('button', 'btn btn-sm', 'Close');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', () => {
      this.clearModal();
    });
    header.appendChild(closeBtn);
    box.appendChild(header);

    // 7-Day Repeating Cycle
    const cycleTitle = this.el('div', 'login-modal__section-label', '7-Day Repeating Cycle');
    box.appendChild(cycleTitle);

    const cycleDays: readonly {
      day: number;
      reward: string;
      highlight?: 'rare' | 'legendary';
    }[] = [
      { day: 1, reward: '250g + 1 Writ' },
      { day: 2, reward: '20 Shards' },
      { day: 3, reward: 'Rare Relic', highlight: 'rare' },
      { day: 4, reward: '400g + 30 Shards' },
      { day: 5, reward: '2 Writs + 1 Core' },
      { day: 6, reward: '600g + 50 Shards' },
      { day: 7, reward: 'Slot-Choice Legendary', highlight: 'legendary' },
    ];

    const completedCycleDays = status.canClaimToday
      ? status.nextCycleDay - 1
      : ((Math.max(1, p.loginStreak.currentStreak) - 1) % 7) + 1;

    const cycleGrid = this.el('div', 'login-cycle-grid');
    for (const d of cycleDays) {
      const isDone = d.day <= completedCycleDays;
      const isToday = status.canClaimToday && d.day === status.nextCycleDay;
      const cardCls = [
        'login-day-card',
        d.highlight === 'rare' ? 'is-rare' : '',
        d.highlight === 'legendary' ? 'is-legendary' : '',
        isDone ? 'is-done' : '',
        isToday ? 'is-today' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const card = this.el('div', cardCls);
      card.appendChild(
        this.el(
          'div',
          'login-day-card__day',
          isDone ? `Day ${d.day} · DONE` : isToday ? `Day ${d.day} · NOW` : `Day ${d.day}`
        )
      );
      card.appendChild(this.el('div', 'login-day-card__reward', d.reward));
      cycleGrid.appendChild(card);
    }
    box.appendChild(cycleGrid);

    // Long-Streak Milestones Strip
    const milestonesWrap = this.el('div', 'login-milestones');
    const milestones: readonly { day: number; label: string; active: boolean }[] = [
      { day: 14, label: 'Day 14: 1-of-3 Slot Pick', active: status.isMilestone14 },
      { day: 21, label: 'Day 21: Free Purify', active: status.isMilestone21 },
      {
        day: 30,
        label: `Day 30: Any of ${LEGENDARY_CATALOG.length} Jin Yong Relics`,
        active: status.isMilestone30,
      },
    ];
    for (const ms of milestones) {
      const reached =
        (!status.canClaimToday && p.loginStreak.currentStreak >= ms.day) ||
        (status.canClaimToday && status.nextStreak > ms.day);
      const pill = this.el(
        'span',
        `login-milestone-pill ${ms.active ? 'is-active' : reached ? 'is-reached' : ''}`,
        ms.label
      );
      milestonesWrap.appendChild(pill);
    }
    box.appendChild(milestonesWrap);

    const graceNote = this.el(
      'div',
      'login-grace-note',
      status.graceWillApply
        ? '1 Free Grace Day/Week applied today — your streak is preserved!'
        : '1 Free Grace Day/Week protects your streak if you miss a day.'
    );
    box.appendChild(graceNote);

    // Interactive Claim Panel
    const claimHost = this.el('div', 'login-claim-panel');
    box.appendChild(claimHost);

    let selectedSlot: GearSlot = 'weapon';
    let selectedLegendaryId: string = '';
    let day30FilterSlot: GearSlot | 'all' = 'all';

    const submitClaim = (chosenSlot?: GearSlot, chosenLegendaryId?: string): void => {
      void (async () => {
        const req: CampActionRequest = {
          action: 'claim_login_reward',
          ...(chosenSlot ? { chosenSlot } : {}),
          ...(chosenLegendaryId ? { chosenLegendaryId } : {}),
        };
        const ok = await this.sendCampAction(req, { skipRender: true });
        if (ok) {
          soundFX.playVictory();
          this.clearModal();
          this.renderCamp();
        }
      })();
    };

    const renderClaimPanel = (): void => {
      claimHost.innerHTML = '';

      if (!status.canClaimToday) {
        const claimedNotice = this.el(
          'div',
          'login-claimed-notice',
          `Day ${p.loginStreak.currentStreak} reward claimed! Return tomorrow for Day ${p.loginStreak.currentStreak + 1}.`
        );
        claimHost.appendChild(claimedNotice);
        return;
      }

      if (status.needsFullSelector) {
        // Day 30: All Jin Yong Legendaries (filterable by slot)
        claimHost.appendChild(
          this.el(
            'div',
            'login-picker-title',
            `Day 30 Grandmaster Milestone — Choose Any of the ${LEGENDARY_CATALOG.length} Jin Yong Relics (+60 Shards)`
          )
        );

        const filterRow = this.el('div', 'login-slot-pills');
        const filterOpts: readonly { key: GearSlot | 'all'; label: string }[] = [
          { key: 'all', label: `All (${LEGENDARY_CATALOG.length})` },
          { key: 'weapon', label: 'Weapon' },
          { key: 'headgear', label: 'Crown' },
          { key: 'top', label: 'Robe' },
          { key: 'cape', label: 'Mantle' },
        ];
        for (const opt of filterOpts) {
          const btn = this.el(
            'button',
            `equip-filter-pill ${day30FilterSlot === opt.key ? 'is-active' : ''}`,
            opt.label
          );
          btn.type = 'button';
          btn.addEventListener('click', () => {
            soundFX.playRouletteTick();
            day30FilterSlot = opt.key;
            renderClaimPanel();
          });
          filterRow.appendChild(btn);
        }
        claimHost.appendChild(filterRow);

        const pool =
          day30FilterSlot === 'all'
            ? LEGENDARY_CATALOG
            : LEGENDARY_CATALOG.filter((l) => l.slot === day30FilterSlot);
        if (!selectedLegendaryId || !pool.some((l) => l.id === selectedLegendaryId)) {
          selectedLegendaryId = pool[0]?.id ?? LEGENDARY_CATALOG[0]?.id ?? '';
        }

        const grid = this.el('div', 'login-relic-grid');
        for (const leg of pool) {
          const isSel = leg.id === selectedLegendaryId;
          const card = this.el('button', `login-relic-card ${isSel ? 'is-selected' : ''}`);
          card.type = 'button';
          const topRow = this.el('div', 'login-relic-card__top');
          topRow.appendChild(this.el('strong', 'login-relic-card__name', leg.name));
          topRow.appendChild(this.el('span', 'pill', slotLabels[leg.slot]));
          card.appendChild(topRow);
          card.appendChild(this.el('div', 'login-relic-card__desc', leg.signatureText));
          card.addEventListener('click', () => {
            soundFX.playRouletteTick();
            selectedLegendaryId = leg.id;
            renderClaimPanel();
          });
          grid.appendChild(card);
        }
        claimHost.appendChild(grid);

        const picked = getLegendaryById(selectedLegendaryId);
        const claimBtn = this.el(
          'button',
          'btn btn-gold login-claim-btn',
          picked ? `Claim Pristine ${picked.name}` : 'Claim Pristine Relic'
        );
        claimBtn.type = 'button';
        claimBtn.disabled = !picked;
        claimBtn.addEventListener('click', () => {
          if (!picked) return;
          claimBtn.disabled = true;
          submitClaim(picked.slot, picked.id);
        });
        claimHost.appendChild(claimBtn);
        return;
      }

      if (status.needsDay14Choice) {
        // Day 14: Pick Slot -> 3 deterministic Jin Yong Legendaries
        claimHost.appendChild(
          this.el(
            'div',
            'login-picker-title',
            'Day 14 Milestone — Select a Slot, then Pick 1 of 3 Pristine Relics (+2 Boss Cores)'
          )
        );

        const slotRow = this.el('div', 'login-slot-pills');
        for (const slot of GEAR_SLOTS) {
          const btn = this.el(
            'button',
            `equip-filter-pill ${selectedSlot === slot ? 'is-active' : ''}`,
            slotLabels[slot]
          );
          btn.type = 'button';
          btn.addEventListener('click', () => {
            soundFX.playRouletteTick();
            selectedSlot = slot;
            selectedLegendaryId = '';
            renderClaimPanel();
          });
          slotRow.appendChild(btn);
        }
        claimHost.appendChild(slotRow);

        const choices = getDay14SlotLegendaryChoices(selectedSlot, todayKey);
        if (!selectedLegendaryId || !choices.some((c) => c.id === selectedLegendaryId)) {
          selectedLegendaryId = choices[0]?.id ?? '';
        }

        const choicesGrid = this.el('div', 'login-day14-grid');
        for (const leg of choices) {
          const isSel = leg.id === selectedLegendaryId;
          const card = this.el('button', `login-relic-card ${isSel ? 'is-selected' : ''}`);
          card.type = 'button';
          const topRow = this.el('div', 'login-relic-card__top');
          topRow.appendChild(this.el('strong', 'login-relic-card__name', leg.name));
          topRow.appendChild(this.el('span', 'pill pill-gold', slotLabels[leg.slot]));
          card.appendChild(topRow);
          card.appendChild(this.el('div', 'login-relic-card__desc', leg.signatureText));
          card.addEventListener('click', () => {
            soundFX.playRouletteTick();
            selectedLegendaryId = leg.id;
            renderClaimPanel();
          });
          choicesGrid.appendChild(card);
        }
        claimHost.appendChild(choicesGrid);

        const picked = choices.find((c) => c.id === selectedLegendaryId) ?? choices[0];
        const claimBtn = this.el(
          'button',
          'btn btn-gold login-claim-btn',
          picked ? `Claim Pristine ${picked.name}` : 'Claim Pristine Legendary'
        );
        claimBtn.type = 'button';
        claimBtn.disabled = !picked;
        claimBtn.addEventListener('click', () => {
          if (!picked) return;
          claimBtn.disabled = true;
          submitClaim(selectedSlot, picked.id);
        });
        claimHost.appendChild(claimBtn);
        return;
      }

      if (status.needsSlotChoice) {
        // Day 7: 4-slot picker -> Claim Pristine Legendary
        claimHost.appendChild(
          this.el(
            'div',
            'login-picker-title',
            'Day 7 Reward — Choose Your Legendary Slot (Pristine Relic)'
          )
        );

        const slotRow = this.el('div', 'login-slot-pills');
        for (const slot of GEAR_SLOTS) {
          const btn = this.el(
            'button',
            `equip-filter-pill ${selectedSlot === slot ? 'is-active' : ''}`,
            slotLabels[slot]
          );
          btn.type = 'button';
          btn.addEventListener('click', () => {
            soundFX.playRouletteTick();
            selectedSlot = slot;
            renderClaimPanel();
          });
          slotRow.appendChild(btn);
        }
        claimHost.appendChild(slotRow);

        const claimBtn = this.el(
          'button',
          'btn btn-gold login-claim-btn',
          `Claim Pristine ${slotLabels[selectedSlot]} Legendary`
        );
        claimBtn.type = 'button';
        claimBtn.addEventListener('click', () => {
          claimBtn.disabled = true;
          submitClaim(selectedSlot);
        });
        claimHost.appendChild(claimBtn);
        return;
      }

      // Normal Days 1-6 & Day 21
      const btnLabel = status.isMilestone21
        ? 'Claim Day 21 Reward (Free Purify / +80 Shards)'
        : `Claim Day ${status.nextStreak} Reward`;
      const claimBtn = this.el('button', 'btn btn-gold login-claim-btn', btnLabel);
      claimBtn.type = 'button';
      claimBtn.addEventListener('click', () => {
        claimBtn.disabled = true;
        submitClaim();
      });
      claimHost.appendChild(claimBtn);
    };

    renderClaimPanel();

    backdrop.addEventListener('click', (e: MouseEvent) => {
      if (e.target === backdrop) {
        this.clearModal();
      }
    });
    backdrop.appendChild(box);
    this.root.appendChild(backdrop);
    this.activeModal = backdrop;
  }

  private renderRosterTab(container: HTMLElement): void {
    const p = this.state.profile;
    const selId = p.selectedClass;
    const selProg = p.classes[selId];
    const selJob = getJobAdvancementTitle(selProg.level);
    const nextExp = expForNextLevel(selProg.level);
    const expPct = Math.max(0, Math.min(100, Math.round((selProg.exp / Math.max(1, nextExp)) * 100)));
    const stats = computeHeroCombatStats(p, selId, [], 0, 0);

    const slotLabels: Record<GearSlot, string> = {
      weapon: 'Weapon',
      headgear: 'Crown',
      top: 'Robe',
      cape: 'Mantle',
    };
    const slotCodes: Record<GearSlot, string> = {
      weapon: 'WEP',
      headgear: 'CRN',
      top: 'RBE',
      cape: 'MNT',
    };
    const tierOrder: Record<GearItem['tier'], number> = {
      legendary: 3,
      rare: 2,
      normal: 1,
    };

    const getItemDisplayName = (item: GearItem): string => {
      if (item.slot === 'weapon' && item.id.startsWith('starter_wep_')) {
        return 'Taiji Fist';
      }
      const leg = item.legendaryId ? getLegendaryById(item.legendaryId) : null;
      return leg ? leg.name : item.name;
    };

    const getItemDisplayAffix = (item: GearItem): string => {
      const leg = item.legendaryId ? getLegendaryById(item.legendaryId) : null;
      return leg ? leg.signatureText : item.affixText;
    };

    // Resolve currently inspected item (from equipped slots or bag)
    let inspectedItem: GearItem | null = null;
    let inspectedSource: 'equipped' | 'bag' | null = null;
    if (this.selectedInspectItemId) {
      for (const slot of GEAR_SLOTS) {
        const eq = selProg.equipped[slot];
        if (eq && eq.id === this.selectedInspectItemId) {
          inspectedItem = eq;
          inspectedSource = 'equipped';
          break;
        }
      }
      if (!inspectedItem) {
        const bagMatch = p.inventory.find((i) => i.id === this.selectedInspectItemId);
        if (bagMatch) {
          inspectedItem = bagMatch;
          inspectedSource = 'bag';
        }
      }
      if (!inspectedItem) {
        this.selectedInspectItemId = null;
      }
    }

    const screen = this.el('div', 'equip-screen');

    // ==================== A. SYMMETRICAL 4-SLOT HERO STAGE ====================
    const stage = this.el('div', 'equip-stage');

    const buildEquippedTile = (slot: GearSlot): HTMLButtonElement => {
      const item = selProg.equipped[slot];
      const slotLvl = selProg.slotLevels[slot];
      const isFiltered = this.equipSlotFilter === slot;
      const isSelected = Boolean(item && this.selectedInspectItemId === item.id);
      const tileClasses = [
        'equip-slot-tile',
        item ? `tier-${item.tier}` : 'is-empty',
        item?.isCursed ? 'is-cursed' : '',
        isFiltered ? 'is-filtered' : '',
        isSelected ? 'is-selected' : '',
      ]
        .filter(Boolean)
        .join(' ');

      const tile = this.el('button', tileClasses);
      tile.type = 'button';
      tile.title = `Filter ${slotLabels[slot]} relics${item ? ` & inspect ${getItemDisplayName(item)}` : ''}`;

      const topRow = this.el('div', 'equip-slot-tile__top');
      topRow.appendChild(this.el('span', 'equip-slot-tile__slot', slotLabels[slot]));
      if (slotLvl > 0) {
        topRow.appendChild(this.el('span', 'equip-slot-tile__temper', `+${slotLvl * 10}%`));
      }
      tile.appendChild(topRow);

      const nameText = item ? getItemDisplayName(item) : 'Empty';
      tile.appendChild(this.el('div', 'equip-slot-tile__name', nameText));

      const pwrText = item ? `PWR ${item.baseStatBonus}` : 'EMPTY';
      tile.appendChild(
        this.el('div', `equip-slot-tile__pwr ${item ? '' : 'is-empty'}`, pwrText)
      );

      tile.addEventListener('click', () => {
        soundFX.playRouletteTick();
        this.equipSlotFilter = this.equipSlotFilter === slot ? 'all' : slot;
        this.selectedInspectItemId = item ? item.id : null;
        this.renderCamp();
      });

      return tile;
    };

    const leftCol = this.el('div', 'equip-stage__col');
    leftCol.appendChild(buildEquippedTile('weapon'));
    leftCol.appendChild(buildEquippedTile('headgear'));
    stage.appendChild(leftCol);

    const centerCol = this.el('div', 'equip-stage__center');
    const stageCanvas = document.createElement('canvas');
    stageCanvas.width = 96;
    stageCanvas.height = 96;
    stageCanvas.className = 'equip-stage__canvas';
    renderHeroPaperdollCanvas(stageCanvas, selId, selProg.equipped);
    centerCol.appendChild(stageCanvas);

    centerCol.appendChild(
      this.el('div', 'equip-stage__title', `Wanderer Lv.${selProg.level} · ${selJob.title}`)
    );

    const xpWrap = this.el('div', 'equip-xp-wrap');
    xpWrap.title = `${selProg.exp} / ${nextExp} EXP`;
    const xpTrack = this.el('div', 'equip-xp-bar');
    const xpFill = this.el('div', 'equip-xp-bar__fill');
    xpFill.style.width = `${expPct}%`;
    xpTrack.appendChild(xpFill);
    xpWrap.appendChild(xpTrack);
    xpWrap.appendChild(this.el('span', 'equip-xp-label', `${selProg.exp}/${nextExp} XP`));
    centerCol.appendChild(xpWrap);

    const statStrip = this.el('div', 'equip-stat-strip');
    const statItems: readonly { label: string; value: string }[] = [
      { label: 'HP', value: String(stats.maxHp) },
      { label: 'ATK', value: String(stats.atk) },
      { label: 'SPD', value: `${stats.attackSpeed}/s` },
      { label: 'ARM', value: String(stats.armor) },
      { label: 'CRIT', value: `${Math.round(stats.critRate * 100)}%` },
      { label: 'EVA', value: `${Math.round(stats.dodgeRate * 100)}%` },
    ];
    for (const s of statItems) {
      const cell = this.el('span', 'equip-stat-chip');
      cell.appendChild(this.el('span', 'equip-stat-chip__k', s.label));
      cell.appendChild(this.el('span', 'equip-stat-chip__v', s.value));
      statStrip.appendChild(cell);
    }
    centerCol.appendChild(statStrip);
    stage.appendChild(centerCol);

    const rightCol = this.el('div', 'equip-stage__col');
    rightCol.appendChild(buildEquippedTile('top'));
    rightCol.appendChild(buildEquippedTile('cape'));
    stage.appendChild(rightCol);

    screen.appendChild(stage);

    // ==================== B. INLINE COMPARISON / INSPECTOR CARD ====================
    if (!inspectedItem || !inspectedSource) {
      const emptyInsp = this.el('div', 'equip-inspector equip-inspector--empty');
      emptyInsp.appendChild(
        this.el('span', 'equip-inspector__hint', 'Select any gear tile below to inspect & compare')
      );
      screen.appendChild(emptyInsp);
    } else {
      const item = inspectedItem;
      const leg = item.legendaryId ? getLegendaryById(item.legendaryId) : null;
      const inspector = this.el(
        'div',
        `equip-inspector tier-${item.tier} ${item.isCursed ? 'is-cursed' : ''}`
      );

      const infoCol = this.el('div', 'equip-inspector__info');

      const headRow = this.el('div', 'equip-inspector__head');
      headRow.appendChild(this.el('strong', 'equip-inspector__name', getItemDisplayName(item)));
      const tierPillClass =
        item.tier === 'legendary'
          ? 'pill pill-gold'
          : item.tier === 'rare'
            ? 'pill pill-shard'
            : 'pill';
      headRow.appendChild(this.el('span', tierPillClass, item.tier.toUpperCase()));
      headRow.appendChild(this.el('span', 'pill', slotLabels[item.slot]));
      if (item.isCursed) {
        headRow.appendChild(this.el('span', 'pill pill-core', 'CURSED'));
      }
      infoCol.appendChild(headRow);

      const powerRow = this.el('div', 'equip-inspector__power');
      powerRow.appendChild(
        this.el('span', 'equip-inspector__pwr-val', `PWR ${item.baseStatBonus} · Lv.${item.level}`)
      );

      if (inspectedSource === 'bag') {
        const equippedInSlot = selProg.equipped[item.slot];
        const delta = item.baseStatBonus - (equippedInSlot?.baseStatBonus ?? 0);
        if (delta > 0) {
          powerRow.appendChild(this.el('span', 'equip-delta equip-delta--up', `▲ +${delta} PWR`));
        } else if (delta < 0) {
          powerRow.appendChild(this.el('span', 'equip-delta equip-delta--down', `▼ ${delta} PWR`));
        } else {
          powerRow.appendChild(this.el('span', 'equip-delta equip-delta--same', '= Same PWR'));
        }
      } else {
        const slotLvl = selProg.slotLevels[item.slot];
        powerRow.appendChild(
          this.el(
            'span',
            'equip-delta equip-delta--same',
            slotLvl > 0 ? `Equipped (+${slotLvl * 10}% Forge)` : 'Equipped'
          )
        );
      }
      infoCol.appendChild(powerRow);

      const affixText = getItemDisplayAffix(item);
      const affixLine = this.el('div', 'equip-inspector__affix');
      if (affixText) {
        affixLine.appendChild(this.buildHighlightedText(affixText));
      } else {
        affixLine.textContent = 'Standard martial relic.';
      }
      if (item.isCursed && leg) {
        affixLine.appendChild(
          this.el(
            'span',
            'equip-inspector__curse',
            ` · Curse (${leg.cursedName}): ${leg.cursedText}`
          )
        );
      }
      infoCol.appendChild(affixLine);
      inspector.appendChild(infoCol);

      const actionsCol = this.el('div', 'equip-inspector__actions');
      if (inspectedSource === 'bag') {
        if (item.isCursed) {
          const equipCursedBtn = this.el('button', 'btn btn-sm btn-warn', 'Equip (Cursed)');
          equipCursedBtn.type = 'button';
          equipCursedBtn.title =
            'Equip this cursed relic now (curse drawback remains active until purified)';
          equipCursedBtn.addEventListener('click', () => {
            void this.sendCampAction({ action: 'equip_item', itemId: item.id });
          });
          actionsCol.appendChild(equipCursedBtn);

          const purifyNavBtn = this.el('button', 'btn btn-sm btn-purple', 'Purify in Upgrades');
          purifyNavBtn.type = 'button';
          purifyNavBtn.addEventListener('click', () => {
            this.openCampTab('buildings');
          });
          actionsCol.appendChild(purifyNavBtn);
        } else {
          const equipBtn = this.el('button', 'btn btn-sm btn-primary', 'Equip');
          equipBtn.type = 'button';
          equipBtn.addEventListener('click', () => {
            void this.sendCampAction({ action: 'equip_item', itemId: item.id });
          });
          actionsCol.appendChild(equipBtn);
        }

        const shardVal = getDismantleShardValue(item);
        const dismantleBtn = this.el(
          'button',
          'btn btn-sm',
          `Dismantle (+${shardVal} Shards)`
        );
        dismantleBtn.type = 'button';
        dismantleBtn.addEventListener('click', () => {
          this.selectedInspectItemId = null;
          void this.sendCampAction({ action: 'dismantle_item', itemId: item.id });
        });
        actionsCol.appendChild(dismantleBtn);
      } else {
        const eqBadgeBtn = this.el('button', 'btn btn-sm', 'Equipped');
        eqBadgeBtn.type = 'button';
        eqBadgeBtn.disabled = true;
        eqBadgeBtn.title = 'Select a bag item to swap into this slot';
        actionsCol.appendChild(eqBadgeBtn);

        if (item.isCursed) {
          const purifyNavBtn = this.el('button', 'btn btn-sm btn-purple', 'Purify in Upgrades');
          purifyNavBtn.type = 'button';
          purifyNavBtn.addEventListener('click', () => {
            this.openCampTab('buildings');
          });
          actionsCol.appendChild(purifyNavBtn);
        }
      }
      inspector.appendChild(actionsCol);
      screen.appendChild(inspector);
    }

    // ==================== C. FILTER & QUICK-ACTION BAR ====================
    const filterBar = this.el('div', 'equip-filter-bar');

    const pillsWrap = this.el('div', 'equip-filter-pills');
    const slotCounts: Record<GearSlot | 'all', number> = {
      all: p.inventory.length,
      weapon: 0,
      headgear: 0,
      top: 0,
      cape: 0,
    };
    let normalCount = 0;
    let rareCount = 0;
    for (const bagItem of p.inventory) {
      slotCounts[bagItem.slot] += 1;
      if (bagItem.tier === 'normal') normalCount += 1;
      else if (bagItem.tier === 'rare') rareCount += 1;
    }

    const filterOptions: readonly { key: GearSlot | 'all'; label: string }[] = [
      { key: 'all', label: 'All' },
      { key: 'weapon', label: 'Weapon' },
      { key: 'headgear', label: 'Crown' },
      { key: 'top', label: 'Robe' },
      { key: 'cape', label: 'Mantle' },
    ];
    for (const opt of filterOptions) {
      const isActive = this.equipSlotFilter === opt.key;
      const pillBtn = this.el(
        'button',
        `equip-filter-pill ${isActive ? 'is-active' : ''}`,
        `${opt.label} (${slotCounts[opt.key]})`
      );
      pillBtn.type = 'button';
      pillBtn.addEventListener('click', () => {
        soundFX.playRouletteTick();
        this.equipSlotFilter = opt.key;
        this.renderCamp();
      });
      pillsWrap.appendChild(pillBtn);
    }
    filterBar.appendChild(pillsWrap);

    const quickActions = this.el('div', 'equip-quick-actions');
    const equipBestBtn = this.el('button', 'btn btn-sm btn-gold', 'Equip Best');
    equipBestBtn.type = 'button';
    equipBestBtn.title = 'Equip highest-power non-cursed upgrades in every slot';
    equipBestBtn.addEventListener('click', () => {
      void this.equipBestGear();
    });
    quickActions.appendChild(equipBestBtn);

    if (normalCount > 0 || rareCount > 0) {
      const dismantleLabel = rareCount > 0 ? 'Dismantle Normal/Rare' : 'Dismantle Normals';
      const bulkBtn = this.el('button', 'btn btn-sm', dismantleLabel);
      bulkBtn.type = 'button';
      bulkBtn.title = 'Dismantle all Normal and Rare relics in your bag for Shards';
      bulkBtn.addEventListener('click', () => {
        this.selectedInspectItemId = null;
        void this.sendCampAction({ action: 'dismantle_all_normal_rare' });
      });
      quickActions.appendChild(bulkBtn);
    }

    filterBar.appendChild(quickActions);
    screen.appendChild(filterBar);

    // ==================== D. COMPACT ICON-TILE BAG GRID ====================
    const filteredBag = p.inventory
      .filter((item) => this.equipSlotFilter === 'all' || item.slot === this.equipSlotFilter)
      .sort((a, b) => {
        const tierDiff = tierOrder[b.tier] - tierOrder[a.tier];
        if (tierDiff !== 0) return tierDiff;
        const pwrDiff = b.baseStatBonus - a.baseStatBonus;
        if (pwrDiff !== 0) return pwrDiff;
        return b.level - a.level;
      });

    if (filteredBag.length === 0) {
      const emptyHost = this.el('div', 'astryx-block-slot');
      mountHdEmpty(emptyHost, {
        title:
          p.inventory.length === 0
            ? 'Relic Bag Empty'
            : `No ${this.equipSlotFilter === 'all' ? '' : `${slotLabels[this.equipSlotFilter]} `}Relics`,
        description:
          p.inventory.length === 0
            ? 'Ascend the Spire to recover Normal, Rare, and Legendary Sect Relics.'
            : 'Switch filter to All or ascend the Spire to find more gear.',
      });
      screen.appendChild(emptyHost);
    } else {
      const grid = this.el('div', 'equip-bag-grid');
      for (const item of filteredBag) {
        const equippedInSlot = selProg.equipped[item.slot];
        const isUpgrade =
          !item.isCursed && item.baseStatBonus > (equippedInSlot?.baseStatBonus ?? 0);
        const isSelected = this.selectedInspectItemId === item.id;
        const tileClasses = [
          'equip-tile',
          `tier-${item.tier}`,
          item.isCursed ? 'is-cursed' : '',
          isUpgrade ? 'is-upgrade' : '',
          isSelected ? 'is-selected' : '',
        ]
          .filter(Boolean)
          .join(' ');

        const tile = this.el('button', tileClasses);
        tile.type = 'button';
        tile.title = `${getItemDisplayName(item)} · PWR ${item.baseStatBonus}${item.isCursed ? ' (Cursed · Double-click to equip)' : ' (Double-click to equip)'}`;

        const top = this.el('div', 'equip-tile__top');
        top.appendChild(this.el('span', 'equip-tile__slot', slotCodes[item.slot]));
        if (item.isCursed) {
          top.appendChild(this.el('span', 'equip-tile__curse', 'CURSE'));
        } else if (isUpgrade) {
          top.appendChild(this.el('span', 'equip-tile__up', '▲'));
        }
        tile.appendChild(top);

        tile.appendChild(this.el('div', 'equip-tile__name', getItemDisplayName(item)));
        tile.appendChild(this.el('div', 'equip-tile__pwr', `PWR ${item.baseStatBonus}`));

        tile.addEventListener('click', () => {
          soundFX.playRouletteTick();
          this.selectedInspectItemId = item.id;
          this.renderCamp();
        });

        tile.addEventListener('dblclick', () => {
          void this.sendCampAction({ action: 'equip_item', itemId: item.id });
        });

        grid.appendChild(tile);
      }
      screen.appendChild(grid);
    }

    container.appendChild(screen);
  }

  private renderBuildingsTab(container: HTMLElement): void {
    const p = this.state.profile;
    const screen = this.el('div', 'upgrades-screen');

    // ==================== SECTION 1: PERMANENT PASSIVE STATS (GOLD) ====================
    const statsSection = this.el('section', 'upgrades-section');
    const statsHead = this.el('div', 'upgrades-section__head');
    statsHead.appendChild(
      this.el('h2', 'upgrades-section__title', 'Permanent Passive Stats (Gold)')
    );
    statsHead.appendChild(
      this.el('span', 'upgrades-section__currency is-gold', `${p.gold.toLocaleString()}g`)
    );
    statsSection.appendChild(statsHead);

    const statDefs: readonly {
      key: LegionStatKey;
      name: string;
      perLevel: string;
      formatTotal: (lvl: number) => string;
    }[] = [
      {
        key: 'atk',
        name: 'Attack',
        perLevel: '+4%',
        formatTotal: (lvl) => `+${lvl * 4}% ATK`,
      },
      {
        key: 'hp',
        name: 'Vitality',
        perLevel: '+5% HP',
        formatTotal: (lvl) => `+${lvl * 5}% HP`,
      },
      {
        key: 'armor',
        name: 'Iron Body',
        perLevel: '+5 ARM',
        formatTotal: (lvl) => `+${lvl * 5} ARM`,
      },
      {
        key: 'critRate',
        name: 'Precision',
        perLevel: '+1.5% Crit',
        formatTotal: (lvl) => `+${(lvl * 1.5).toFixed(1)}% Crit`,
      },
      {
        key: 'critDmg',
        name: 'Lethality',
        perLevel: '+8% Crit DMG',
        formatTotal: (lvl) => `+${lvl * 8}% Crit DMG`,
      },
      {
        key: 'dodge',
        name: 'Qinggong',
        perLevel: '+1.5% Dodge',
        formatTotal: (lvl) => `+${(lvl * 1.5).toFixed(1)}% Dodge`,
      },
      {
        key: 'cdr',
        name: 'Qi Flow',
        perLevel: '+2% Haste',
        formatTotal: (lvl) => `+${lvl * 2}% Haste`,
      },
      {
        key: 'gold',
        name: 'Fortune',
        perLevel: '+6% Gold',
        formatTotal: (lvl) => `+${lvl * 6}% Gold`,
      },
    ];

    const statsGrid = this.el('div', 'upgrades-stat-grid');
    for (const st of statDefs) {
      const lvl = p.legion[st.key];
      const cost = getLegionUpgradeCost(lvl);
      const canAfford = p.gold >= cost;

      const card = this.el('div', `upgrade-card ${canAfford ? 'is-affordable' : ''}`);
      const topRow = this.el('div', 'upgrade-card__top');
      topRow.appendChild(this.el('strong', 'upgrade-card__name', st.name));
      topRow.appendChild(this.el('span', 'upgrade-card__lvl', `Lv.${lvl}`));
      card.appendChild(topRow);

      const bonusRow = this.el('div', 'upgrade-card__meta');
      bonusRow.appendChild(this.el('span', 'upgrade-card__rate', st.perLevel));
      bonusRow.appendChild(this.el('span', 'upgrade-card__total', st.formatTotal(lvl)));
      card.appendChild(bonusRow);

      const upBtn = this.el('button', 'btn btn-sm btn-gold upgrade-card__btn', `Upgrade (${cost}g)`);
      upBtn.type = 'button';
      upBtn.disabled = !canAfford;
      upBtn.addEventListener('click', () => {
        soundFX.playRouletteTick();
        void this.sendCampAction({ action: 'upgrade_legion', stat: st.key });
      });
      card.appendChild(upBtn);

      statsGrid.appendChild(card);
    }
    statsSection.appendChild(statsGrid);
    screen.appendChild(statsSection);

    // ==================== SECTION 2: GEAR SLOT TEMPERING (SPIRIT SHARDS) ====================
    const temperSection = this.el('section', 'upgrades-section');
    const temperHead = this.el('div', 'upgrades-section__head');
    temperHead.appendChild(
      this.el('h2', 'upgrades-section__title', 'Gear Slot Tempering (Spirit Shards)')
    );

    const autoToggle = this.el(
      'button',
      `upgrades-toggle ${p.autoDismantleNormal ? 'is-on' : ''}`,
      `Auto-Dismantle Normals: ${p.autoDismantleNormal ? 'ON' : 'OFF'}`
    );
    autoToggle.type = 'button';
    autoToggle.title = 'Automatically dismantle Normal gear drops into Spirit Shards after runs';
    autoToggle.addEventListener('click', () => {
      soundFX.playRouletteTick();
      void this.sendCampAction({ action: 'toggle_auto_dismantle' });
    });
    temperHead.appendChild(autoToggle);
    temperSection.appendChild(temperHead);

    const slotLabels: Record<GearSlot, string> = {
      weapon: 'Weapon',
      headgear: 'Crown',
      top: 'Robe',
      cape: 'Mantle',
    };
    const clsProg = p.classes[p.selectedClass];
    const temperGrid = this.el('div', 'upgrades-slot-grid');
    for (const slot of GEAR_SLOTS) {
      const lvl = clsProg.slotLevels[slot];
      const cost = getSlotUpgradeCost(lvl);
      const canAfford = p.shards >= cost.shards;

      const card = this.el(
        'div',
        `upgrade-card upgrade-card--slot ${canAfford ? 'is-affordable' : ''}`
      );
      const topRow = this.el('div', 'upgrade-card__top');
      topRow.appendChild(this.el('strong', 'upgrade-card__name', slotLabels[slot]));
      topRow.appendChild(this.el('span', 'upgrade-card__lvl', `Lv.${lvl}`));
      card.appendChild(topRow);

      const bonusRow = this.el('div', 'upgrade-card__meta');
      bonusRow.appendChild(this.el('span', 'upgrade-card__rate', '+10% / Lv'));
      bonusRow.appendChild(
        this.el('span', 'upgrade-card__total is-jade', `+${lvl * 10}% Power`)
      );
      card.appendChild(bonusRow);

      const temperBtn = this.el(
        'button',
        'btn btn-sm btn-primary upgrade-card__btn',
        `Temper (${cost.shards} Shards)`
      );
      temperBtn.type = 'button';
      temperBtn.disabled = !canAfford;
      temperBtn.addEventListener('click', () => {
        soundFX.playRouletteTick();
        void this.sendCampAction({
          action: 'upgrade_slot',
          classId: p.selectedClass,
          slot,
        });
      });
      card.appendChild(temperBtn);

      temperGrid.appendChild(card);
    }
    temperSection.appendChild(temperGrid);
    screen.appendChild(temperSection);

    // ==================== CONDITIONAL SECTION 3: PURIFY CURSED RELICS ====================
    const seenCursed = new Set<string>();
    const cursedItems: GearItem[] = [];
    for (const item of p.inventory) {
      if (item.isCursed && !seenCursed.has(item.id)) {
        seenCursed.add(item.id);
        cursedItems.push(item);
      }
    }
    for (const clsDef of CLASS_CATALOG) {
      const eq = p.classes[clsDef.id].equipped;
      for (const slot of GEAR_SLOTS) {
        const it = eq[slot];
        if (it?.isCursed && !seenCursed.has(it.id)) {
          seenCursed.add(it.id);
          cursedItems.push(it);
        }
      }
    }

    if (cursedItems.length > 0) {
      const purifySection = this.el('section', 'upgrades-section upgrades-section--purify');
      const purifyHead = this.el('div', 'upgrades-section__head');
      purifyHead.appendChild(
        this.el(
          'h2',
          'upgrades-section__title',
          `Purify Cursed Relics (${cursedItems.length})`
        )
      );
      purifyHead.appendChild(
        this.el(
          'span',
          'upgrades-section__currency is-violet',
          `Cost: ${SANCTUM_PURIFY_COST.shards} Shards + ${SANCTUM_PURIFY_COST.bossCores} Cores`
        )
      );
      purifySection.appendChild(purifyHead);

      const purifyList = this.el('div', 'upgrades-purify-list');
      const canPurify =
        p.shards >= SANCTUM_PURIFY_COST.shards && p.bossCores >= SANCTUM_PURIFY_COST.bossCores;
      for (const item of cursedItems) {
        const leg = getLegendaryById(item.legendaryId);
        const row = this.el('div', 'gear-item tier-legendary cursed-tag upgrades-purify-row');
        const info = this.el('div', 'upgrades-purify-row__info');
        info.appendChild(this.el('strong', '', leg ? leg.name : item.name));
        if (leg) {
          info.appendChild(
            this.el('div', 'muted', `Curse (${leg.cursedName}): ${leg.cursedText}`)
          );
        }
        row.appendChild(info);

        const purBtn = this.el(
          'button',
          'btn btn-sm btn-purple',
          `Purify (${SANCTUM_PURIFY_COST.shards} Shards, ${SANCTUM_PURIFY_COST.bossCores} Cores)`
        );
        purBtn.type = 'button';
        purBtn.disabled = !canPurify;
        purBtn.addEventListener('click', () => {
          soundFX.playVictory();
          void this.sendCampAction({ action: 'purify_legendary', itemId: item.id });
        });
        row.appendChild(purBtn);
        purifyList.appendChild(row);
      }
      purifySection.appendChild(purifyList);
      screen.appendChild(purifySection);
    }

    container.appendChild(screen);
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
    this.bankedRerolls =
      2 + (actualMode === 'daily' ? getDailySectDecree(getUtcDateKey()).extraFloor1Reroll : 0);
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
    this.utilityMenuOpen = false;

    // Wuxia Ink Minimalist HUD: Floating Corners, Zero Heavy Boxes
    const top = this.el('div', 'hud-ink-top');
    top.id = 'hud-top';

    // Top-Left: Frameless Floating Floor/Wave & Currency Readout
    const topLeft = this.el('div', 'hud-ink-topleft');
    const floorLbl = this.el('div', 'hud-ink-floor', 'F1 · WAVE 1');
    floorLbl.id = 'hud-floor';
    const lootTxt = this.el('div', 'hud-ink-loot', '0g · 0s');
    lootTxt.id = 'hud-loot';
    topLeft.appendChild(floorLbl);
    topLeft.appendChild(lootTxt);
    top.appendChild(topLeft);

    // Top-Center: Frameless Boss HP Bar (hidden until boss spawns)
    const bossBox = this.el('div', 'hud-ink-boss');
    bossBox.id = 'hud-boss-box';
    bossBox.style.display = 'none';
    const bossName = this.el('div', 'hud-ink-boss-name', 'BOSS');
    bossName.id = 'hud-boss-name';
    const bossTrack = this.el('div', 'hud-ink-bar-track hud-ink-bar-track--boss');
    const bossFill = this.el('div', 'hud-ink-bar-fill hud-ink-bar-fill--boss');
    bossFill.id = 'hud-boss-fill';
    bossTrack.appendChild(bossFill);
    const bossSub = this.el('div', 'hud-ink-boss-sub', '');
    bossSub.id = 'hud-boss-sub';
    bossBox.appendChild(bossName);
    bossBox.appendChild(bossTrack);
    bossBox.appendChild(bossSub);
    top.appendChild(bossBox);

    // Top-Right: Compact Speed Pill + Utility Menu Popover
    const topRight = this.el('div', 'hud-ink-topright');

    const spdBtn = this.el('button', 'hud-ink-pill', '1x');
    spdBtn.id = 'hud-spd-btn';
    spdBtn.setAttribute('type', 'button');
    spdBtn.title = 'Toggle combat speed';
    spdBtn.addEventListener('click', () => {
      const next = this.bridge?.toggleSpeed() ?? 1;
      spdBtn.textContent = `${next}x`;
      spdBtn.classList.toggle('hud-ink-pill--active', next > 1);
    });
    topRight.appendChild(spdBtn);

    const menuWrap = this.el('div', 'hud-menu-wrap');
    menuWrap.id = 'hud-menu-wrap';

    const menuBtn = this.el('button', 'hud-ink-pill hud-ink-pill--menu', '≡');
    menuBtn.id = 'hud-menu-btn';
    menuBtn.setAttribute('type', 'button');
    menuBtn.setAttribute('aria-label', 'Run options menu');
    menuBtn.setAttribute('aria-haspopup', 'menu');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.title = 'Options (Auto, Audio, Retreat)';
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleUtilityMenu();
    });
    menuWrap.appendChild(menuBtn);

    const popover = this.el('div', 'hud-utility-popover hidden');
    popover.id = 'hud-utility-popover';
    popover.setAttribute('role', 'menu');
    popover.style.display = 'none';

    const autoBtn = this.el('button', 'hud-utility-item hud-utility-item--on', 'Auto-Skill: ON');
    autoBtn.id = 'hud-auto-btn';
    autoBtn.setAttribute('type', 'button');
    autoBtn.setAttribute('role', 'menuitem');
    autoBtn.addEventListener('click', () => {
      const next = this.bridge?.toggleAutoSkill() ?? true;
      autoBtn.textContent = `Auto-Skill: ${next ? 'ON' : 'OFF'}`;
      autoBtn.classList.toggle('hud-utility-item--on', next);
      const qBtn = document.getElementById('hud-skill-btn');
      if (qBtn) {
        qBtn.classList.toggle('hidden', next);
      }
    });
    popover.appendChild(autoBtn);

    const muteBtn = this.el(
      'button',
      'hud-utility-item',
      soundFX.isMuted() ? 'Audio: Muted' : 'Audio: ON'
    );
    muteBtn.id = 'hud-mute-btn';
    muteBtn.setAttribute('type', 'button');
    muteBtn.setAttribute('role', 'menuitem');
    muteBtn.addEventListener('click', () => {
      const muted = soundFX.toggleMute();
      muteBtn.textContent = muted ? 'Audio: Muted' : 'Audio: ON';
    });
    popover.appendChild(muteBtn);

    const retreatBtn = this.el(
      'button',
      'hud-utility-item hud-utility-item--gold',
      'Retreat (Keep Loot)'
    );
    retreatBtn.id = 'hud-retreat-btn';
    retreatBtn.setAttribute('type', 'button');
    retreatBtn.setAttribute('role', 'menuitem');
    retreatBtn.addEventListener('click', () => {
      this.toggleUtilityMenu(false);
      this.bridge?.retreatWithLoot();
    });
    popover.appendChild(retreatBtn);

    menuWrap.appendChild(popover);
    topRight.appendChild(menuWrap);
    top.appendChild(topRight);

    // Bottom-Right Floating Action Medallions (HP/Qi bars live overhead on the hero sprite)
    const bottom = this.el('div', 'hud-ink-bottom');

    // Bottom-Right: Translucent Circular Action Medallions + Compact Skills Pill
    const actionsCol = this.el('div', 'hud-ink-actions');
    actionsCol.id = 'hud-ink-actions';

    const actionStrip = this.el('div', 'hud-ink-medallions');

    const skillBtn = this.el('button', 'hud-medallion hud-medallion--tech hidden');
    skillBtn.id = 'hud-skill-btn';
    skillBtn.setAttribute('type', 'button');
    skillBtn.appendChild(this.el('span', 'hud-medallion-key', 'Q'));
    skillBtn.appendChild(this.el('span', 'hud-medallion-touch', 'Tech'));
    skillBtn.appendChild(this.el('span', 'hud-medallion-sub', 'RDY'));
    skillBtn.addEventListener('click', () => {
      this.bridge?.triggerActiveSkill();
    });

    const potBtn = this.el('button', 'hud-medallion hud-medallion--pot');
    potBtn.id = 'hud-pot-btn';
    potBtn.setAttribute('type', 'button');
    potBtn.appendChild(this.el('span', 'hud-medallion-key', 'W'));
    potBtn.appendChild(this.el('span', 'hud-medallion-touch', 'Heal'));
    potBtn.appendChild(this.el('span', 'hud-medallion-sub', '×1'));
    potBtn.addEventListener('click', () => {
      this.bridge?.triggerPotion();
    });

    const dashBtn = this.el('button', 'hud-medallion hud-medallion--dash');
    dashBtn.id = 'hud-dash-btn';
    dashBtn.setAttribute('type', 'button');
    dashBtn.appendChild(this.el('span', 'hud-medallion-key', '␣'));
    dashBtn.appendChild(this.el('span', 'hud-medallion-touch', 'Dash'));
    dashBtn.appendChild(this.el('span', 'hud-medallion-sub', 'RDY'));
    dashBtn.addEventListener('click', () => {
      this.bridge?.triggerDash();
    });

    const ultBtn = this.el('button', 'hud-medallion hud-medallion--ult');
    ultBtn.id = 'hud-ult-btn';
    ultBtn.setAttribute('type', 'button');
    ultBtn.disabled = true;
    ultBtn.appendChild(this.el('span', 'hud-medallion-key', 'R'));
    ultBtn.appendChild(this.el('span', 'hud-medallion-touch', 'Ult'));
    ultBtn.appendChild(this.el('span', 'hud-medallion-sub', '0%'));
    ultBtn.addEventListener('click', () => {
      this.bridge?.triggerUltimateSkill();
    });

    actionStrip.appendChild(skillBtn);
    actionStrip.appendChild(potBtn);
    actionStrip.appendChild(dashBtn);
    actionStrip.appendChild(ultBtn);
    actionsCol.appendChild(actionStrip);

    const codexTrigger = this.el('button', 'hud-ink-skills-pill');
    codexTrigger.id = 'hud-codex-trigger';
    codexTrigger.setAttribute('type', 'button');
    codexTrigger.innerHTML =
      '<span class="hud-codex-label">Skills</span><span class="hud-codex-badge" id="hud-codex-badge">0</span><span class="hud-ink-keycap">TAB</span>';
    codexTrigger.addEventListener('click', () => {
      this.toggleUtilityMenu(false);
      this.toggleCodexDrawer();
    });
    actionsCol.appendChild(codexTrigger);

    bottom.appendChild(actionsCol);

    // Floating Slide-Out Skills & Synergies Drawer & Backdrop
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
    if (floorEl) floorEl.textContent = `F${hud.floor} · ${hud.waveLabel.toUpperCase()}`;

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
          bSub.textContent = `${hud.activeBossHp}/${hud.activeBossMaxHp}${hud.activeBossShield > 0 ? ` · Shield ${hud.activeBossShield}` : ''}${muts ? ` · ${muts}` : ''}`;
        }
      } else {
        bossBox.style.display = 'none';
      }
    }

    const lootEl = document.getElementById('hud-loot');
    if (lootEl) lootEl.textContent = `${hud.gold.toLocaleString()}g · ${hud.shards}s`;

    const actionsCol = document.getElementById('hud-ink-actions');
    if (actionsCol) {
      actionsCol.classList.toggle('hud-ink-actions--alert', hud.ultimateStocks > 0);
    }

    const autoBtn = document.getElementById('hud-auto-btn');
    if (autoBtn instanceof HTMLButtonElement) {
      autoBtn.textContent = `Auto-Skill: ${hud.autoSkill ? 'ON' : 'OFF'}`;
      autoBtn.classList.toggle('hud-utility-item--on', hud.autoSkill);
    }

    const ultBtn = document.getElementById('hud-ult-btn');
    if (ultBtn instanceof HTMLButtonElement) {
      const hasStock = hud.ultimateStocks > 0;
      ultBtn.disabled = !hasStock;
      ultBtn.className = hasStock
        ? 'hud-medallion hud-medallion--ult hud-medallion--ready'
        : 'hud-medallion hud-medallion--ult';
      ultBtn.replaceChildren(
        this.el('span', 'hud-medallion-key', 'R'),
        this.el('span', 'hud-medallion-touch', 'Ult'),
        this.el('span', 'hud-medallion-sub', hasStock ? 'MAX' : `${hud.ultimateGauge}%`)
      );
      ultBtn.title = `${hud.ultimateName}: ${hud.ultimateStocks}/${hud.maxUltimateStocks} stored (${hud.ultimateGauge}%)`;
    }

    const skillBtn = document.getElementById('hud-skill-btn');
    if (skillBtn instanceof HTMLButtonElement) {
      skillBtn.disabled = !hud.skillReady;
      skillBtn.title = hud.skillName;
      skillBtn.className = hud.skillReady
        ? 'hud-medallion hud-medallion--tech hud-medallion--ready'
        : 'hud-medallion hud-medallion--tech';
      skillBtn.classList.toggle('hidden', hud.autoSkill);
      skillBtn.replaceChildren(
        this.el('span', 'hud-medallion-key', 'Q'),
        this.el('span', 'hud-medallion-touch', 'Tech'),
        this.el(
          'span',
          'hud-medallion-sub',
          hud.skillReady ? 'RDY' : `${Math.ceil(hud.skillCooldownPct * 10)}s`
        )
      );
    }

    const dashBtn = document.getElementById('hud-dash-btn');
    if (dashBtn instanceof HTMLButtonElement) {
      dashBtn.disabled = !hud.dashReady;
      dashBtn.className = hud.dashReady
        ? 'hud-medallion hud-medallion--dash hud-medallion--ready'
        : 'hud-medallion hud-medallion--dash';
      dashBtn.replaceChildren(
        this.el('span', 'hud-medallion-key', '␣'),
        this.el('span', 'hud-medallion-touch', 'Dash'),
        this.el(
          'span',
          'hud-medallion-sub',
          hud.dashReady ? 'RDY' : `${Math.ceil(hud.dashCooldownPct * 5)}s`
        )
      );
    }

    const potBtn = document.getElementById('hud-pot-btn');
    if (potBtn instanceof HTMLButtonElement) {
      const canUse = hud.potionCharges > 0 && hud.potionDisabledReason === null;
      potBtn.disabled = !canUse;
      potBtn.className = canUse
        ? 'hud-medallion hud-medallion--pot hud-medallion--ready'
        : 'hud-medallion hud-medallion--pot';
      potBtn.replaceChildren(
        this.el('span', 'hud-medallion-key', 'W'),
        this.el('span', 'hud-medallion-touch', 'Heal'),
        this.el(
          'span',
          'hud-medallion-sub',
          hud.potionDisabledReason ? 'OFF' : `×${hud.potionCharges}`
        )
      );
      potBtn.title =
        hud.potionDisabledReason ?? `Healing Elixir: ${hud.potionCharges} charges left [W]`;
    }

    const codexBadge = document.getElementById('hud-codex-badge');
    const codexBody = document.getElementById('hud-codex-drawer-body');
    const buffsKey = `${hud.floor}:${hud.draftedBuffIds.join(',')}`;

    if (codexBody && buffsKey !== this.lastHudBuffsKey) {
      this.lastHudBuffsKey = buffsKey;
      codexBody.innerHTML = '';

      const loadout = computeWuxiaLoadout(hud.draftedBuffIds, hud.floor);
      const totalCount =
        loadout.actives.length +
        loadout.innerQis.length +
        Object.keys(loadout.enlightenmentCounts).length;

      if (codexBadge) {
        codexBadge.textContent = `${totalCount}`;
      }

      // Populate Slide-out Skills & Synergies Codex Drawer
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
            head.appendChild(this.el('span', 'codex-card-name', art.name));
            head.appendChild(
              this.el(
                'span',
                `tier-badge ${syn ? 'tier-prismatic' : slot.level >= 3 ? 'tier-gold' : 'tier-silver'}`,
                syn ? 'SYNERGY' : `RANK ${slot.level}`
              )
            );
            card.appendChild(head);
            card.appendChild(this.renderLevelPips(slot.level, loadout.maxManualLevel));
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
            head.appendChild(this.el('span', 'codex-card-name', qi.name));
            head.appendChild(
              this.el(
                'span',
                `tier-badge ${slot.level >= 4 ? 'tier-gold' : 'tier-silver'}`,
                `RANK ${slot.level}`
              )
            );
            card.appendChild(head);
            card.appendChild(this.renderLevelPips(slot.level, loadout.maxManualLevel));
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
    minPill.appendChild(this.el('span', '', `Floor ${floor} Skill Draft Paused`));
    minPill.appendChild(this.el('span', 'btn btn-xs btn-gold', 'Resume'));
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

    // Slim Draft Header: Floor + Active/Passive slots on left, Rerolls / Skip / Minimize on right
    const actionRow = this.el('div', 'draft-header-actions');
    const slimHeader = this.el(
      'div',
      'draft-slim-header',
      `Floor ${floor} · Active ${loadout.actives.length}/${loadout.maxActiveSlots} · Passive ${loadout.innerQis.length}/${loadout.maxInnerQiSlots}`
    );
    actionRow.appendChild(slimHeader);

    const rightActions = this.el('div', 'row-gap-2');
    const rollBadge = this.el(
      'span',
      'tier-badge tier-gold',
      `${this.bankedRerolls} Reroll${this.bankedRerolls === 1 ? '' : 's'}`
    );
    const skipBtn = this.el('button', 'btn btn-sm btn-ghost', 'Skip (+1 Reroll)');
    skipBtn.setAttribute('type', 'button');
    skipBtn.title = 'Skip choosing a skill for this floor to bank +1 extra reroll';
    skipBtn.addEventListener('click', () => {
      this.bankedRerolls += 1;
      soundFX.playDraft();
      this.showToastSafe(`Draft skipped (+1 Reroll)`);
      this.clearModal();
      this.bridge?.resumeAfterDraft('skip');
    });

    const minBtn = this.el('button', 'btn btn-sm btn-ghost', 'Minimize');
    minBtn.setAttribute('type', 'button');
    minBtn.title = 'Collapse skill draft to view your hero, arena, and Codex';
    minBtn.addEventListener('click', toggleMinimize);

    rightActions.appendChild(rollBadge);
    rightActions.appendChild(skipBtn);
    rightActions.appendChild(minBtn);
    actionRow.appendChild(rightActions);
    box.appendChild(actionRow);

    const updateHeader = (): void => {
      rollBadge.textContent = `${this.bankedRerolls} Reroll${this.bankedRerolls === 1 ? '' : 's'}`;
    };
    updateHeader();

    const ownedActiveIds = new Set(loadout.actives.map((slot) => slot.id));
    const ownedInnerQiIds = new Set(loadout.innerQis.map((slot) => slot.id));
    const hasSynergyMatch = (option: WuxiaDraftOption): boolean => {
      if (option.kind === 'synergy') return true;
      if (option.kind === 'active') {
        return WUXIA_SECRET_SYNERGIES.some(
          (syn) => syn.activeId === option.id && ownedInnerQiIds.has(syn.innerQiId)
        );
      }
      if (option.kind === 'inner_qi') {
        return WUXIA_SECRET_SYNERGIES.some(
          (syn) => syn.innerQiId === option.id && ownedActiveIds.has(syn.activeId)
        );
      }
      return false;
    };

    const grid = this.el('div', 'draft-grid');
    box.appendChild(grid);
    backdrop.appendChild(box);
    this.root.appendChild(backdrop);
    this.activeModal = backdrop;

    const renderCards = (): void => {
      updateHeader();
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
        const isSynergyCard = hasSynergyMatch(cardDef);

        const card = this.el(
          'div',
          `draft-card ${tierCss}${isSynergyCard ? ' draft-card--synergy' : ''}`
        );
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `${cardDef.name}: ${cardDef.description}`);

        const selectCard = (): void => {
          soundFX.playDraft();
          if (cardDef.kind === 'synergy') {
            const newlyDiscovered = recordDiscoveredSynergy(cardDef.id);
            if (newlyDiscovered) {
              this.showToastSafe(`New Synergy Recorded: ${cardDef.name}`);
            }
          }
          this.clearModal();
          this.bridge?.resumeAfterDraft(cardDef.id);
        };

        card.addEventListener('click', selectCard);
        card.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.target !== card) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectCard();
          }
        });

        const cardTop = this.el('div', 'draft-card-body');

        const cardHead = this.el('div', 'draft-card-head');
        const badgeHost = this.el('span', 'astryx-inline-slot');
        mountHdBadge(badgeHost, {
          label: cardDef.badge,
          tier: astryxTier,
        });
        cardHead.appendChild(badgeHost);
        if (isSynergyCard) {
          cardHead.appendChild(this.el('span', 'draft-synergy-tag', 'SYNERGY'));
        }
        cardTop.appendChild(cardHead);

        cardTop.appendChild(this.el('strong', 'draft-card-title', cardDef.name));

        if (cardDef.kind === 'active' || cardDef.kind === 'inner_qi') {
          cardTop.appendChild(
            this.renderLevelPips(cardDef.currentLevel, cardDef.maxLevel, cardDef.nextLevel)
          );
        }

        const descEl = this.el('div', 'muted draft-card-desc');
        descEl.appendChild(this.buildHighlightedText(cardDef.description));
        cardTop.appendChild(descEl);
        card.appendChild(cardTop);

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

        const footer = this.el('div', 'draft-card-footer');
        const actionHint = cardDef.isSecretAwakening
          ? 'Click to Awaken'
          : cardDef.currentLevel > 0 && cardDef.kind !== 'enlightenment'
            ? `Click to Upgrade Lv.${cardDef.nextLevel}`
            : 'Click to Learn';
        footer.appendChild(this.el('span', 'draft-card-hint', actionHint));

        const rerollBtn = this.el(
          'button',
          'hd-btn hd-btn--secondary hd-btn--sm draft-reroll-btn',
          `Reroll (${this.bankedRerolls})`
        );
        rerollBtn.setAttribute('type', 'button');
        rerollBtn.disabled = this.bankedRerolls <= 0;
        rerollBtn.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation();
          rollCard();
        });
        rerollBtn.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
          }
        });
        footer.appendChild(rerollBtn);

        card.appendChild(footer);
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
    const dateKey = this.state.daily.dateKey;
    const lootForfeited = false;
    const penalty = 1;
    const modeMult = payload.mode === 'daily' ? DAILY_REWARD_MULT : ENDLESS_REWARD_MULT;
    const bountyApplied = payload.classId === this.state.daily.bountyClass;
    const restedApplied = p.restedStacks > 0;

    const clearedFloors =
      payload.outcome === 'died' ? Math.max(0, payload.floorReached - 1) : payload.floorReached;
    const cultLeadersDefeated = Math.floor(clearedFloors / 10);

    let goldBanked = Math.round(
      payload.goldCollected *
        penalty *
        modeMult *
        (bountyApplied ? 1.25 : 1) *
        (restedApplied ? 2 : 1)
    );
    let shardsBase = Math.round(
      payload.shardsCollected * penalty * modeMult * (restedApplied ? 2 : 1)
    );
    const coresBanked =
      Math.round(payload.coresCollected * penalty) +
      Math.max(payload.outcome === 'cleared' ? 1 : 0, cultLeadersDefeated);
    const expBase =
      payload.floorReached * 42 +
      cultLeadersDefeated * 90 +
      (payload.outcome === 'cleared' ? 120 : payload.outcome === 'extracted' ? 50 : 15);
    const expGained = Math.round(expBase * modeMult * (bountyApplied ? 2 : 1));

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

    // Daily Chests (F10 / F20 / F30) + Daily Mastery Bounty + Endless Personal Best
    const nextLoginStreak = {
      ...p.loginStreak,
      dailyChestsClaimed:
        p.loginStreak.dailyChestsDate === dateKey ? [...p.loginStreak.dailyChestsClaimed] : [],
      dailyChestsDate: p.loginStreak.dailyChestsDate === dateKey ? dateKey : p.loginStreak.dailyChestsDate,
    };
    const dailyChestsUnlocked: number[] = [];
    let dailyBountyCompleted = false;
    let dailyBountyShards = 0;

    if (payload.mode === 'daily') {
      nextLoginStreak.dailyChestsDate = dateKey;
      for (const chestFloor of DAILY_CHEST_FLOORS) {
        if (
          clearedFloors >= chestFloor &&
          !nextLoginStreak.dailyChestsClaimed.includes(chestFloor)
        ) {
          nextLoginStreak.dailyChestsClaimed.push(chestFloor);
          dailyChestsUnlocked.push(chestFloor);
          const reward = getDailyChestRewards(chestFloor);
          goldBanked += reward.gold;
          shardsBase += reward.shards;
          if (reward.rareDrop) {
            const slot = slots[Math.floor(rng() * slots.length)] ?? 'weapon';
            keptDrops.unshift(
              createGearItem(rng, payload.classId, slot, 'rare', chestFloor, `chest${chestFloor}`)
            );
          }
          if (reward.legendaryDrop) {
            legendaryDrops.push(
              createLegendaryGearItem(rng, payload.classId, false, `chest${chestFloor}`, chestFloor)
            );
          }
        }
      }

      if (nextLoginStreak.dailyBountyCompletedDate !== dateKey) {
        const bounty = getDailyMasteryBounty(dateKey);
        if (evaluateDailyMasteryBounty(bounty.id, clearedFloors, payload.draftedBuffIds)) {
          dailyBountyCompleted = true;
          dailyBountyShards = bounty.shardReward;
          shardsBase += bounty.shardReward;
          nextLoginStreak.dailyBountyCompletedDate = dateKey;
        }
      }
    } else {
      nextLoginStreak.endlessBestFloor = Math.max(
        nextLoginStreak.endlessBestFloor,
        payload.floorReached
      );
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
        payload.mode === 'daily' ? dateKey : p.dailyRankedCompletedDate,
      classes: {
        ...p.classes,
        [payload.classId]: expResult.updated,
      },
      inventory: [...allKeptDrops, ...p.inventory].slice(0, 60),
      loginStreak: nextLoginStreak,
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
      dailyChestsUnlocked,
      dailyBountyCompleted,
      dailyBountyShards,
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
          const dailyChestsUnlocked: number[] = [];
          if (Array.isArray(s.dailyChestsUnlocked)) {
            for (const f of s.dailyChestsUnlocked) {
              if (isNumber(f)) dailyChestsUnlocked.push(f);
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
            dailyChestsUnlocked,
            dailyBountyCompleted: isBoolean(s.dailyBountyCompleted)
              ? s.dailyBountyCompleted
              : false,
            dailyBountyShards: isNumber(s.dailyBountyShards) ? s.dailyBountyShards : 0,
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

    const ritualParts: string[] = [];
    if (summary.dailyChestsUnlocked && summary.dailyChestsUnlocked.length > 0) {
      ritualParts.push(
        `Daily Chests Claimed: ${summary.dailyChestsUnlocked.map((f) => `F${f}`).join(', ')}`
      );
    }
    if (summary.dailyBountyCompleted) {
      ritualParts.push(`Daily Mastery Bounty Completed (+${summary.dailyBountyShards ?? 0} Shards)`);
    }
    if (ritualParts.length > 0) {
      box.appendChild(this.el('div', 'card', ritualParts.join(' • ')));
    }

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
