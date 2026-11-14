import { showToast } from '@devvit/web/client';
import {
  BOSS_MUTATIONS,
  getBiomeById,
  getMutationById,
  rollBossMutations,
} from '../../shared/catalogs/biomes.ts';
import {
  ALL_BUFFS,
  CORE_BUFFS,
  getBuffById,
  refreshSingleDraftCard,
  rollDraftCards,
} from '../../shared/catalogs/buffs.ts';
import type { BuffDefinition } from '../../shared/catalogs/buffs.ts';
import {
  CLASS_CATALOG,
  GEAR_SLOTS,
  computeHeroCombatStats,
  computeLinkSkillBonuses,
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

const LOCAL_PROFILE_KEY = 'maplespire_local_profile';

export class OverlayManager {
  private root: HTMLElement;
  private bridge: DungeonBridge | null = null;
  private state: AppState;
  private mode: 'camp' | 'dungeon' = 'camp';
  private activeTab: CampTab = 'roster';
  private codexFilter: ClassId | 'buffs' = 'warrior';
  private draftRng: () => number = mulberry32(1);
  private rouletteRng: () => number = mulberry32(2);
  private lastHud: RunHudSnapshot | null = null;
  private currentRunMode: RunMode = 'practice';
  private lastHudHeaderKey: string = '';
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
    const bountyCls = getClassDefinition(daily.bountyClass);
    const dailyCompleted = p.dailyRankedCompletedDate === daily.dateKey;
    const selectedDef = getClassDefinition(p.selectedClass);
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
          ? `Enter Spire (${selectedDef.name})`
          : `Practice (${selectedDef.name})`,
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
      title: `Daily Spire: ${biome.name} — ${biome.miniBossName} / ${biome.endBossName}`,
      description: `${biome.mechanicName} • Daily Bounty: +2x Class EXP & +25% Gold`,
      badgeText: `🎯 2x ${bountyCls.name}`,
      badgeTier: 'bounty',
    });
    wrap.appendChild(strip);

    // Tabs (Astryx Button + Badge Strip)
    const tabs = this.el('div', 'camp-tabs');
    mountAstryxTabStrip(tabs, {
      items: [
        { id: 'roster', label: '⚔️ Roster' },
        { id: 'buildings', label: '🏰 Camp' },
        { id: 'codex', label: '📖 Codex' },
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
        label: `⚔️ START DAILY RANKED DELVE (${selectedDef.name})`,
        variant: 'primary',
        size: 'md',
        onClick: () => {
          void this.launchRun('daily', false);
        },
      });
    } else if (p.goldenTickets > 0) {
      footerActions.push({
        label: `🎫 USE GOLDEN TICKET FOR RANKED DELVE (${p.goldenTickets} left)`,
        variant: 'primary',
        size: 'md',
        onClick: () => {
          void this.launchRun('daily', true);
        },
      });
    }
    footerActions.push({
      label: dailyCompleted
        ? `🏕️ PLAY PRACTICE / GRIND DELVE (${selectedDef.name})`
        : '🏕️ PRACTICE RUN (No Daily Lockout)',
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
    const links = computeLinkSkillBonuses(p.classes);

    const linkBar = this.el(
      'div',
      'muted',
      `Links: +${links.maxHpPct}% HP • +${links.skillDmgPct}% Skill • +${links.critRatePct}% Crit • +${links.attackSpeedPct}% AS`
    );
    container.appendChild(linkBar);

    const grid = this.el('div', 'grid-4');
    grid.style.marginTop = '8px';

    for (const def of CLASS_CATALOG) {
      const prog = p.classes[def.id];
      const nextExp = expForNextLevel(prog.level);
      const job = getJobAdvancementTitle(prog.level);
      const isSelected = p.selectedClass === def.id;
      const isBounty = this.state.daily.bountyClass === def.id;

      const card = this.el('div', `card class-selector ${isSelected ? 'selected' : ''}`);
      card.title = `Link Skill: ${def.linkSkillDesc}`;
      card.addEventListener('click', () => {
        if (!isSelected) {
          void this.sendCampAction({ action: 'select_class', classId: def.id });
        }
      });

      const headRow = this.el('div', 'class-card-head');
      const miniCanvas = document.createElement('canvas');
      miniCanvas.width = 44;
      miniCanvas.height = 44;
      miniCanvas.className = 'paperdoll-mini';
      renderHeroPaperdollCanvas(miniCanvas, def.id, prog.equipped);
      headRow.appendChild(miniCanvas);

      const infoCol = this.el('div', 'class-card-info');
      const top = this.el('div', 'row-between');
      const title = this.el('span', 'class-name', `${def.name} Lv.${prog.level}`);
      title.style.color = def.colorHex;
      top.appendChild(title);
      if (isBounty) {
        const badgeHost = this.el('span', 'astryx-inline-slot');
        mountAstryxStatusBadge(badgeHost, { label: '2x', tier: 'bounty' });
        top.appendChild(badgeHost);
      } else if (isSelected) {
        const badgeHost = this.el('span', 'astryx-inline-slot');
        mountAstryxStatusBadge(badgeHost, { label: '✓ Active', tier: 'selected' });
        top.appendChild(badgeHost);
      }
      infoCol.appendChild(top);
      infoCol.appendChild(this.el('div', 'muted', `${job.title} • ${prog.exp}/${nextExp}`));

      const track = this.el('div', 'bar-track');
      const fill = this.el('div', 'bar-fill');
      fill.style.width = `${Math.min(100, Math.round((prog.exp / nextExp) * 100))}%`;
      track.appendChild(fill);
      infoCol.appendChild(track);

      headRow.appendChild(infoCol);
      card.appendChild(headRow);
      grid.appendChild(card);
    }
    container.appendChild(grid);

    // Selected class paperdoll + stats + equipped gear + inventory
    const selId = p.selectedClass;
    const selProg = p.classes[selId];
    const selDef = getClassDefinition(selId);
    const selJob = getJobAdvancementTitle(selProg.level);
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
    const heroTitle = this.el('div', 'class-name', `${selDef.name} Lv.${selProg.level} • ${selJob.title}`);
    heroTitle.style.color = selDef.colorHex;
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
          `${slotIcons[slot]} ${item ? item.name : `Empty ${slot}`}`
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
        box.appendChild(this.el('div', 'muted', `+${item.baseStatBonus} Power • ${item.affixText}`));
        if (item.legendaryId && item.isCursed) {
          const leg = getLegendaryById(item.legendaryId);
          if (leg) {
            box.appendChild(
              this.el('div', 'muted', `⚠️ ${leg.cursedName}: ${leg.cursedText}`)
            );
          }
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
        const card = this.el(
          'div',
          `gear-item tier-${item.tier} ${item.isCursed ? 'cursed-tag' : ''}`
        );
        const top = this.el('div', 'row-between');
        top.appendChild(
          this.el(
            'strong',
            '',
            `${item.name} (${getClassDefinition(item.classId).name} ${item.slot})`
          )
        );
        const itemBadgeHost = this.el('span', 'astryx-inline-slot');
        mountAstryxStatusBadge(itemBadgeHost, {
          label: `${item.tier.toUpperCase()}${item.isCursed ? ' • CURSED' : ''}`,
          tier: item.isCursed ? 'cursed' : item.tier,
        });
        top.appendChild(itemBadgeHost);
        card.appendChild(top);
        card.appendChild(this.el('div', 'muted', `+${item.baseStatBonus} Power • ${item.affixText}`));

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
        `🔨 Blacksmith (${getClassDefinition(p.selectedClass).name} Slots)`
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
        row.appendChild(this.el('strong', '', item.name));
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
    legion.appendChild(this.el('div', 'class-name', '🛡️ Legion Board (Account-Wide Stats)'));
    legion.appendChild(
      this.el('div', 'muted', 'Infinite Gold sinks granting permanent power to all 4 classes.')
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
    const filterRow = this.el('div', 'row-wrap');
    filterRow.style.marginBottom = '10px';

    for (const c of CLASS_CATALOG) {
      const btn = this.el(
        'button',
        `tab-btn ${this.codexFilter === c.id ? 'active' : ''}`,
        `${c.name} Legendaries (12)`
      );
      btn.addEventListener('click', () => {
        this.codexFilter = c.id;
        this.renderCamp();
      });
      filterRow.appendChild(btn);
    }
    const buffBtn = this.el(
      'button',
      `tab-btn ${this.codexFilter === 'buffs' ? 'active' : ''}`,
      `Draft Buffs (${ALL_BUFFS.length})`
    );
    buffBtn.addEventListener('click', () => {
      this.codexFilter = 'buffs';
      this.renderCamp();
    });
    filterRow.appendChild(buffBtn);
    container.appendChild(filterRow);

    if (this.codexFilter === 'buffs') {
      const grid = this.el('div', 'grid-4');
      for (const b of ALL_BUFFS) {
        const card = this.el('div', `draft-card tier-${b.tier}`);
        card.appendChild(this.el('span', 'tier-badge', `${b.tier}${b.classId ? ` • ${b.classId}` : ''}`));
        card.appendChild(this.el('strong', '', `${b.icon} ${b.name}`));
        card.appendChild(this.el('div', 'muted', b.description));
        if (b.downside) {
          card.appendChild(this.el('div', 'muted', `Curse: ${b.downside}`));
        }
        grid.appendChild(card);
      }
      container.appendChild(grid);
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
    for (const col of ['#', 'Redditor', 'Class', 'Result', 'Time', 'Gold', 'Legendary']) {
      hr.appendChild(this.el('th', '', col));
    }
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = this.el('tbody');
    for (const entry of this.state.leaderboard) {
      const tr = this.el('tr');
      tr.appendChild(this.el('td', '', String(entry.rank)));
      tr.appendChild(this.el('td', '', `u/${entry.username}`));
      tr.appendChild(this.el('td', '', getClassDefinition(entry.classId).name));
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
    const floorLbl = this.el('strong', '', 'Floor 1/10 • Wave 1/2');
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

    const retreatBtn = this.el('button', 'btn btn-sm', 'Camp');
    retreatBtn.addEventListener('click', () => {
      this.bridge?.stopToIdle();
      this.renderCamp();
    });
    right.appendChild(retreatBtn);
    top.appendChild(right);

    const bottom = this.el('div', 'hud-bottom');
    const controls = this.el('div', 'row-wrap');

    const skillBtn = this.el('button', 'btn btn-sm btn-primary', '⚡ Skill [Q]');
    skillBtn.id = 'hud-skill-btn';
    skillBtn.style.minWidth = '140px';
    skillBtn.addEventListener('click', () => {
      this.bridge?.triggerActiveSkill();
    });

    const dashBtn = this.el('button', 'btn btn-sm btn-primary', '💨 Dash [Space]');
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

    const potBtn = this.el('button', 'btn btn-sm btn-purple', '🧪 [W] (1)');
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
    if (floorEl) floorEl.textContent = `Floor ${hud.floor}/${hud.maxFloors} • ${hud.waveLabel}`;

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
    const headerKey = `${hud.draftedBuffIds.length}:${isBossActive ? '1' : '0'}`;
    if (headerKey !== this.lastHudHeaderKey) {
      this.lastHudHeaderKey = headerKey;
      const astryxMetaHost = document.getElementById('hud-astryx-meta');
      if (astryxMetaHost) {
        const dailyBiome = getBiomeById(this.state.daily.biomeId);
        mountAstryxRunHudHeader(astryxMetaHost, {
          biomeName: dailyBiome.name,
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
        ? '💨 Dash [Space]'
        : `💨 ${Math.ceil(hud.dashCooldownPct * 5)}s`;
    }

    const potBtn = document.getElementById('hud-pot-btn');
    if (potBtn instanceof HTMLButtonElement) {
      potBtn.disabled = hud.potionCharges <= 0 || hud.potionDisabledReason !== null;
      potBtn.textContent = hud.potionDisabledReason
        ? `🚫 ${hud.potionDisabledReason}`
        : `🧪 (${hud.potionCharges})`;
    }

    const buffStrip = document.getElementById('hud-buffs');
    if (buffStrip) {
      buffStrip.innerHTML = '';
      const counts = new Map<string, number>();
      for (const id of hud.draftedBuffIds) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      const uniqueIds = [...counts.keys()].slice(-12);
      for (const id of uniqueIds) {
        const b = getBuffById(id);
        if (!b) continue;
        const stacks = counts.get(id) ?? 1;
        const chip = this.el('span', `buff-chip tier-${b.tier}`, `${b.icon}${stacks > 1 ? ` ×${stacks}` : ''}`);
        chip.title = `${b.name} (${b.tier.toUpperCase()}): ${b.description}`;
        buffStrip.appendChild(chip);
      }
    }
    void this.lastHud;
  }

  // ==================== IN-RUN MODALS ====================

  public openDraftModal(floor: number, equippedBuffIds: string[], silverMult: number): void {
    this.clearModal();
    const clsId = this.state.profile.selectedClass;
    const clsLevel = this.state.profile.classes[clsId].level;

    const draftInput = {
      floor,
      rng: this.draftRng,
      classId: clsId,
      classLevel: clsLevel,
      banishedIds: this.state.profile.banishedBuffIds,
      equippedBuffIds,
      silverWeightMult: silverMult,
    };

    let cards: BuffDefinition[] = rollDraftCards(draftInput);
    let refreshesLeft = 2;

    const backdrop = this.el('div', 'modal-backdrop');
    const box = this.el('div', 'modal-box');
    const bannerHost = this.el('div', 'astryx-block-slot');
    const updateBanner = (): void => {
      mountAstryxModalBanner(bannerHost, {
        status: 'info',
        title: `Floor ${floor} Cleared — Draft 1 of 3 Buffs`,
        description: `Targeted Card Refreshes Remaining: ${refreshesLeft} (Click Refresh on any card to keep the other 2 locked!)`,
        badgeText: `${refreshesLeft} Refresh${refreshesLeft === 1 ? '' : 'es'} Left`,
        badgeTier: 'silver',
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
        const card = this.el('div', `draft-card tier-${cardDef.tier}`);
        const top = this.el('div', 'row-between');
        const badgeHost = this.el('span', 'astryx-inline-slot');
        mountAstryxStatusBadge(badgeHost, {
          label: cardDef.tier.toUpperCase(),
          tier: cardDef.tier,
        });
        top.appendChild(badgeHost);

        const rollCard = (): void => {
          if (refreshesLeft <= 0) return;
          refreshesLeft -= 1;
          soundFX.playRouletteTick();
          cards = refreshSingleDraftCard(draftInput, cards, idx);
          renderCards();
        };

        const refreshHost = this.el('span', 'astryx-inline-slot');
        mountAstryxActionRow(refreshHost, [
          {
            label: `🎲 Roll (${refreshesLeft})`,
            variant: 'secondary',
            size: 'sm',
            isDisabled: refreshesLeft <= 0,
            tooltip: 'Reroll this buff card while locking the other 2',
            onClick: rollCard,
          },
        ]);
        top.appendChild(refreshHost);
        card.appendChild(top);

        card.appendChild(this.el('strong', '', `${cardDef.icon} ${cardDef.name}`));
        card.appendChild(this.el('div', 'muted', cardDef.description));
        if (cardDef.downside) {
          card.appendChild(this.el('div', 'muted', `⚠️ Downside: ${cardDef.downside}`));
        }

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
            label: 'Choose Buff',
            variant: 'primary',
            size: 'md',
            onClick: () => {
              soundFX.playDraft();
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
    const biome = getBiomeById(this.state.daily.biomeId);

    const backdrop = this.el('div', 'modal-backdrop');
    const box = this.el('div', 'modal-box');
    const bannerHost = this.el('div', 'astryx-block-slot');
    mountAstryxModalBanner(bannerHost, {
      status: 'warning',
      title:
        floor === 4
          ? `🎰 Floor 4 Mini-Boss Roulette: ${biome.miniBossName}`
          : `🎰 Floor 10 End Boss Roulette: ${biome.endBossName}`,
      description: `${biome.mechanicName}: ${biome.mechanicDescription}`,
      badgeText: floor === 4 ? 'MINI-BOSS' : 'END BOSS',
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
      title: `🚁 Floor ${floor} Safe Haven Extraction Checkpoint`,
      description: `Unbanked Loot: 🪙 ${gold} Gold • 💎 ${shards} Shards • 🔮 ${cores} Boss Cores — Extract safely to bank 100%, or push deeper (dying forfeits 50%!).`,
      badgeText: `FLOOR ${floor}`,
      badgeTier: 'prismatic',
    });
    box.appendChild(bannerHost);

    const row = this.el('div', 'camp-footer');
    mountAstryxActionRow(row, [
      {
        label: '🚁 EXTRACT SAFELY (100% Loot)',
        variant: 'secondary',
        size: 'md',
        onClick: () => {
          this.clearModal();
          this.bridge?.resumeAfterExtraction(true);
        },
      },
      {
        label: floor === 4 ? '🔥 PUSH TO FLOOR 5 -> 7' : '🔥 PUSH TO FLOOR 10 END BOSS!',
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
      description: `You conquered Floor 10! Guaranteed Unique Legendary for ${getClassDefinition(payload.classId).name}. Roll Free Purification (50/50) for Pristine, or gain a Tuned Cursed Legendary.`,
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
    const lootForfeited = payload.outcome === 'died';
    const penalty = lootForfeited ? 0.5 : 1;
    const bountyApplied = payload.classId === this.state.daily.bountyClass;
    const restedApplied = p.restedStacks > 0;

    const goldBanked = Math.round(
      payload.goldCollected * penalty * (bountyApplied ? 1.25 : 1) * (restedApplied ? 2 : 1)
    );
    const shardsBase = Math.round(payload.shardsCollected * penalty * (restedApplied ? 2 : 1));
    const coresBanked =
      Math.round(payload.coresCollected * penalty) + (payload.outcome === 'cleared' ? 1 : 0);
    const expBase =
      payload.floorReached * 42 +
      (payload.outcome === 'cleared' ? 120 : payload.outcome === 'extracted' ? 50 : 15);
    const expGained = expBase * (bountyApplied ? 2 : 1);

    const rng = mulberry32(hashString(`${payload.runId}:${p.username}:${payload.floorReached}`));
    const slots: readonly GearSlot[] = ['weapon', 'headgear', 'top', 'cape'];
    const rawDrops: GearItem[] = [];
    const clearedFloors =
      payload.outcome === 'died' ? Math.max(0, payload.floorReached - 1) : payload.floorReached;

    for (let f = 2; f <= clearedFloors; f++) {
      if (f === 4 || f === 7) {
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
    const keepCount = lootForfeited ? Math.ceil(rawDrops.length * 0.5) : rawDrops.length;
    for (let i = 0; i < keepCount; i++) {
      const item = rawDrops[i];
      if (!item) continue;
      if (p.autoDismantleNormal && item.tier === 'normal') {
        autoDismantledCount += 1;
        autoDismantledShards += getDismantleShardValue(item);
      } else {
        keptDrops.push(item);
      }
    }

    let legendaryDrop: GearItem | null = null;
    if (payload.outcome === 'cleared' && payload.mode === 'daily') {
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

    this.clearModal();
    const backdrop = this.el('div', 'modal-backdrop');
    const box = this.el('div', 'modal-box');
    const titleStr =
      payload.outcome === 'cleared'
        ? '🏆 FLOOR 10 VICTORY!'
        : payload.outcome === 'extracted'
          ? `🚁 EXTRACTED AT FLOOR ${payload.floorReached}!`
          : `💀 DEFEATED ON FLOOR ${payload.floorReached}`;

    const bannerHost = this.el('div', 'astryx-block-slot');
    mountAstryxModalBanner(bannerHost, {
      status:
        payload.outcome === 'cleared'
          ? 'success'
          : payload.outcome === 'extracted'
            ? 'info'
            : 'error',
      title: titleStr,
      description: summary.lootForfeited
        ? '⚠️ Defeat Penalty: 50% of unbanked loot was forfeited.'
        : 'All banked loot, Shards, Cores, and EXP have been secured in Camp.',
      badgeText: summary.playerRank ? `Rank #${summary.playerRank}` : `F${payload.floorReached}`,
      badgeTier: payload.outcome === 'cleared' ? 'gold' : payload.outcome === 'extracted' ? 'prismatic' : 'boss',
    });
    box.appendChild(bannerHost);

    box.appendChild(
      this.el(
        'div',
        'card',
        `Banked: 🪙 ${summary.goldBanked}g • 💎 ${summary.shardsBanked} Shards • 🔮 ${summary.coresBanked} Cores • ⭐ +${summary.expGained} EXP (Lv.${summary.newLevel}${summary.leveledUp ? ' LEVEL UP!' : ''})${summary.bountyApplied ? ' [2x Bounty]' : ''}${summary.restedApplied ? ' [2x Rested]' : ''}${summary.playerRank ? ` • Daily Rank #${summary.playerRank}` : ''}`
      )
    );

    if (summary.legendaryDrop) {
      const leg = getLegendaryById(summary.legendaryDrop.legendaryId);
      const lBox = this.el(
        'div',
        `gear-item tier-legendary ${summary.legendaryDrop.isCursed ? 'cursed-tag' : ''}`
      );
      const lTop = this.el('div', 'row-between');
      lTop.appendChild(
        this.el('strong', '', `Altar of Fate Legendary: ${summary.legendaryDrop.name}`)
      );
      const lBadgeHost = this.el('span', 'astryx-inline-slot');
      mountAstryxStatusBadge(lBadgeHost, {
        label: summary.legendaryDrop.isCursed ? 'CURSED' : 'PRISTINE ✨',
        tier: summary.legendaryDrop.isCursed ? 'cursed' : 'pristine',
      });
      lTop.appendChild(lBadgeHost);
      lBox.appendChild(lTop);
      lBox.appendChild(this.el('div', 'muted', summary.legendaryDrop.affixText));
      if (summary.legendaryDrop.isCursed && leg) {
        lBox.appendChild(
          this.el('div', 'muted', `Penalty (${leg.cursedName}): ${leg.cursedText} — Cleanse at The Sanctum!`)
        );
      }
      box.appendChild(lBox);
    }

    if (summary.drops.length > 0) {
      box.appendChild(
        this.el(
          'div',
          'muted',
          `Gear Drops Added to Bag: ${summary.drops.map((d) => `${d.name} (${d.tier})`).join(', ')}`
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
      const res = await fetch('/api/share-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: payload.classId,
          floorReached: payload.floorReached,
          outcome: payload.outcome,
          durationMs: payload.durationMs,
          goldBanked: summary.goldBanked,
          topBuffIds: payload.draftedBuffIds.slice(0, 5),
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
