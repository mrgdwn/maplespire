import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { getBiomeById, getMutationById } from '../../shared/catalogs/biomes.ts';
import { getClassDefinition } from '../../shared/catalogs/classes.ts';
import { computeHeroCombatStats } from '../../shared/catalogs/classes.ts';
import {
  computeWuxiaLoadout,
  getWuxiaActiveArtById,
  getWuxiaSynergyById,
  isCultLeaderFloor,
  isRandomMiniBossFloor,
  type WuxiaArtStyle,
} from '../../shared/catalogs/wuxia.ts';
import {
  computeBossChestCount,
  computeBossRouletteCount,
  computeEnemySpawnHpMult,
  computeFloorClearHeal,
  computeFloorStartShield,
} from '../../shared/buffCombat.ts';
import { getHybridElement } from '../../shared/catalogs/legendaries.ts';
import type {
  BiomeDefinition,
  BiomeMechanicId,
} from '../../shared/catalogs/biomes.ts';
import type {
  ClassId,
  ComputedHeroStats,
  ElementId,
  GearSlot,
  MutationId,
} from '../../shared/types.ts';
import { mulberry32 } from '../../shared/utils.ts';
import { getGearVisualStyle, registerPixelTextures } from '../fx/pixelArt.ts';
import { soundFX } from '../fx/sound.ts';
import type {
  DungeonBridge,
  RunEndPayload,
  RunHudSnapshot,
  RunStartPayload,
} from '../ui/bridge.ts';

type EnemyEntity = {
  id: number;
  sprite: Phaser.GameObjects.Image;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  name: string;
  isBoss: boolean;
  isMiniBoss: boolean;
  isSplitClone: boolean;
  hp: number;
  maxHp: number;
  hitShield: number;
  atk: number;
  atkIntervalSec: number;
  atkTimer: number;
  speed: number;
  armorShred: number;
  burnStacks: number;
  burnTimer: number;
  bleedStacks: number;
  bleedTimer: number;
  chillTimer: number;
  rootTimer: number;
  stunTimer: number;
  smokeTimer: number;
  smokeActiveTimer: number;
  permafrostTimer: number;
  overheatTimer: number;
  enrageTimer: number;
  enrageStacks: number;
  volatileTimer: number;
  mitosisDone: boolean;
  lastGoldenThreshold: number;
  mutations: MutationId[];
  mechanic: BiomeMechanicId | null;
};

type ProjectileEntity = {
  sprite: Phaser.GameObjects.Image;
  targetId: number | null;
  vx: number;
  vy: number;
  damage: number;
  isCrit: boolean;
  pierceLeft: number;
  hitIds: Set<number>;
  applyRoot: boolean;
  applyChill: boolean;
  isWave: boolean;
  isChainProc: boolean;
  dropFalconLoot: boolean;
  labelTag: string | null;
  life: number;
};

type LootDropEntity = {
  sprite: Phaser.GameObjects.Image;
  kind: 'coin' | 'orb' | 'chest';
  value: number;
  vx: number;
  vy: number;
  age: number;
};

type HazardEntity = {
  sprite: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
  fuse: number;
  damage: number;
};

export type DungeonSceneCallbacks = {
  onHudUpdate: (hud: RunHudSnapshot) => void;
  onRequestDraft: (floor: number, equippedBuffIds: string[], silverMult: number) => void;
  onRequestRoulette: (floor: number, count: number, exclude: MutationId[]) => void;
  onRequestExtraction: (floor: number, gold: number, shards: number, cores: number) => void;
  onRunEnded: (payload: RunEndPayload) => void;
  onRegisterBridge: (bridge: DungeonBridge) => void;
};

export class DungeonScene extends Scene {
  private callbacks: DungeonSceneCallbacks | null = null;

  private skyRect: Phaser.GameObjects.Rectangle | null = null;
  private hillsGraphics: Phaser.GameObjects.TileSprite | null = null;
  private floorTile: Phaser.GameObjects.TileSprite | null = null;
  private floorTrim: Phaser.GameObjects.Rectangle | null = null;

  private heroSprite: Phaser.GameObjects.Image | null = null;
  private heroCapeSprite: Phaser.GameObjects.Image | null = null;
  private heroTopSprite: Phaser.GameObjects.Image | null = null;
  private heroHelmSprite: Phaser.GameObjects.Image | null = null;
  private heroWeaponSprite: Phaser.GameObjects.Image | null = null;
  private weaponAngle: number = 0;
  private weaponSwingOffsetX: number = 0;
  private weaponSwingOffsetY: number = 0;
  private weaponTween: Phaser.Tweens.Tween | null = null;
  private heroAura: Phaser.GameObjects.Arc | null = null;
  private heroGlow: Phaser.GameObjects.Arc | null = null;
  private hawkSprite: Phaser.GameObjects.Image | null = null;
  private wolfSprite: Phaser.GameObjects.Image | null = null;
  private runeBooks: Phaser.GameObjects.Image[] = [];

  private runConfig: RunStartPayload | null = null;
  private activeBiome: BiomeDefinition = getBiomeById('slime_bog');
  private rng: () => number = mulberry32(1);

  private phase: 'idle' | 'walking' | 'combat' | 'paused' = 'idle';
  private floor: number = 1;
  private waveIndex: number = 1;
  private totalWavesOnFloor: number = 2;
  private walkTimer: number = 0;
  private elapsedRunMs: number = 0;
  private speedMult: 1 | 2 = 1;
  private autoSkill: boolean = true;

  private stats: ComputedHeroStats | null = null;
  private heroHp: number = 200;
  private heroShield: number = 0;
  private heroX: number = 170;
  private groundY: number = 500;

  private attackTimer: number = 0;
  private attackCount: number = 0;
  private skillTimer: number = 0;
  private potionCharges: number = 1;
  private potionCooldown: number = 0;
  private fastingFloorsLeft: number = 0;
  private unhitTimer: number = 0;
  private invulnHitsLeft: number = 0;
  private dashCooldown: number = 0;
  private hawkTimer: number = 0;
  private wolfTimer: number = 0;
  private runeZapTimer: number = 0;
  private meteorTimer: number = 0;
  private volatileSoulTimer: number = 0;
  private battleMomentumTimer: number = 0;
  private battleMomentumStacks: number = 0;
  private vampiricTouchCd: number = 0;
  private phoenixReviveUsed: boolean = false;
  private dodgeCount: number = 0;

  private goldCollected: number = 0;
  private shardsCollected: number = 0;
  private coresCollected: number = 0;
  private draftedBuffIds: string[] = [];
  private wuxiaArtTimers: Record<string, number> = {};
  private currentBossMutations: MutationId[] = [];
  private lastBossMutations: MutationId[] = [];
  private floorsCleared: number = 0;

  private nextEnemyId: number = 1;
  private enemies: EnemyEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private loots: LootDropEntity[] = [];
  private hazards: HazardEntity[] = [];
  private hudSyncTimer: number = 0;

  constructor() {
    super('DungeonScene');
  }

  public setCallbacks(callbacks: DungeonSceneCallbacks): void {
    this.callbacks = callbacks;
    callbacks.onRegisterBridge({
      startRun: (payload) => this.startRun(payload),
      stopToIdle: () => this.stopToIdle(),
      triggerActiveSkill: () => this.triggerActiveSkill(),
      triggerDash: () => this.triggerDash(),
      triggerPotion: () => this.triggerPotion(),
      toggleSpeed: () => this.toggleSpeed(),
      toggleAutoSkill: () => this.toggleAutoSkill(),
      resumeAfterDraft: (buffId) => this.resumeAfterDraft(buffId),
      resumeAfterRoulette: (mutations) => this.resumeAfterRoulette(mutations),
      resumeAfterExtraction: (extractNow) => this.resumeAfterExtraction(extractNow),
      retreatWithLoot: () => this.retreatWithLoot(),
    });
  }

  create(): void {
    registerPixelTextures(this);
    this.createWorldLayers();
    this.createHeroDisplay('warrior', 1);
    this.refreshLayout(this.scale.width, this.scale.height);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.refreshLayout(gameSize.width, gameSize.height);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.phase !== 'combat' || this.enemies.length === 0) return;
      this.attackTimer += 0.22;
      this.skillTimer = Math.max(0, this.skillTimer - 0.25);
      this.spawnFloatingText(pointer.x, pointer.y - 10, '+HASTE!', '#fde047', 11);
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.phase !== 'combat') return;
      if (event.code === 'KeyQ') {
        this.triggerActiveSkill();
      } else if (event.code === 'KeyE' || event.code === 'Space') {
        event.preventDefault();
        this.triggerDash();
      } else if (event.code === 'KeyW') {
        this.triggerPotion();
      }
    });

    if (this.callbacks) {
      this.callbacks.onRegisterBridge({
        startRun: (payload) => this.startRun(payload),
        stopToIdle: () => this.stopToIdle(),
        triggerActiveSkill: () => this.triggerActiveSkill(),
        triggerDash: () => this.triggerDash(),
        triggerPotion: () => this.triggerPotion(),
        toggleSpeed: () => this.toggleSpeed(),
        toggleAutoSkill: () => this.toggleAutoSkill(),
        resumeAfterDraft: (buffId) => this.resumeAfterDraft(buffId),
        resumeAfterRoulette: (mutations) => this.resumeAfterRoulette(mutations),
        resumeAfterExtraction: (extractNow) => this.resumeAfterExtraction(extractNow),
        retreatWithLoot: () => this.retreatWithLoot(),
      });
    }
  }

  private createWorldLayers(): void {
    const w = this.scale.width || 1024;
    const h = this.scale.height || 768;

    this.skyRect = this.add.rectangle(w / 2, h / 2, w, h, this.activeBiome.skyTopHex).setDepth(0);

    // Procedural parallax silhouette tile
    if (!this.textures.exists('parallax_hills')) {
      const tex = this.textures.createCanvas('parallax_hills', 256, 140);
      if (tex) {
        const ctx = tex.getContext();
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.beginPath();
        ctx.moveTo(0, 140);
        ctx.lineTo(42, 48);
        ctx.lineTo(98, 92);
        ctx.lineTo(156, 26);
        ctx.lineTo(214, 84);
        ctx.lineTo(256, 52);
        ctx.lineTo(256, 140);
        ctx.closePath();
        ctx.fill();
        tex.refresh();
      }
    }

    if (!this.textures.exists('ground_bricks')) {
      const tex = this.textures.createCanvas('ground_bricks', 64, 64);
      if (tex) {
        const ctx = tex.getContext();
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(0, 0, 64, 4);
        ctx.fillRect(0, 30, 64, 3);
        ctx.fillRect(30, 0, 3, 30);
        ctx.fillRect(10, 32, 3, 32);
        tex.refresh();
      }
    }

    this.hillsGraphics = this.add
      .tileSprite(w / 2, h * 0.62, w, 140, 'parallax_hills')
      .setTint(this.activeBiome.pillarColorHex)
      .setAlpha(0.65)
      .setDepth(1);

    this.floorTile = this.add
      .tileSprite(w / 2, h * 0.85, w, 240, 'ground_bricks')
      .setTint(this.activeBiome.floorBodyHex)
      .setDepth(2);

    this.floorTrim = this.add
      .rectangle(w / 2, h * 0.72, w, 14, this.activeBiome.floorTopHex)
      .setDepth(3);
  }

  private createHeroDisplay(classId: ClassId, level: number): void {
    this.heroAura?.destroy();
    this.heroGlow?.destroy();
    this.heroCapeSprite?.destroy();
    this.heroSprite?.destroy();
    this.heroTopSprite?.destroy();
    this.heroHelmSprite?.destroy();
    this.heroWeaponSprite?.destroy();
    this.hawkSprite?.destroy();
    this.wolfSprite?.destroy();
    for (const book of this.runeBooks) book.destroy();
    this.runeBooks = [];
    this.weaponAngle = 0;
    this.weaponSwingOffsetX = 0;
    this.weaponSwingOffsetY = 0;

    const equipped = this.runConfig?.profile.classes[classId].equipped ?? {
      weapon: null,
      headgear: null,
      top: null,
      cape: null,
    };
    const gearStyle = getGearVisualStyle(classId, equipped);
    const clsColor = getClassDefinition(classId).colorInt;

    this.heroAura = this.add
      .circle(this.heroX, this.groundY - 28, 36, clsColor, level >= 60 ? 0.28 : level >= 35 ? 0.16 : 0.08)
      .setDepth(4);

    this.heroGlow = this.add
      .circle(
        this.heroX + 16,
        this.groundY - 26,
        15,
        gearStyle.weaponGlowTint ?? 0xfef08a,
        gearStyle.weaponGlowTint ? 0.34 : level >= 15 ? 0.22 : 0
      )
      .setDepth(4.5);

    this.heroCapeSprite = this.add
      .image(this.heroX, this.groundY - 28, 'gear_cape')
      .setTint(gearStyle.capeTint)
      .setVisible(gearStyle.hasCape)
      .setDepth(5);

    this.heroSprite = this.add
      .image(this.heroX, this.groundY - 28, `hero_${classId}`)
      .setDepth(6);

    this.heroTopSprite = this.add
      .image(this.heroX, this.groundY - 28, `gear_top_${classId}`)
      .setTint(gearStyle.topTint)
      .setVisible(gearStyle.hasTop)
      .setDepth(6.2);

    this.heroHelmSprite = this.add
      .image(this.heroX, this.groundY - 28, `gear_head_${classId}`)
      .setTint(gearStyle.headTint)
      .setVisible(gearStyle.hasHead)
      .setDepth(6.4);

    this.heroWeaponSprite = this.add
      .image(this.heroX + 16, this.groundY - 26, `gear_wep_${classId}`)
      .setTint(gearStyle.weaponTint)
      .setVisible(gearStyle.hasWeapon)
      .setDepth(6.6);

    if (this.hasEquippedLegendary('bow_cape_goldenfalcon')) {
      this.hawkSprite = this.add
        .image(this.heroX - 38, this.groundY - 92, 'pet_hawk')
        .setDepth(6);
    } else {
      this.hawkSprite = null;
    }
    this.wolfSprite = null;
    this.syncHeroWuxiaWeapon();
  }

  private syncHeroWuxiaWeapon(activeStyle?: WuxiaArtStyle | null): void {
    if (!this.heroWeaponSprite || !this.runConfig) return;
    const equipped = this.runConfig.profile.classes[this.runConfig.classId].equipped;
    const gearStyle = getGearVisualStyle(this.runConfig.classId, equipped);
    const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
    const firstArt = loadout.actives[0] ? getWuxiaActiveArtById(loadout.actives[0].id) : null;
    const style = activeStyle !== undefined ? activeStyle : (firstArt?.style ?? null);

    if (style === 'jade_swords' || style === 'six_pulse') {
      this.heroWeaponSprite
        .setTexture('wep_wuxia_sword')
        .setTint(style === 'six_pulse' ? 0x0ea5e9 : 0x38bdf8)
        .setVisible(true);
    } else if (style === 'staff_spin') {
      this.heroWeaponSprite.setTexture('wep_wuxia_staff').setTint(0x10b981).setVisible(true);
    } else if (style === 'iron_cleave') {
      this.heroWeaponSprite.setTexture('wep_wuxia_heavy_sword').setTint(0xa855f7).setVisible(true);
    } else if (style === 'flute_sonic') {
      this.heroWeaponSprite.setTexture('wep_wuxia_flute').setTint(0x2dd4bf).setVisible(true);
    } else if (style === 'venom_needles') {
      this.heroWeaponSprite.setTexture('wep_wuxia_needles').setTint(0x818cf8).setVisible(true);
    } else if (style === 'palm_wave' || style === 'flicking_finger' || !gearStyle.hasWeapon) {
      this.heroWeaponSprite.setVisible(false);
    } else {
      this.heroWeaponSprite
        .setTexture(`gear_wep_${this.runConfig.classId}`)
        .setTint(gearStyle.weaponTint)
        .setVisible(true);
    }
  }

  private refreshLayout(width: number, height: number): void {
    this.cameras.resize(width, height);
    this.groundY = Math.round(height * 0.68);
    this.heroX = Math.max(90, Math.round(width * 0.18));

    if (this.skyRect) {
      this.skyRect.setPosition(width / 2, height / 2).setSize(width, height);
    }
    if (this.hillsGraphics) {
      this.hillsGraphics.setPosition(width / 2, this.groundY - 70).setSize(width, 140);
    }
    if (this.floorTrim) {
      this.floorTrim.setPosition(width / 2, this.groundY + 4).setSize(width, 14);
    }
    if (this.floorTile) {
      const floorH = Math.max(120, height - this.groundY);
      this.floorTile.setPosition(width / 2, this.groundY + floorH / 2).setSize(width, floorH);
    }
    if (this.heroSprite) {
      this.heroSprite.setPosition(this.heroX, this.groundY - 28);
      this.updateCompanionVisuals();
    }
    for (const e of this.enemies) {
      const ey = this.groundY - (e.isBoss && !e.isMiniBoss ? 44 : e.isBoss ? 34 : 24);
      e.sprite.y = ey;
      e.sprite.x = Math.max(this.heroX + 74, Math.min(width - 55, e.sprite.x));
    }
  }

  private applyBiomeVisuals(biome: BiomeDefinition): void {
    this.activeBiome = biome;
    this.skyRect?.setFillStyle(biome.skyTopHex);
    this.hillsGraphics?.setTint(biome.pillarColorHex);
    this.floorTile?.setTint(biome.floorBodyHex);
    this.floorTrim?.setFillStyle(biome.floorTopHex);
  }

  private clearCombatEntities(): void {
    for (const e of this.enemies) {
      e.sprite.destroy();
      e.hpBg.destroy();
      e.hpFill.destroy();
      e.nameText.destroy();
    }
    this.enemies = [];

    for (const p of this.projectiles) p.sprite.destroy();
    this.projectiles = [];

    for (const l of this.loots) l.sprite.destroy();
    this.loots = [];

    for (const h of this.hazards) {
      h.sprite.destroy();
      h.ring.destroy();
    }
    this.hazards = [];
  }

  public stopToIdle(): void {
    this.phase = 'idle';
    this.clearCombatEntities();
  }

  public startRun(payload: RunStartPayload): void {
    this.clearCombatEntities();
    this.runConfig = payload;
    this.rng = mulberry32(payload.seed);
    this.applyBiomeVisuals(getBiomeById(payload.biomeId));

    const clsLevel = payload.profile.classes[payload.classId].level;
    this.createHeroDisplay(payload.classId, clsLevel);

    this.floor = 1;
    this.waveIndex = 1;
    this.totalWavesOnFloor = 1;
    this.elapsedRunMs = 0;
    this.goldCollected = 0;
    this.shardsCollected = 0;
    this.coresCollected = 0;
    this.draftedBuffIds = [];
    this.wuxiaArtTimers = {};
    this.currentBossMutations = [];
    this.lastBossMutations = [];
    this.floorsCleared = 0;

    this.potionCharges = 1;
    this.potionCooldown = 0;
    this.fastingFloorsLeft = 0;
    this.attackTimer = 0;
    this.attackCount = 0;
    this.skillTimer = 0;
    this.unhitTimer = 5;
    this.dashCooldown = 0;
    this.hawkTimer = 0;
    this.wolfTimer = 0;
    this.runeZapTimer = 0;
    this.meteorTimer = 0;
    this.volatileSoulTimer = 0;
    this.battleMomentumTimer = 0;
    this.battleMomentumStacks = 0;
    this.vampiricTouchCd = 0;
    this.phoenixReviveUsed = false;
    this.dodgeCount = 0;

    this.recomputeStats();
    this.heroHp = this.stats ? this.stats.maxHp : 200;
    this.applyFloorStartShieldsAndPassives();

    this.spawnCompanionVisuals();
    this.beginFloor(1);
    this.emitHud();
  }

  private hasEquippedLegendary(legendaryId: string): boolean {
    if (!this.runConfig) return false;
    const cls = this.runConfig.profile.classes[this.runConfig.classId];
    const slots: readonly GearSlot[] = ['weapon', 'headgear', 'top', 'cape'];
    for (const s of slots) {
      if (cls.equipped[s]?.legendaryId === legendaryId) return true;
    }
    return false;
  }

  private isEquippedLegendaryCursed(legendaryId: string): boolean {
    if (!this.runConfig) return false;
    const cls = this.runConfig.profile.classes[this.runConfig.classId];
    const slots: readonly GearSlot[] = ['weapon', 'headgear', 'top', 'cape'];
    for (const s of slots) {
      const item = cls.equipped[s];
      if (item?.legendaryId === legendaryId) return item.isCursed;
    }
    return false;
  }

  private getWeaponSockets(): ElementId[] {
    if (!this.runConfig) return [];
    const wep = this.runConfig.profile.classes[this.runConfig.classId].equipped.weapon;
    return wep ? wep.sockets : [];
  }

  private spawnCompanionVisuals(): void {
    if (!this.runConfig) return;
    if (
      (this.hasEquippedLegendary('bow_head_beastmaster') ||
        this.draftedBuffIds.includes('prism_bow_spectral_pack')) &&
      !this.wolfSprite
    ) {
      this.wolfSprite = this.add
        .image(this.heroX + 36, this.groundY - 18, 'pet_wolf')
        .setDepth(6);
    }

    if (this.hasEquippedLegendary('bow_cape_goldenfalcon') && !this.hawkSprite) {
      this.hawkSprite = this.add
        .image(this.heroX - 38, this.groundY - 92, 'pet_hawk')
        .setDepth(6);
    }

    if (this.hasEquippedLegendary('mage_cape_tome') && this.runeBooks.length === 0) {
      this.runeBooks = [
        this.add.image(this.heroX, this.groundY - 60, 'rune_book').setDepth(7),
        this.add.image(this.heroX, this.groundY - 60, 'rune_book').setDepth(7),
      ];
    }
  }

  private recomputeStats(): void {
    if (!this.runConfig) return;
    this.stats = computeHeroCombatStats(
      this.runConfig.profile,
      this.runConfig.classId,
      this.draftedBuffIds,
      this.goldCollected,
      this.floorsCleared
    );
  }

  private applyFloorStartShieldsAndPassives(): void {
    if (!this.stats) return;
    const wuxia = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
    this.heroShield =
      computeFloorStartShield(
        this.stats.maxHp,
        this.draftedBuffIds,
        this.hasEquippedLegendary('war_cape_aegis'),
        this.isEquippedLegendaryCursed('war_cape_aegis')
      ) + wuxia.aggregatedStats.shieldOnFloor;
    if (this.hasEquippedLegendary('war_head_balrog')) {
      this.invulnHitsLeft = this.isEquippedLegendaryCursed('war_head_balrog') ? 1 : 3;
    } else {
      this.invulnHitsLeft = 0;
    }
  }

  private beginFloor(floorNum: number): void {
    this.floor = floorNum;
    this.waveIndex = 1;
    this.potionCharges = 1;
    this.currentBossMutations = [];
    this.applyFloorStartShieldsAndPassives();

    if (
      isCultLeaderFloor(floorNum) ||
      isRandomMiniBossFloor(floorNum, this.runConfig?.seed ?? 1)
    ) {
      this.totalWavesOnFloor = 1;
      this.phase = 'paused';
      const baseCount = isCultLeaderFloor(floorNum)
        ? Math.min(3, Math.max(1, Math.floor(floorNum / 10)))
        : 1;
      const count = Math.max(baseCount, computeBossRouletteCount(floorNum, this.draftedBuffIds));
      this.callbacks?.onRequestRoulette(floorNum, count, this.lastBossMutations);
      this.emitHud();
      return;
    }

    this.totalWavesOnFloor = floorNum <= 1 ? 1 : 2;
    this.phase = 'walking';
    this.walkTimer = 1.1;
    this.spawnFloatingText(this.scale.width / 2, this.groundY - 140, `FLOOR ${floorNum}`, '#fde047', 26);
    this.emitHud();
  }

  public resumeAfterRoulette(mutations: MutationId[]): void {
    this.currentBossMutations = [...mutations];
    this.lastBossMutations = [...mutations];
    this.phase = 'walking';
    this.walkTimer = 0.9;
    const isCultLeader = isCultLeaderFloor(this.floor);
    const label = isCultLeader
      ? `CULT LEADER (F${this.floor}): ${this.activeBiome.endBossName}`
      : `HALL MASTER AMBUSH: ${this.activeBiome.miniBossName}`;
    this.spawnFloatingText(this.scale.width / 2, this.groundY - 150, label, '#f97316', 22);
    soundFX.playBossRoar();
    this.emitHud();
  }

  private spawnWave(): void {
    const w = this.scale.width || 1024;
    const hpMult = computeEnemySpawnHpMult(this.draftedBuffIds);
    const runSeed = this.runConfig?.seed ?? 1;
    const isCultLeader = isCultLeaderFloor(this.floor);
    const isMiniBoss = isRandomMiniBossFloor(this.floor, runSeed);
    const bracket = Math.floor((this.floor - 1) / 10);
    const realmHpMult =
      this.floor <= 10
        ? 1 + (this.floor - 1) * 0.08
        : this.floor <= 20
          ? 1.72 * Math.pow(1.12, this.floor - 10)
          : this.floor <= 30
            ? 5.3 * Math.pow(1.14, this.floor - 20)
            : 19.7 * Math.pow(1.15, this.floor - 30);
    const realmAtkMult =
      this.floor <= 10
        ? 1
        : this.floor <= 20
          ? 1 + (this.floor - 10) * 0.14
          : 2.4 * Math.pow(1.09, this.floor - 20);

    if (isCultLeader || isMiniBoss) {
      const isEndBoss = isCultLeader;
      const bossTier = Math.max(1, Math.floor(this.floor / 10));
      const cultLeaderHp =
        bossTier === 1
          ? 4800
          : bossTier === 2
            ? 28000
            : bossTier === 3
              ? 115000
              : Math.round(115000 * Math.pow(3.4, bossTier - 3));
      const cultLeaderAtk =
        bossTier === 1
          ? 68
          : bossTier === 2
            ? 240
            : bossTier === 3
              ? 620
              : Math.round(620 * Math.pow(2.2, bossTier - 3));
      const baseHp = isEndBoss
        ? cultLeaderHp
        : Math.round((360 + this.floor * 85) * realmHpMult * (this.floor >= 11 ? 2.6 : 1.65));
      const baseAtk = isEndBoss
        ? cultLeaderAtk
        : Math.round((14 + this.floor * 3.2) * realmAtkMult * 1.65);
      const name = isEndBoss ? `${this.activeBiome.endBossName} (F${this.floor})` : this.activeBiome.miniBossName;

      if (this.currentBossMutations.includes('twin_soul')) {
        this.spawnBossEntity(name, w - 160, Math.round(baseHp * 0.65 * hpMult), baseAtk, isEndBoss, false);
        this.spawnBossEntity(
          `${name} (Shade)`,
          w - 95,
          Math.round(baseHp * 0.35 * hpMult),
          Math.round(baseAtk * 0.75),
          isEndBoss,
          true
        );
      } else {
        this.spawnBossEntity(name, w - 150, Math.round(baseHp * hpMult), baseAtk, isEndBoss, false);
      }
      return;
    }

    const isFinalWave = this.waveIndex === this.totalWavesOnFloor;
    const isEliteFloor = this.floor > 1 && (this.floor % 10 === 7 || this.floor % 10 === 9);
    const mobCount =
      this.floor === 1
        ? 3
        : 3 + Math.min(5, Math.floor(this.floor / 4)) + (isFinalWave ? 1 : 0);
    const eliteChance =
      this.floor < 3 ? 0 : Math.min(0.65, 0.18 + bracket * 0.14 + (this.floor % 10) * 0.015);
    const spacing = Math.min(
      95,
      Math.max(38, Math.floor((w - this.heroX - 180) / Math.max(1, mobCount - 1)))
    );
    for (let i = 0; i < mobCount; i++) {
      const kindIdx = Math.floor(this.rng() * 3);
      const textureKey = `mob_${kindIdx}`;
      const tint = this.activeBiome.mobColors[kindIdx] ?? 0x6ede8a;
      const mobName = this.activeBiome.mobNames[kindIdx] ?? 'Cultist';
      const isElite =
        (isEliteFloor && i === mobCount - 1) ||
        (this.floor >= 3 && (this.rng() < eliteChance || (isFinalWave && i === 0 && this.floor >= 5)));
      const maxHp = Math.round(
        (46 + this.floor * 28 + this.waveIndex * 14) *
          realmHpMult *
          (isElite ? 2.15 : 1) *
          hpMult
      );
      const atk = Math.round((7 + this.floor * 2.2) * realmAtkMult * (isElite ? 1.45 : 1));
      const x = Math.max(this.heroX + 130, w - 75 - i * spacing);
      const y = this.groundY - 24;

      const sprite = this.add.image(x, y, textureKey).setTint(tint).setDepth(6);
      if (isElite) sprite.setScale(1.3);

      const hpBg = this.add.rectangle(x, y - 42, 46, 6, 0x0f172a).setDepth(8);
      const hpFill = this.add.rectangle(x, y - 42, 46, 6, isElite ? 0xa855f7 : 0xef4444).setDepth(9);
      const nameText = this.add
        .text(x, y - 54, isElite ? `★ ${mobName}` : mobName, {
          fontSize: '10px',
          color: isElite ? '#e9d5ff' : '#cbd5e1',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setVisible(isElite)
        .setDepth(9);

      this.enemies.push({
        id: this.nextEnemyId++,
        sprite,
        hpBg,
        hpFill,
        nameText,
        name: mobName,
        isBoss: false,
        isMiniBoss: isElite,
        isSplitClone: false,
        hp: maxHp,
        maxHp,
        hitShield: isElite && this.floor >= 11 ? Math.min(6, 1 + bracket) : 0,
        atk,
        atkIntervalSec: Math.max(0.78, (isElite ? 1.28 : 1.52) - this.floor * 0.018),
        atkTimer: 0.5 + this.rng() * 0.6,
        speed: (36 + Math.min(48, this.floor * 1.5)) * (isElite ? 1.18 : 1),
        armorShred: 0,
        burnStacks: 0,
        burnTimer: 0,
        bleedStacks: 0,
        bleedTimer: 0,
        chillTimer: 0,
        rootTimer: 0,
        stunTimer: 0,
        smokeTimer: 0,
        smokeActiveTimer: 0,
        permafrostTimer: 0,
        overheatTimer: 0,
        enrageTimer: 0,
        enrageStacks: 0,
        volatileTimer: 0,
        mitosisDone: false,
        lastGoldenThreshold: 100,
        mutations: [],
        mechanic: null,
      });
    }
  }

  private spawnBossEntity(
    name: string,
    x: number,
    baseHp: number,
    baseAtk: number,
    isEndBoss: boolean,
    isSplitClone: boolean
  ): void {
    const mutations = this.currentBossMutations;
    let maxHp = baseHp;
    let atkIntervalSec = Math.max(0.68, (isEndBoss ? 1.15 : 1.32) - this.floor * 0.012);
    let scale = isSplitClone ? 0.78 : 1;

    if (mutations.includes('juggernaut')) {
      maxHp = Math.round(maxHp * 1.3);
      atkIntervalSec *= 1.2;
      scale *= 1.2;
    }
    if (mutations.includes('hasted')) {
      maxHp = Math.round(maxHp * 0.8);
      atkIntervalSec = Math.max(0.55, atkIntervalSec * 0.72);
    }

    const y = this.groundY - (isEndBoss ? 52 : 40);
    const barOffset = isEndBoss ? 68 : 56;
    const key = isEndBoss ? 'endboss' : 'miniboss';
    const baseColor = this.activeBiome.mobColors[0] ?? 0xef4444;
    const tint = mutations.includes('golden_gilded')
      ? 0xffd700
      : isSplitClone
        ? 0xc084fc
        : baseColor;

    const sprite = this.add.image(x, y, key).setTint(tint).setScale(scale).setDepth(6);
    const hpBg = this.add.rectangle(x, y - barOffset, 96, 8, 0x0f172a).setDepth(8);
    const hpFill = this.add.rectangle(x, y - barOffset, 96, 8, 0xf97316).setDepth(9);
    const nameText = this.add
      .text(x, y - barOffset - 14, name, {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fde047',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(9);

    this.enemies.push({
      id: this.nextEnemyId++,
      sprite,
      hpBg,
      hpFill,
      nameText,
      name,
      isBoss: true,
      isMiniBoss: !isEndBoss,
      isSplitClone,
      hp: maxHp,
      maxHp,
      hitShield: 0,
      atk: baseAtk,
      atkIntervalSec,
      atkTimer: 0.9,
      speed: 28 + Math.min(28, this.floor * 0.8),
      armorShred: 0,
      burnStacks: 0,
      burnTimer: 0,
      bleedStacks: 0,
      bleedTimer: 0,
      chillTimer: 0,
      rootTimer: 0,
      stunTimer: 0,
      smokeTimer: 6,
      smokeActiveTimer: 0,
      permafrostTimer: 8,
      overheatTimer: 1.5,
      enrageTimer: 5,
      enrageStacks: 0,
      volatileTimer: 4.5,
      mitosisDone: isSplitClone,
      lastGoldenThreshold: 100,
      mutations: [...mutations],
      mechanic: this.activeBiome.mechanicId,
    });
  }

  override update(_time: number, deltaMs: number): void {
    if (this.phase === 'idle' || this.phase === 'paused') return;

    const dt = Math.min(0.05, (deltaMs / 1000) * this.speedMult);
    this.elapsedRunMs += deltaMs * this.speedMult;

    if (this.phase === 'walking') {
      this.walkTimer -= dt;
      if (this.hillsGraphics) this.hillsGraphics.tilePositionX += 36 * dt;
      if (this.floorTile) this.floorTile.tilePositionX += 110 * dt;
      if (this.heroSprite) {
        this.heroSprite.y = this.groundY - 28 + Math.sin(this.elapsedRunMs * 0.015) * 4;
        this.heroSprite.rotation = Math.sin(this.elapsedRunMs * 0.015) * 0.05;
      }
      if (this.walkTimer <= 0) {
        if (this.heroSprite) this.heroSprite.rotation = 0;
        this.phase = 'combat';
        this.spawnWave();
      }
      this.updateCompanionVisuals();
      return;
    }

    if (this.phase === 'combat') {
      if (this.heroSprite && !this.tweens.isTweening(this.heroSprite)) {
        this.heroSprite.y = this.groundY - 28 + Math.sin(this.elapsedRunMs * 0.005) * 1.8;
        this.heroSprite.rotation = 0;
      }
      this.updateCombat(dt);
      this.updateProjectiles(dt);
      this.updateHazards(dt);
      this.updateLootDrops(dt);
      this.updateCompanionVisuals();

      this.hudSyncTimer += deltaMs;
      if (this.hudSyncTimer >= 90) {
        this.hudSyncTimer = 0;
        this.emitHud();
      }
    }
  }

  private updateCompanionVisuals(): void {
    if (this.heroSprite) {
      const hx = this.heroSprite.x;
      const hy = this.heroSprite.y;
      const hRot = this.heroSprite.rotation;
      if (this.heroAura) this.heroAura.setPosition(hx, hy);
      if (this.heroGlow) {
        this.heroGlow.setPosition(
          hx + 16 + this.weaponSwingOffsetX,
          hy - 2 + this.weaponSwingOffsetY
        );
      }
      if (this.heroCapeSprite) {
        const flutter = Math.sin(this.elapsedRunMs * 0.01) * 0.06;
        this.heroCapeSprite.setPosition(hx, hy).setRotation(hRot + flutter);
      }
      if (this.heroTopSprite) {
        this.heroTopSprite.setPosition(hx, hy).setRotation(hRot);
      }
      if (this.heroHelmSprite) {
        this.heroHelmSprite.setPosition(hx, hy).setRotation(hRot);
      }
      if (this.heroWeaponSprite) {
        this.heroWeaponSprite
          .setPosition(hx + 16 + this.weaponSwingOffsetX, hy - 2 + this.weaponSwingOffsetY)
          .setRotation(this.weaponAngle + hRot);
      }
    }
    if (this.hawkSprite) {
      this.hawkSprite.setPosition(
        this.heroX - 30 + Math.sin(this.elapsedRunMs * 0.004) * 14,
        this.groundY - 94 + Math.cos(this.elapsedRunMs * 0.006) * 8
      );
    }
    if (this.wolfSprite) {
      this.wolfSprite.setPosition(
        this.heroX + 36 + Math.sin(this.elapsedRunMs * 0.007) * 10,
        this.groundY - 16
      );
    }
    for (let i = 0; i < this.runeBooks.length; i++) {
      const book = this.runeBooks[i];
      if (!book) continue;
      const angle = this.elapsedRunMs * 0.004 + i * Math.PI;
      book.setPosition(
        this.heroX + Math.cos(angle) * 44,
        this.groundY - 34 + Math.sin(angle) * 24
      );
    }
  }

  private updateCombat(dt: number): void {
    if (!this.stats || !this.runConfig) return;

    this.unhitTimer += dt;
    if (this.potionCooldown > 0) this.potionCooldown = Math.max(0, this.potionCooldown - dt);
    if (this.skillTimer > 0) this.skillTimer = Math.max(0, this.skillTimer - dt);
    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.vampiricTouchCd > 0) this.vampiricTouchCd = Math.max(0, this.vampiricTouchCd - dt);
    if (this.battleMomentumTimer > 0) {
      this.battleMomentumTimer -= dt;
      if (this.battleMomentumTimer <= 0) this.battleMomentumStacks = 0;
    }

    // 1st Job Warrior regen (Lv. 15+)
    if (this.runConfig.classId === 'warrior' && this.runConfig.profile.classes.warrior.level >= 15) {
      this.healHero(this.stats.maxHp * 0.015 * dt, false);
    }

    // Auto-Skill check (Dantian Burst)
    if (this.autoSkill && this.skillTimer <= 0 && this.enemies.length > 0) {
      this.triggerActiveSkill();
    }

    // Vampire-Survivors-style passive auto-cycle for drafted Wuxia Martial Arts
    if (this.enemies.length > 0) {
      const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
      const cdMult = 1 - this.stats.cooldownReductionPct / 100;
      for (const slot of loadout.actives) {
        const art = getWuxiaActiveArtById(slot.id);
        if (!art) continue;
        const syn = loadout.awakenedSynergies.includes(art.synergyId)
          ? getWuxiaSynergyById(art.synergyId)
          : null;
        const baseCdMs = syn ? syn.cooldownMs : (art.cooldownsMs[slot.level - 1] ?? 2600);
        const cdSec = Math.max(0.75, (baseCdMs / 1000) * cdMult);
        const curTimer = (this.wuxiaArtTimers[art.id] ?? 0.35) - dt;
        if (curTimer <= 0) {
          this.wuxiaArtTimers[art.id] = cdSec;
          this.castWuxiaActiveArt(art.id, false);
        } else {
          this.wuxiaArtTimers[art.id] = curTimer;
        }
      }
    }

    // Cape: Cloak of the Arcane Tempest meteor every 10s (14s cursed)
    if (this.hasEquippedLegendary('mage_cape_tempest')) {
      this.meteorTimer += dt;
      const interval = this.isEquippedLegendaryCursed('mage_cape_tempest') ? 14 : 10;
      if (this.meteorTimer >= interval && this.enemies.length > 0) {
        this.meteorTimer = 0;
        const dmg = this.stats.atk * 2.6 * this.stats.allDamageMult;
        for (const e of [...this.enemies]) {
          this.damageEnemy(e, dmg, false, 'METEOR');
        }
        soundFX.playSpell();
      }
    }

    // Cursed: Volatile Soul AoE pulse every 5s
    if (this.draftedBuffIds.includes('cursed_volatile_soul')) {
      this.volatileSoulTimer += dt;
      if (this.volatileSoulTimer >= 5 && this.enemies.length > 0) {
        this.volatileSoulTimer = 0;
        this.heroHp = Math.max(1, this.heroHp * 0.98);
        const dmg = this.stats.atk * 1.8 * this.stats.allDamageMult;
        for (const e of [...this.enemies]) {
          this.damageEnemy(e, dmg, false, 'PULSE');
        }
      }
    }

    // Orbiting Rune Books
    if (this.runeBooks.length > 0) {
      this.runeZapTimer += dt;
      if (this.runeZapTimer >= 1.2 && this.enemies.length > 0) {
        this.runeZapTimer = 0;
        const target = this.getClosestEnemy();
        const book = this.runeBooks[0];
        if (target && book) {
          const vx = 560;
          const travelSec = Math.max(0.08, (target.sprite.x - book.x) / vx);
          const vy = (target.sprite.y - book.y) / travelSec;
          this.spawnProjectile(
            'proj_bolt',
            book.x,
            book.y,
            vx,
            vy,
            this.stats.atk * 0.65,
            false,
            1,
            false,
            false,
            false,
            target.id,
            false,
            false,
            'RUNE'
          );
        }
      }
    }

    // Relic Companions (Golden Falcon & Spectral Wolf)
    if (this.hawkSprite || this.hasEquippedLegendary('bow_cape_goldenfalcon')) {
      this.hawkTimer += dt;
      if (this.hawkTimer >= 1.5 && this.enemies.length > 0) {
        this.hawkTimer = 0;
        const target = this.getClosestEnemy();
        if (target) {
          const inherit = this.hasEquippedLegendary('bow_top_apexpredator')
            ? this.isEquippedLegendaryCursed('bow_top_apexpredator')
              ? 0.75
              : 1
            : 0;
          const isCrit = inherit > 0 && this.rng() < this.stats.critRate;
          const dmg =
            this.stats.atk *
            0.65 *
            (isCrit ? 1 + (this.stats.critDmg - 1) * inherit : 1);
          const hx = this.hawkSprite ? this.hawkSprite.x : this.heroX - 24;
          const hy = this.hawkSprite ? this.hawkSprite.y : this.groundY - 92;
          const vx = 680;
          const travelSec = Math.max(0.08, (target.sprite.x - hx) / vx);
          const vy = (target.sprite.y - hy) / travelSec;
          const dropFalconLoot =
            this.hasEquippedLegendary('bow_cape_goldenfalcon') &&
            this.rng() < (this.isEquippedLegendaryCursed('bow_cape_goldenfalcon') ? 0.25 : 0.45);
          if (this.hawkSprite) {
            this.tweens.add({
              targets: this.hawkSprite,
              scale: 1.28,
              duration: 85,
              yoyo: true,
            });
          }
          this.spawnProjectile(
            'proj_hawk_feather',
            hx + 10,
            hy,
            vx,
            vy,
            dmg,
            isCrit,
            1,
            false,
            false,
            false,
            target.id,
            false,
            dropFalconLoot,
            'HAWK'
          );
        }
      }
    }

    if (this.wolfSprite) {
      this.wolfTimer += dt;
      const interval = this.isEquippedLegendaryCursed('bow_head_beastmaster') ? 1.5 : 1.3;
      if (this.wolfTimer >= interval && this.enemies.length > 0) {
        this.wolfTimer = 0;
        const target = this.getClosestEnemy();
        if (target) {
          this.tweens.add({
            targets: this.wolfSprite,
            scaleX: 1.3,
            scaleY: 0.85,
            duration: 90,
            yoyo: true,
          });
          this.spawnProjectile(
            'proj_wolf_fang',
            this.wolfSprite.x + 16,
            this.groundY - 22,
            640,
            0,
            this.stats.atk * 0.85,
            false,
            1,
            false,
            false,
            false,
            target.id,
            false,
            false,
            'WOLF'
          );
        }
      }
    }

    // Move enemies & tick enemy status effects / boss mechanics
    const frontEnemy = this.getClosestEnemy();
    const attackRange = Math.max(240, this.stats.range);
    const inRange = frontEnemy ? frontEnemy.sprite.x - this.heroX <= attackRange : false;

    if (!inRange && this.enemies.length > 0) {
      if (this.floorTile) this.floorTile.tilePositionX += 70 * dt;
      if (this.hillsGraphics) this.hillsGraphics.tilePositionX += 20 * dt;
    }

    for (const e of [...this.enemies]) {
      this.updateEnemy(e, dt, inRange);
    }

    // Hero basic attack
    if (frontEnemy && inRange) {
      const glassBonus =
        this.draftedBuffIds.includes('gold_glass_tempest') && this.unhitTimer >= 3 ? 0.45 : 0;
      const momentumBonus = this.battleMomentumStacks * 0.05;
      const effectiveSpeed = this.stats.attackSpeed * (1 + glassBonus + momentumBonus);
      this.attackTimer += dt;
      const interval = 1 / Math.max(0.3, effectiveSpeed);

      if (this.attackTimer >= interval) {
        this.attackTimer = 0;
        this.performHeroAttack(frontEnemy);
      }
    }

    // Wave clear check
    if (this.enemies.length === 0 && this.phase === 'combat') {
      this.onWaveCleared();
    }
  }

  private getClosestEnemy(): EnemyEntity | null {
    let best: EnemyEntity | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d = e.sprite.x - this.heroX;
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private spawnHeroAfterimage(tintHex: number): void {
    if (!this.heroSprite) return;
    const x = this.heroSprite.x;
    const y = this.heroSprite.y;
    const ghost = this.add
      .image(x, y, this.heroSprite.texture.key)
      .setTint(tintHex)
      .setAlpha(0.55)
      .setScale(this.heroSprite.scaleX, this.heroSprite.scaleY)
      .setDepth(5.6);
    this.tweens.add({
      targets: ghost,
      x: x - 14,
      alpha: 0,
      duration: 210,
      ease: 'Quad.easeOut',
      onComplete: () => ghost.destroy(),
    });
  }

  private spawnQiShockwaveRing(
    x: number,
    y: number,
    colorHex: number,
    maxRadius: number,
    durationMs = 260
  ): void {
    const ring = this.add
      .circle(x, y, 14)
      .setStrokeStyle(5, colorHex, 0.95)
      .setFillStyle(colorHex, 0.08)
      .setDepth(10);
    this.tweens.add({
      targets: ring,
      scale: Math.max(1.5, maxRadius / 14),
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private spawnWhirlingStaffVfx(
    x: number,
    y: number,
    radius: number,
    tintHex: number
  ): void {
    const wheel = this.add
      .image(x, y, 'fx_staff_wheel')
      .setTint(tintHex)
      .setScale(0.65)
      .setAlpha(0.95)
      .setDepth(11);
    this.tweens.add({
      targets: wheel,
      scale: Math.max(1.4, radius / 48),
      rotation: Math.PI * 3.5,
      alpha: 0.05,
      duration: 320,
      ease: 'Cubic.easeOut',
      onComplete: () => wheel.destroy(),
    });
    this.spawnQiShockwaveRing(x, y, tintHex, Math.min(280, radius * 0.72), 280);
  }

  private spawnFallingGreatswordVfx(
    targetX: number,
    targetY: number,
    tintHex: number,
    isSynergy: boolean
  ): void {
    const sword = this.add
      .image(targetX, targetY - 175, 'fx_iron_cleave')
      .setRotation(Math.PI / 2)
      .setTint(tintHex)
      .setScale(isSynergy ? 1.55 : 1.2)
      .setDepth(12);
    this.tweens.add({
      targets: sword,
      y: targetY - 8,
      scaleY: isSynergy ? 1.65 : 1.3,
      duration: 110,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.spawnQiShockwaveRing(
          targetX,
          targetY,
          tintHex,
          isSynergy ? 185 : 125,
          280
        );
        const fissure = this.add
          .rectangle(targetX, targetY + 18, isSynergy ? 195 : 130, 8, tintHex, 0.9)
          .setDepth(9);
        this.tweens.add({
          targets: fissure,
          scaleX: 1.25,
          alpha: 0,
          duration: 240,
          onComplete: () => fissure.destroy(),
        });
        this.cameras.main.shake(120, isSynergy ? 0.009 : 0.005);
        this.tweens.add({
          targets: sword,
          alpha: 0,
          duration: 190,
          onComplete: () => sword.destroy(),
        });
      },
    });
  }

  private playHeroAttackAnimation(classId: ClassId, scaleMult = 1): void {
    if (this.heroSprite) {
      this.tweens.killTweensOf(this.heroSprite);
      this.heroSprite.setPosition(this.heroX, this.groundY - 28).setScale(1, 1).setRotation(0);
      this.spawnHeroAfterimage(
        classId === 'thief' ? 0x38bdf8 : classId === 'mage' ? 0x2dd4bf : 0xfbbf24
      );
      this.tweens.add({
        targets: this.heroSprite,
        x: this.heroX + (classId === 'warrior' || classId === 'thief' ? 36 : 20) * scaleMult,
        y: this.groundY - 28 - 10 * scaleMult,
        rotation: 0.16,
        scaleX: 1.18,
        scaleY: 0.9,
        duration: 105,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (this.heroSprite?.active) {
            this.heroSprite
              .setPosition(this.heroX, this.groundY - 28)
              .setScale(1, 1)
              .setRotation(0);
          }
        },
      });
    }

    if (this.weaponTween) {
      this.weaponTween.stop();
      this.weaponTween = null;
    }

    const isUnarmed = !this.heroWeaponSprite?.visible;
    if (isUnarmed) {
      const seal = this.add
        .image(this.heroX + 34, this.groundY - 30, 'fx_taiji_seal')
        .setScale(0.45 * scaleMult)
        .setAlpha(0.92)
        .setDepth(10);
      this.tweens.add({
        targets: seal,
        x: this.heroX + 54,
        scale: 1.15 * scaleMult,
        rotation: Math.PI,
        alpha: 0,
        duration: 210,
        ease: 'Quad.easeOut',
        onComplete: () => seal.destroy(),
      });
      this.spawnSlashVfx(this.heroX + 46, this.groundY - 28, 0xfef08a, 1.25 * scaleMult);
      this.spawnSlashVfx(this.heroX + 34, this.groundY - 36, 0x38bdf8, 0.95 * scaleMult);
    }

    if (classId === 'warrior') {
      this.weaponAngle = -0.95;
      this.weaponSwingOffsetX = 4;
      this.weaponSwingOffsetY = -10;
      this.weaponTween = this.tweens.add({
        targets: this,
        weaponAngle: 1.35,
        weaponSwingOffsetX: 22,
        weaponSwingOffsetY: 10,
        duration: 115,
        ease: 'Cubic.easeOut',
        yoyo: true,
        onComplete: () => {
          this.weaponAngle = 0;
          this.weaponSwingOffsetX = 0;
          this.weaponSwingOffsetY = 0;
          this.weaponTween = null;
        },
      });
      if (!isUnarmed) {
        this.spawnSlashVfx(this.heroX + 48, this.groundY - 28, 0xfef08a, 1.2 * scaleMult);
      }
    } else if (classId === 'mage') {
      this.weaponAngle = -0.35;
      this.weaponSwingOffsetX = 6;
      this.weaponSwingOffsetY = -10;
      this.weaponTween = this.tweens.add({
        targets: this,
        weaponAngle: 0.2,
        weaponSwingOffsetX: 12,
        weaponSwingOffsetY: -4,
        duration: 110,
        yoyo: true,
        onComplete: () => {
          this.weaponAngle = 0;
          this.weaponSwingOffsetX = 0;
          this.weaponSwingOffsetY = 0;
          this.weaponTween = null;
        },
      });
      this.spawnHitSpark(this.heroX + 32, this.groundY - 36, false, 0x38bdf8);
    } else if (classId === 'thief') {
      this.weaponAngle = -0.55;
      this.weaponSwingOffsetX = 16;
      this.weaponSwingOffsetY = 0;
      this.weaponTween = this.tweens.add({
        targets: this,
        weaponAngle: 0.95,
        weaponSwingOffsetX: 24,
        weaponSwingOffsetY: 4,
        duration: 85,
        yoyo: true,
        onComplete: () => {
          this.weaponAngle = 0;
          this.weaponSwingOffsetX = 0;
          this.weaponSwingOffsetY = 0;
          this.weaponTween = null;
        },
      });
      this.spawnSlashVfx(this.heroX + 36, this.groundY - 28, 0xc084fc, 0.95 * scaleMult);
    } else {
      this.weaponAngle = -0.2;
      this.weaponSwingOffsetX = -5;
      this.weaponSwingOffsetY = 0;
      this.weaponTween = this.tweens.add({
        targets: this,
        weaponAngle: 0.1,
        weaponSwingOffsetX: 6,
        weaponSwingOffsetY: 0,
        duration: 85,
        yoyo: true,
        onComplete: () => {
          this.weaponAngle = 0;
          this.weaponSwingOffsetX = 0;
          this.weaponSwingOffsetY = 0;
          this.weaponTween = null;
        },
      });
    }
  }

  private spawnSlashVfx(x: number, y: number, tintHex: number, scale = 1): void {
    const slash = this.add
      .image(x, y, 'fx_slash_arc')
      .setTint(tintHex)
      .setScale(0.75 * scale)
      .setAlpha(0.95)
      .setDepth(10);
    this.tweens.add({
      targets: slash,
      x: x + 16,
      scale: 1.3 * scale,
      alpha: 0,
      duration: 160,
      ease: 'Quad.easeOut',
      onComplete: () => slash.destroy(),
    });
  }

  private spawnHitSpark(x: number, y: number, isCrit: boolean, tintHex = 0xfef08a): void {
    const spark = this.add
      .image(x, y, 'fx_hit_spark')
      .setTint(isCrit ? 0xfbbf24 : tintHex)
      .setScale(isCrit ? 1.15 : 0.75)
      .setDepth(11);
    this.tweens.add({
      targets: spark,
      scale: isCrit ? 1.8 : 1.25,
      rotation: 0.65,
      alpha: 0,
      duration: 140,
      ease: 'Quad.easeOut',
      onComplete: () => spark.destroy(),
    });
  }

  private spawnLightningVfx(x1: number, y1: number, x2: number, y2: number, colorHex = 0x38bdf8): void {
    const gfx = this.add.graphics().setDepth(11);
    gfx.lineStyle(3, colorHex, 0.95);
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    const segments = 4;
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const mx = Phaser.Math.Linear(x1, x2, t) + (this.rng() - 0.5) * 18;
      const my = Phaser.Math.Linear(y1, y2, t) + (this.rng() - 0.5) * 16;
      gfx.lineTo(mx, my);
    }
    gfx.lineTo(x2, y2);
    gfx.strokePath();
    this.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 170,
      onComplete: () => gfx.destroy(),
    });
  }

  private triggerStaticDischarge(originEnemy: EnemyEntity, atkMult = 0.8): void {
    if (!this.stats) return;
    const isCrit = this.rng() < this.stats.critRate;
    const raw =
      this.stats.atk *
      atkMult *
      this.stats.allDamageMult *
      (isCrit ? this.stats.critDmg : 1);
    const dmg = Math.max(1, Math.round(raw));

    const others = this.enemies.filter(
      (o) => o.id !== originEnemy.id && o.hp > 0 && Math.abs(o.sprite.x - originEnemy.sprite.x) <= 200
    );
    const targets = others.length > 0 ? others.slice(0, 2) : originEnemy.hp > 0 ? [originEnemy] : [];
    for (const e of targets) {
      this.spawnLightningVfx(originEnemy.sprite.x, originEnemy.sprite.y - 6, e.sprite.x, e.sprite.y, 0x38bdf8);
      this.damageEnemy(e, dmg, isCrit, 'CHAIN');
    }
  }

  private performHeroAttack(target: EnemyEntity): void {
    if (!this.stats || !this.runConfig) return;
    this.attackCount += 1;

    const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
    const primarySlot = loadout.actives[0];
    const primaryArt = primarySlot ? getWuxiaActiveArtById(primarySlot.id) : null;
    const stanceStyle = primaryArt?.style ?? null;
    this.syncHeroWuxiaWeapon(stanceStyle);

    const equippedWep = this.runConfig.profile.classes[this.runConfig.classId].equipped.weapon;
    const hasRelicWep = equippedWep !== null && !equippedWep.id.startsWith('starter_wep_');
    const animStyleClass: ClassId =
      stanceStyle === 'jade_swords' || stanceStyle === 'venom_needles'
        ? 'thief'
        : stanceStyle === 'flute_sonic'
          ? 'mage'
          : stanceStyle === 'six_pulse'
            ? 'bowman'
            : 'warrior';
    this.playHeroAttackAnimation(animStyleClass, 1);

    const rollHit = (dmgMult: number, forceCrit: boolean = false): { dmg: number; isCrit: boolean } => {
      if (!this.stats) return { dmg: 10, isCrit: false };
      let missingAtkBonus = 0;
      if (this.hasEquippedLegendary('war_head_unbroken')) {
        const missingPct = ((this.stats.maxHp - this.heroHp) / this.stats.maxHp) * 100;
        missingAtkBonus += Math.floor(missingPct / 2) * 0.01;
      }
      if (this.draftedBuffIds.includes('prism_war_undying_rage')) {
        const missingPct = ((this.stats.maxHp - this.heroHp) / this.stats.maxHp) * 100;
        missingAtkBonus += missingPct * 0.015;
      }

      const glassCritDmg =
        this.draftedBuffIds.includes('gold_glass_tempest') && this.unhitTimer >= 3 ? 0.25 : 0;

      const isCrit = forceCrit || this.rng() < this.stats.critRate;
      let raw = this.stats.atk * dmgMult * (this.stats.allDamageMult + missingAtkBonus);
      if (isCrit) {
        raw *= this.stats.critDmg + glassCritDmg;
      } else if (this.draftedBuffIds.includes('cursed_reckless_gamble')) {
        raw *= 0.5;
      }
      return { dmg: Math.max(1, Math.round(raw)), isCrit };
    };

    const triggerStatic =
      this.draftedBuffIds.includes('silver_static_discharge') && this.attackCount % 4 === 0;
    const echoChance = this.draftedBuffIds.includes('silver_echo_strike')
      ? this.hasEquippedLegendary('bow_cape_endlesssky')
        ? this.isEquippedLegendaryCursed('bow_cape_endlesssky')
          ? 0.375
          : 0.5
        : 0.25
      : 0;
    const echoProcs = echoChance > 0 && this.rng() < echoChance;

    let projTexture = 'proj_palm_qi';
    let projTint: number | null = null;
    if (stanceStyle === 'jade_swords') {
      projTexture = 'fx_jade_sword';
      soundFX.playArrow();
    } else if (stanceStyle === 'iron_cleave' || (stanceStyle === null && hasRelicWep)) {
      projTexture = 'proj_wave';
      soundFX.playSwing();
    } else if (stanceStyle === 'flute_sonic') {
      projTexture = 'fx_flute_wave';
      soundFX.playSpell();
    } else if (stanceStyle === 'venom_needles') {
      projTexture = 'fx_ice_needle';
      soundFX.playArrow();
    } else if (stanceStyle === 'staff_spin') {
      projTexture = 'proj_palm_qi';
      projTint = 0x34d399;
      soundFX.playSwing();
    } else {
      projTexture = 'proj_palm_qi';
      soundFX.playSwing();
    }

    const extraShots =
      (this.hasEquippedLegendary('bow_wep_galeforce') ? 2 : 0) +
      (this.draftedBuffIds.includes('prism_bow_split_arrow') ? 2 : 0) +
      (this.hasEquippedLegendary('mage_wep_starlight') ? 2 : 0);
    const totalShots = 1 + extraShots;
    const guaranteedMark =
      this.draftedBuffIds.includes('prism_bow_snipers_mark') && this.attackCount % 3 === 0;
    const thunderInterval = this.isEquippedLegendaryCursed('bow_wep_thunderbird') ? 7 : 5;
    const isThunder =
      this.hasEquippedLegendary('bow_wep_thunderbird') && this.attackCount % thunderInterval === 0;
    const pierce = this.hasEquippedLegendary('thief_head_bandana')
      ? this.isEquippedLegendaryCursed('thief_head_bandana')
        ? 2
        : 3
      : projTexture === 'proj_wave'
        ? 2
        : 1;

    const vx = 650;
    const startX = this.heroX + 24;
    const startY = this.groundY - 30;
    const baseVy =
      (target.sprite.y - startY) / Math.max(0.08, (target.sprite.x - startX) / vx);

    for (let i = 0; i < totalShots; i++) {
      const { dmg, isCrit } = rollHit(i === 0 ? 1 : 0.6, guaranteedMark && i === 0);
      const spreadVy = (i - (totalShots - 1) / 2) * 26;
      const tex = isThunder && i === 0 ? 'proj_lightning' : projTexture;
      this.spawnProjectile(
        tex,
        startX,
        startY,
        vx,
        baseVy + spreadVy,
        dmg * (guaranteedMark && i === 0 ? 1.25 : 1),
        isCrit,
        isThunder && i === 0 ? 4 : pierce,
        this.hasEquippedLegendary('bow_wep_worldtree') && this.rng() < 0.25,
        this.hasEquippedLegendary('mage_wep_glacial'),
        tex === 'proj_wave',
        target.id,
        i === 0 && triggerStatic,
        false,
        null,
        tex === 'proj_lightning' ? null : projTint
      );
    }

    if (
      this.draftedBuffIds.includes('prism_thief_shadow_partner') ||
      (this.hasEquippedLegendary('thief_wep_shadowfang') && this.attackCount % 2 === 0)
    ) {
      const shadowHit = rollHit(this.isEquippedLegendaryCursed('thief_wep_shadowfang') ? 0.4 : 0.6);
      this.spawnProjectile(
        projTexture,
        this.heroX + 10,
        this.groundY - 40,
        vx,
        baseVy,
        shadowHit.dmg,
        false,
        1,
        false,
        false,
        projTexture === 'proj_wave',
        target.id,
        false,
        false,
        'SHADOW',
        projTint
      );
    }

    if (this.hasEquippedLegendary('war_wep_ragnarok') && this.attackCount % 3 === 0) {
      const waveHit = rollHit(1.4);
      this.spawnProjectile(
        'proj_wave',
        startX,
        this.groundY - 34,
        vx,
        0,
        waveHit.dmg,
        waveHit.isCrit,
        99,
        false,
        false,
        true
      );
    }

    if (this.hasEquippedLegendary('mage_wep_abyssal') && this.rng() < 0.2) {
      for (const e of this.enemies) {
        e.sprite.x = Phaser.Math.Linear(e.sprite.x, target.sprite.x, 0.55);
      }
      this.spawnFloatingText(target.sprite.x, target.sprite.y - 45, 'VOID PULL!', '#c084fc', 14);
    }

    if (echoProcs) {
      this.time.delayedCall(90, () => {
        if (this.phase !== 'combat' || !this.stats || !this.runConfig) return;
        const echoTarget = this.getClosestEnemy();
        if (!echoTarget) return;
        soundFX.playSwing();
        const echoHit = rollHit(0.75);
        const evy =
          (echoTarget.sprite.y - startY) /
          Math.max(0.08, (echoTarget.sprite.x - startX) / vx);
        this.spawnProjectile(
          projTexture,
          startX,
          startY,
          vx,
          evy,
          echoHit.dmg,
          echoHit.isCrit,
          1,
          false,
          false,
          projTexture === 'proj_wave',
          echoTarget.id,
          false,
          false,
          'ECHO',
          projTint
        );
      });
    }
  }

  private spawnProjectile(
    textureKey: string,
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    isCrit: boolean,
    pierceLeft: number,
    applyRoot: boolean,
    applyChill: boolean,
    isWave: boolean,
    targetId: number | null = null,
    isChainProc: boolean = false,
    dropFalconLoot: boolean = false,
    labelTag: string | null = null,
    tintHex: number | null = null
  ): void {
    const sprite = this.add.image(x, y, textureKey).setDepth(7);
    if (tintHex !== null) {
      sprite.setTint(tintHex);
    }
    if (
      textureKey !== 'proj_star' &&
      textureKey !== 'fx_staff_wheel' &&
      textureKey !== 'fx_taiji_seal' &&
      textureKey !== 'proj_orb_hp'
    ) {
      sprite.setRotation(Math.atan2(vy, vx));
    }
    if (textureKey === 'fx_dragon_palm') {
      sprite.setScale(1.25);
    } else if (textureKey === 'fx_jade_sword' || textureKey === 'fx_iron_cleave') {
      sprite.setScale(1.15);
    }
    this.projectiles.push({
      sprite,
      targetId,
      vx,
      vy,
      damage,
      isCrit,
      pierceLeft,
      hitIds: new Set(),
      applyRoot,
      applyChill,
      isWave,
      isChainProc,
      dropFalconLoot,
      labelTag,
      life: 2.2,
    });
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p) continue;
      p.life -= dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;

      const key = p.sprite.texture.key;
      if (key === 'proj_star' || key === 'fx_staff_wheel' || key === 'fx_taiji_seal') {
        p.sprite.rotation += 14 * dt;
      } else if (key !== 'proj_orb_hp') {
        p.sprite.rotation = Math.atan2(p.vy, p.vx);
      }

      if (key.startsWith('fx_') || key.startsWith('proj_')) {
        if (this.rng() < 0.2) {
          const sparkColor =
            key === 'fx_dragon_palm' || key === 'proj_palm_qi' || key === 'proj_wave'
              ? 0xfef08a
              : key === 'fx_jade_sword'
                ? 0x38bdf8
                : key === 'fx_iron_cleave'
                  ? 0xc084fc
                  : key === 'fx_flute_wave'
                    ? 0x5eead4
                    : key === 'fx_ice_needle'
                      ? 0xc4b5fd
                      : 0xe2e8f0;
          const spark = this.add
            .rectangle(p.sprite.x - 6, p.sprite.y + (this.rng() - 0.5) * 6, 4, 4, sparkColor, 0.85)
            .setDepth(6.8);
          this.tweens.add({
            targets: spark,
            alpha: 0,
            scale: 0.4,
            duration: 110,
            onComplete: () => spark.destroy(),
          });
        }
      }

      let destroyed = p.life <= 0 || p.sprite.x > (this.scale.width || 1024) + 60;
      if (!destroyed) {
        const hitX = p.isWave || key.startsWith('fx_') ? 68 : 42;
        const hitY = p.isWave || key.startsWith('fx_') ? 88 : 76;
        for (const e of [...this.enemies]) {
          if (e.hp <= 0 || p.hitIds.has(e.id)) continue;
          const dx = Math.abs(p.sprite.x - e.sprite.x);
          const dy = Math.abs(p.sprite.y - e.sprite.y);
          if (dx <= hitX && dy <= hitY) {
            p.hitIds.add(e.id);
            this.spawnHitSpark(e.sprite.x, e.sprite.y, p.isCrit);
            this.damageEnemy(e, p.damage, p.isCrit, p.labelTag);
            if (p.isChainProc) {
              p.isChainProc = false;
              this.triggerStaticDischarge(e);
            }
            if (p.dropFalconLoot) {
              p.dropFalconLoot = false;
              this.spawnLootDrop(e.sprite.x, e.sprite.y, this.rng() < 0.6 ? 'coin' : 'orb', 14);
            }
            if (!e.mutations.includes('juggernaut') && e.hp > 0) {
              const push = (this.stats?.knockbackPower ?? 16) * 0.45;
              e.sprite.x = Math.min((this.scale.width || 1024) - 55, e.sprite.x + push);
            }
            if (p.applyRoot) e.rootTimer = Math.max(e.rootTimer, this.isEquippedLegendaryCursed('bow_wep_worldtree') ? 1 : 2);
            if (p.applyChill) e.chillTimer = Math.max(e.chillTimer, 3);
            p.pierceLeft -= 1;
            if (p.pierceLeft <= 0) {
              destroyed = true;
              break;
            }
          }
        }
      }

      if (destroyed) {
        p.sprite.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private damageEnemy(
    enemy: EnemyEntity,
    rawDamage: number,
    isCrit: boolean,
    labelTag: string | null = null
  ): void {
    if (!this.stats || !this.runConfig) return;
    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
      return;
    }

    // Smoke Bomb dodge check
    if (enemy.smokeActiveTimer > 0 && this.rng() < 0.5) {
      this.spawnFloatingText(enemy.sprite.x, enemy.sprite.y - 36, 'DODGE!', '#cbd5e1', 12);
      return;
    }

    // Permafrost Armor hit-shield check
    if (enemy.hitShield > 0) {
      enemy.hitShield -= 1;
      this.spawnFloatingText(
        enemy.sprite.x,
        enemy.sprite.y - 34,
        `ICE SHIELD (${enemy.hitShield})`,
        '#67e8f9',
        12
      );
      return;
    }

    let dmg = rawDamage;
    if (enemy.mutations.includes('golden_gilded')) dmg *= 1.15;
    if (enemy.chillTimer > 0 && this.draftedBuffIds.includes('silver_frostbite_aura')) dmg *= 1.12;
    if (enemy.isBoss && this.draftedBuffIds.includes('prism_war_titan_cleave')) dmg *= 1.25;
    if (enemy.isBoss && this.draftedBuffIds.includes('gold_executioners_verdict') && enemy.hp / enemy.maxHp <= 0.3) {
      dmg *= 1.3;
    }
    if (
      this.runConfig.classId === 'thief' &&
      this.runConfig.profile.classes.thief.level >= 15 &&
      (enemy.bleedStacks > 0 || enemy.burnStacks > 0 || enemy.hp >= enemy.maxHp)
    ) {
      dmg *= 1.25;
    }
    if (this.hasEquippedLegendary('bow_head_hawkeye')) {
      const distRatio = Math.min(1, Math.max(0, (enemy.sprite.x - this.heroX) / 450));
      const maxBonus = this.isEquippedLegendaryCursed('bow_head_hawkeye') ? 0.5 : 0.8;
      dmg *= 1 + distRatio * maxBonus;
    }

    dmg *= 1 + enemy.armorShred * 0.06;
    const finalDmg = Math.max(1, Math.round(dmg));
    enemy.hp = Math.max(0, enemy.hp - finalDmg);

    if (enemy.sprite.active) {
      enemy.sprite.setAlpha(0.45);
      this.time.delayedCall(75, () => {
        if (enemy.sprite.active) enemy.sprite.setAlpha(1);
      });
      if (enemy.hp > 0 && !this.tweens.isTweening(enemy.sprite)) {
        const baseScaleX = enemy.sprite.scaleX;
        const baseScaleY = enemy.sprite.scaleY;
        const recoilX = Math.min((this.scale.width || 1024) - 45, enemy.sprite.x + 8);
        this.tweens.add({
          targets: enemy.sprite,
          x: recoilX,
          scaleX: baseScaleX * 1.18,
          scaleY: baseScaleY * 0.88,
          duration: 75,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => {
            if (enemy.sprite.active) {
              enemy.sprite.setScale(baseScaleX, baseScaleY);
            }
          },
        });
      }
    }

    if (isCrit || labelTag !== null) {
      this.spawnSlashVfx(
        enemy.sprite.x,
        enemy.sprite.y,
        isCrit ? 0xfbbf24 : 0xe0f2fe,
        isCrit ? 1.15 : 0.85
      );
    }

    if (isCrit) {
      soundFX.playCrit();
      this.spawnFloatingText(
        enemy.sprite.x + (this.rng() - 0.5) * 18,
        enemy.sprite.y - 28,
        `${labelTag ? `${labelTag} ` : ''}!${finalDmg}!`,
        '#fbbf24',
        18
      );

      if (this.draftedBuffIds.includes('silver_vampiric_touch') && this.vampiricTouchCd <= 0) {
        this.vampiricTouchCd = 0.5;
        this.healHero(this.stats.maxHp * 0.02, true);
      }
      if (this.draftedBuffIds.includes('gold_stormcaller_conduit')) {
        const skyDmg = Math.max(1, Math.round(this.stats.atk * 1.2));
        for (const other of [...this.enemies]) {
          if (other.id !== enemy.id && other.hp > 0 && Math.abs(other.sprite.x - enemy.sprite.x) <= 95) {
            other.hp = Math.max(0, other.hp - skyDmg);
            this.spawnLightningVfx(other.sprite.x, other.sprite.y - 110, other.sprite.x, other.sprite.y, 0x38bdf8);
            this.spawnHitSpark(other.sprite.x, other.sprite.y, false, 0x38bdf8);
            this.spawnFloatingText(other.sprite.x, other.sprite.y - 26, `ZAP! ${skyDmg}`, '#38bdf8', 13);
            if (other.hp <= 0) {
              this.killEnemy(other);
            }
          }
        }
      }
      if (this.hasEquippedLegendary('thief_cape_batwing')) {
        const pct = this.isEquippedLegendaryCursed('thief_cape_batwing') ? 0.1 : 0.15;
        this.healHero(finalDmg * pct, false);
      }
      if (this.draftedBuffIds.includes('prism_thief_coin_toss') && this.rng() < 0.35) {
        this.spawnLootDrop(enemy.sprite.x, enemy.sprite.y, 'coin', 8);
      }
    } else {
      this.spawnFloatingText(
        enemy.sprite.x + (this.rng() - 0.5) * 16,
        enemy.sprite.y - 24,
        `${labelTag ? `${labelTag} ` : ''}${finalDmg}`,
        '#ffffff',
        14
      );
    }

    // Lifesteal
    if (this.stats.lifestealPct > 0) {
      this.healHero((finalDmg * this.stats.lifestealPct) / 100, false);
    }

    // Apply Bleed & Weapon Elements
    if (this.draftedBuffIds.includes('silver_serrated_wounds') || this.hasEquippedLegendary('thief_wep_phantom')) {
      enemy.bleedStacks = Math.min(5, enemy.bleedStacks + 1);
      enemy.bleedTimer = this.isEquippedLegendaryCursed('thief_wep_phantom') ? 2 : 3;
    }

    const sockets = this.getWeaponSockets();
    const hybrid = getHybridElement(sockets);
    for (const elem of sockets) {
      if (elem === 'fire') {
        enemy.burnStacks = Math.min(5, enemy.burnStacks + 1);
        enemy.burnTimer = 3;
      } else if (elem === 'ice') {
        enemy.chillTimer = 3;
      } else if (elem === 'dark') {
        enemy.armorShred = Math.min(5, enemy.armorShred + 1);
        enemy.burnStacks = Math.min(5, enemy.burnStacks + 1);
        enemy.burnTimer = 3;
      } else if (elem === 'lightning' && this.rng() < 0.35) {
        const other = this.enemies.find((o) => o.id !== enemy.id && o.hp > 0);
        if (other) {
          const arcDmg = Math.max(1, Math.round(finalDmg * 0.4));
          other.hp = Math.max(0, other.hp - arcDmg);
          this.spawnLightningVfx(enemy.sprite.x, enemy.sprite.y, other.sprite.x, other.sprite.y, 0x60a5fa);
          this.spawnFloatingText(other.sprite.x, other.sprite.y - 26, `ARC ${arcDmg}`, '#60a5fa', 12);
          if (other.hp <= 0) {
            this.killEnemy(other);
          }
        }
      }
    }
    if (hybrid?.name === 'Plasma' && enemy.burnStacks > 0 && this.rng() < 0.25) {
      enemy.hp = Math.max(0, enemy.hp - Math.round(this.stats.atk * 0.7));
    }

    // Golden-Gilded boss coin showers every 10% HP lost
    if (enemy.mutations.includes('golden_gilded') && enemy.hp > 0) {
      const pct = Math.floor((enemy.hp / enemy.maxHp) * 100);
      while (enemy.lastGoldenThreshold - 10 >= pct) {
        enemy.lastGoldenThreshold -= 10;
        this.spawnLootDrop(enemy.sprite.x, enemy.sprite.y, 'coin', 22);
      }
    }

    // Mitosis split at 50% HP
    if (
      enemy.isBoss &&
      enemy.mechanic === 'mitosis' &&
      !enemy.mitosisDone &&
      enemy.hp > 0 &&
      enemy.hp <= enemy.maxHp * 0.5
    ) {
      enemy.mitosisDone = true;
      this.spawnBossEntity(
        `${enemy.name} Jr.`,
        Math.min(this.scale.width - 70, enemy.sprite.x + 55),
        Math.round(enemy.maxHp * 0.45),
        Math.round(enemy.atk * 0.7),
        false,
        true
      );
      this.spawnFloatingText(enemy.sprite.x, enemy.sprite.y - 60, 'MITOSIS SPLIT!', '#6ee7b7', 16);
    }

    // Execution check
    const execThreshold = this.draftedBuffIds.includes('gold_executioners_verdict')
      ? 0.18
      : this.hasEquippedLegendary('thief_cape_crimsonmoon')
        ? this.isEquippedLegendaryCursed('thief_cape_crimsonmoon')
          ? 0.1
          : 0.2
        : 0;
    if (!enemy.isBoss && execThreshold > 0 && enemy.hp > 0 && enemy.hp / enemy.maxHp <= execThreshold) {
      enemy.hp = 0;
      this.spawnFloatingText(enemy.sprite.x, enemy.sprite.y - 40, 'EXECUTE!', '#ef4444', 15);
    }

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: EnemyEntity): void {
    const idx = this.enemies.findIndex((e) => e.id === enemy.id);
    if (idx === -1) return;

    const ex = enemy.sprite.x;
    const ey = enemy.sprite.y;

    this.spawnHitSpark(ex, ey, enemy.isBoss || enemy.isMiniBoss, 0xf8fafc);
    const popRing = this.add.circle(ex, ey, enemy.isBoss ? 26 : 16, 0xf8fafc, 0.45).setDepth(10);
    this.tweens.add({
      targets: popRing,
      scale: 2.1,
      alpha: 0,
      duration: 180,
      onComplete: () => popRing.destroy(),
    });

    enemy.sprite.destroy();
    enemy.hpBg.destroy();
    enemy.hpFill.destroy();
    enemy.nameText.destroy();
    this.enemies.splice(idx, 1);

    if (this.draftedBuffIds.includes('silver_battle_momentum')) {
      this.battleMomentumStacks = Math.min(5, this.battleMomentumStacks + 1);
      this.battleMomentumTimer = 3;
    }

    if (this.hasEquippedLegendary('war_wep_souldrinker') && this.stats) {
      this.healHero(this.stats.maxHp * 0.03, false);
    }

    // Drop bouncy coins / chests
    const goldBonusMult = this.stats ? 1 + this.stats.goldBonusPct / 100 : 1;
    const coinCount = enemy.isBoss ? 6 : enemy.isMiniBoss ? 3 : 1;
    const baseGold = enemy.isBoss ? 36 : enemy.isMiniBoss ? 22 : 12 + this.floor * 3;
    for (let c = 0; c < coinCount; c++) {
      this.spawnLootDrop(ex, ey, 'coin', Math.round(baseGold * goldBonusMult));
    }
    if (enemy.isBoss || enemy.isMiniBoss) {
      const chestCount = computeBossChestCount(this.draftedBuffIds);
      for (let c = 0; c < chestCount; c++) {
        this.spawnLootDrop(ex, ey, 'chest', enemy.isBoss ? 1 : 0);
      }
      this.shardsCollected += enemy.isBoss ? 12 : 5;
      if (enemy.isBoss) {
        this.coresCollected += 1;
      }
    }
  }

  private updateEnemy(e: EnemyEntity, dt: number, heroInRange: boolean): void {
    if (e.hp <= 0) {
      this.killEnemy(e);
      return;
    }

    const isElementOverload = this.draftedBuffIds.includes('gold_elemental_overload');
    const dotMult = isElementOverload ? 2 : 1;

    // Burn / Bleed DoT ticks
    if (e.burnTimer > 0 && this.stats) {
      e.burnTimer -= dt;
      if (Math.floor((e.burnTimer + dt) * dotMult) !== Math.floor(e.burnTimer * dotMult)) {
        const dmg = this.stats.atk * 0.18 * e.burnStacks * (isElementOverload ? 1.5 : 1);
        this.damageEnemy(e, dmg, false, 'BURN');
        if (e.hp <= 0) return;
      }
    }

    if (e.bleedTimer > 0 && this.stats) {
      e.bleedTimer -= dt;
      const tickRate = this.draftedBuffIds.includes('prism_thief_fatal_venom') ? 2 : 1;
      if (Math.floor((e.bleedTimer + dt) * tickRate) !== Math.floor(e.bleedTimer * tickRate)) {
        const dmg = this.stats.atk * 0.15 * e.bleedStacks * tickRate;
        this.damageEnemy(e, dmg, this.draftedBuffIds.includes('prism_thief_fatal_venom'), 'BLEED');
        if (e.hp <= 0) return;
      }
    }

    if (e.chillTimer > 0) e.chillTimer = Math.max(0, e.chillTimer - dt);
    if (e.rootTimer > 0) e.rootTimer = Math.max(0, e.rootTimer - dt);
    if (e.stunTimer > 0) e.stunTimer = Math.max(0, e.stunTimer - dt);
    if (e.smokeActiveTimer > 0) e.smokeActiveTimer = Math.max(0, e.smokeActiveTimer - dt);

    // Boss biome shared mechanics
    if (e.isBoss && e.mechanic) {
      if (e.mechanic === 'permafrost_armor') {
        e.permafrostTimer -= dt;
        if (e.permafrostTimer <= 0) {
          e.permafrostTimer = 10;
          e.hitShield = e.isMiniBoss ? 8 : 14;
          this.spawnFloatingText(e.sprite.x, e.sprite.y - 60, 'PERMAFROST ARMOR!', '#67e8f9', 14);
        }
      } else if (e.mechanic === 'overheat_aura') {
        e.overheatTimer -= dt;
        if (e.overheatTimer <= 0) {
          e.overheatTimer = 1.6;
          this.damageHero(Math.round(e.atk * 0.45), e);
        }
      } else if (e.mechanic === 'smoke_bomb') {
        e.smokeTimer -= dt;
        if (e.smokeTimer <= 0) {
          e.smokeTimer = 9;
          e.smokeActiveTimer = 3;
          this.spawnFloatingText(e.sprite.x, e.sprite.y - 55, 'SMOKE BOMB!', '#c084fc', 14);
        }
      } else if (e.mechanic === 'enrage_timer') {
        e.enrageTimer -= dt;
        if (e.enrageTimer <= 0) {
          e.enrageTimer = 5;
          e.enrageStacks = Math.min(6, e.enrageStacks + 1);
          this.spawnFloatingText(e.sprite.x, e.sprite.y - 55, `ENRAGE x${e.enrageStacks}`, '#ef4444', 13);
        }
      }
    }

    // Volatile mutation floor bombs
    if (e.mutations.includes('volatile')) {
      e.volatileTimer -= dt;
      if (e.volatileTimer <= 0) {
        e.volatileTimer = 4.5;
        this.spawnHazardBomb(this.heroX + (this.rng() - 0.5) * 40, this.groundY - 14, e.atk * 1.45);
      }
    }

    // Movement & Attack
    if (this.draftedBuffIds.includes('silver_frostbite_aura') && e.sprite.x - this.heroX <= 165) {
      e.chillTimer = Math.max(e.chillTimer, 0.25);
    }
    const baseY = this.groundY - (e.isBoss && !e.isMiniBoss ? 52 : e.isBoss ? 40 : 24);
    const meleeDist = this.heroX + 74;
    if (e.stunTimer <= 0 && e.rootTimer <= 0 && e.sprite.x > meleeDist) {
      const slow = e.chillTimer > 0 ? 0.75 : 1;
      e.sprite.x = Math.max(meleeDist, e.sprite.x - e.speed * slow * dt);
      e.sprite.y = baseY - Math.abs(Math.sin(this.elapsedRunMs * 0.01 + e.id)) * 3.5;
      e.sprite.setAngle(Math.sin(this.elapsedRunMs * 0.009 + e.id) * 3.2);
    } else if (!this.tweens.isTweening(e.sprite)) {
      e.sprite.y = baseY;
      e.sprite.setAngle(0);
    }

    if (e.stunTimer <= 0 && (e.sprite.x <= meleeDist + 16 || (e.isBoss && heroInRange))) {
      const enrageSpeed = 1 + e.enrageStacks * 0.15;
      const chillSlow = e.chillTimer > 0 ? 0.8 : 1;
      e.atkTimer -= dt * enrageSpeed * chillSlow;
      if (e.atkTimer <= 0) {
        e.atkTimer = e.atkIntervalSec;
        if (!this.tweens.isTweening(e.sprite)) {
          const baseScaleX = e.sprite.scaleX;
          const baseScaleY = e.sprite.scaleY;
          this.tweens.add({
            targets: e.sprite,
            x: e.sprite.x - 28,
            scaleX: baseScaleX * 1.12,
            scaleY: baseScaleY * 1.06,
            duration: 95,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
              if (e.sprite.active) e.sprite.setScale(baseScaleX, baseScaleY);
            },
          });
        }
        this.spawnSlashVfx(this.heroX + 18, this.groundY - 28, 0xef4444, 1.1);
        this.spawnHitSpark(this.heroX + 12, this.groundY - 28, false, 0xf87171);
        this.damageHero(e.atk, e);
      }
    }

    // Sync HP bar positions
    if (e.hp <= 0) {
      this.killEnemy(e);
      return;
    }
    const barOffset = e.isBoss && !e.isMiniBoss ? 68 : e.isBoss ? 56 : 42;
    const barY = e.sprite.y - barOffset;
    e.hpBg.setPosition(e.sprite.x, barY);
    e.hpFill.setPosition(e.sprite.x, barY);
    const ratio = Math.max(0, Math.min(1, e.hp / e.maxHp));
    e.hpFill.width = (e.isBoss ? 96 : 46) * ratio;
    e.nameText.setPosition(e.sprite.x, barY - 14);
  }

  private damageHero(rawAtk: number, attacker: EnemyEntity | null): void {
    if (!this.stats || this.phase !== 'combat') return;

    if (this.invulnHitsLeft > 0) {
      this.invulnHitsLeft -= 1;
      this.spawnFloatingText(this.heroX, this.groundY - 72, 'NEGATED!', '#93c5fd', 14);
      return;
    }

    if (this.rng() < this.stats.dodgeRate) {
      this.dodgeCount += 1;
      this.spawnFloatingText(this.heroX, this.groundY - 72, 'DODGE!', '#a7f3d0', 14);
      if (this.hasEquippedLegendary('thief_head_fox') && attacker) {
        const mult = this.isEquippedLegendaryCursed('thief_head_fox') ? 0.8 : 1;
        this.damageEnemy(attacker, this.stats.atk * 1.1 * mult, false, 'COUNTER');
      }
      const windNeed = this.isEquippedLegendaryCursed('bow_top_windrunner') ? 4 : 3;
      if (this.hasEquippedLegendary('bow_top_windrunner') && this.dodgeCount % windNeed === 0) {
        for (let i = 0; i < 5; i++) {
          this.spawnProjectile('proj_arrow', this.heroX + 20, this.groundY - 30 + (i - 2) * 8, 600, 0, this.stats.atk * 0.7, false, 1, false, false, false);
        }
      }
      return;
    }

    this.unhitTimer = 0;
    const armorMitigation = 100 / (100 + Math.max(0, this.stats.armor));
    const elitePenalty =
      attacker?.isMiniBoss && this.hasEquippedLegendary('war_wep_souldrinker') ? 1.1 : 1;
    let dmg = Math.max(1, Math.round(rawAtk * armorMitigation * this.stats.damageTakenMult * elitePenalty));

    // Thornmail / Dragonscale reflection
    if (attacker && this.draftedBuffIds.includes('silver_thornmail_plating')) {
      this.damageEnemy(attacker, Math.round(this.stats.armor * 0.8), false, 'THORNS');
    }
    if (attacker && this.hasEquippedLegendary('war_top_dragonscale')) {
      const mitigated = Math.max(1, Math.round(rawAtk * (1 - armorMitigation)));
      this.damageEnemy(attacker, Math.round(mitigated * 1.2), false, 'REFLECT');
    }

    if (attacker?.mutations.includes('vampiric')) {
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.round(dmg * 0.15));
    }

    if (this.heroShield > 0) {
      const absorbed = Math.min(this.heroShield, dmg);
      this.heroShield -= absorbed;
      dmg -= absorbed;
    }

    if (dmg > 0) {
      this.heroHp = Math.max(0, this.heroHp - dmg);
      soundFX.playHit();
      this.spawnFloatingText(this.heroX, this.groundY - 68, `-${dmg}`, '#f87171', 15);
    }

    if (this.heroHp <= 0) {
      if (this.hasEquippedLegendary('mage_top_phoenix') && !this.phoenixReviveUsed) {
        this.phoenixReviveUsed = true;
        const pct = this.isEquippedLegendaryCursed('mage_top_phoenix') ? 0.25 : 0.5;
        this.heroHp = Math.round(this.stats.maxHp * pct);
        this.spawnFloatingText(this.heroX, this.groundY - 96, 'PHOENIX REBIRTH!', '#fb923c', 18);
        return;
      }
      this.finishRun('died');
    }
  }

  private healHero(amount: number, showText: boolean): void {
    if (!this.stats || amount <= 0) return;
    if (this.fastingFloorsLeft > 0) return;
    const rounded = Math.max(1, Math.round(amount));
    const missing = Math.max(0, this.stats.maxHp - this.heroHp);
    const actual = Math.min(missing, rounded);
    const overheal = rounded - actual;
    this.heroHp += actual;

    if (overheal > 0 && this.draftedBuffIds.includes('prism_war_blood_shield')) {
      this.heroShield = Math.min(this.stats.maxHp, this.heroShield + overheal);
    }

    if (showText && actual > 0) {
      this.spawnFloatingText(this.heroX, this.groundY - 76, `+${actual}`, '#4ade80', 13);
    }
  }

  private castWuxiaActiveArt(artId: string, isBurst = false): void {
    if (this.phase !== 'combat' || !this.stats || this.enemies.length === 0) return;
    const art = getWuxiaActiveArtById(artId);
    if (!art) return;

    const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
    const level = Math.min(5, Math.max(1, loadout.activeLevels[artId] ?? 1));
    const syn = loadout.awakenedSynergies.includes(art.synergyId)
      ? getWuxiaSynergyById(art.synergyId)
      : null;

    const powerMult =
      (syn ? syn.powerMult : (art.powerMults[level - 1] ?? 1.2)) *
      (isBurst ? 1.3 : 1) *
      this.stats.allDamageMult *
      (1 + this.stats.skillPowerPct / 100);
    const count = syn ? syn.projectileCount : (art.projectileCounts[level - 1] ?? 1);
    const hitCrit = syn !== null || isBurst || this.rng() < this.stats.critRate;
    const dmg = Math.max(
      1,
      Math.round(this.stats.atk * powerMult * (hitCrit ? this.stats.critDmg : 1))
    );
    const target = this.getClosestEnemy() ?? this.enemies[0];
    if (!target) return;

    this.syncHeroWuxiaWeapon(art.style);

    if (art.style === 'palm_wave') {
      if (syn || level >= 3) {
        soundFX.playBossRoar();
        this.cameras.main.shake(110, syn ? 0.008 : 0.004);
      } else {
        soundFX.playSwing();
      }
      this.playHeroAttackAnimation('warrior', syn ? 1.45 : 1.15);
      this.spawnHeroAfterimage(syn ? 0xfef08a : 0xf59e0b);
      this.spawnQiShockwaveRing(this.heroX + 30, this.groundY - 30, syn ? 0xfef08a : 0xf59e0b, syn ? 165 : 105, 250);
      this.spawnFloatingText(
        this.heroX + 36,
        this.groundY - 102,
        syn ? 'SOVEREIGN DRAGON!' : level >= 3 ? '18 DRAGON PALMS!' : 'DRAGON PALM!',
        '#fbbf24',
        syn ? 16 : 14
      );
      for (let i = 0; i < count; i++) {
        const offset = i - (count - 1) / 2;
        this.spawnProjectile(
          'fx_dragon_palm',
          this.heroX + 26,
          this.groundY - 34 + offset * 16,
          syn ? 580 : 480,
          offset * 28,
          dmg,
          hitCrit,
          syn ? 99 : level >= 3 ? 6 : 3,
          false,
          false,
          true,
          null,
          false,
          false,
          syn ? 'DRAGON' : 'PALM'
        );
      }
      for (const e of [...this.enemies]) {
        if (Math.abs(e.sprite.x - this.heroX) <= 180 && !e.mutations.includes('juggernaut') && e.hp > 0) {
          e.sprite.x = Math.min((this.scale.width || 1024) - 55, e.sprite.x + 28);
        }
      }
    } else if (art.style === 'jade_swords') {
      soundFX.playCrit();
      this.playHeroAttackAnimation('thief', syn ? 1.35 : 1.1);
      this.spawnHeroAfterimage(syn ? 0xf472b6 : 0x38bdf8);
      this.spawnSlashVfx(this.heroX + 38, this.groundY - 32, syn ? 0xf472b6 : 0x38bdf8, syn ? 1.55 : 1.15);
      if (syn) {
        this.spawnQiShockwaveRing(this.heroX + 20, this.groundY - 30, 0x7dd3fc, 130, 240);
        this.spawnFloatingText(this.heroX + 36, this.groundY - 98, 'PARTING SWORD!', '#7dd3fc', 15);
      }
      const vx = 640;
      for (let i = 0; i < count; i++) {
        const aimEnemy = this.enemies[i % this.enemies.length] ?? target;
        const spreadY = (i - (count - 1) / 2) * 12;
        const vy =
          (aimEnemy.sprite.y - (this.groundY - 30) + spreadY) /
          Math.max(0.08, (aimEnemy.sprite.x - (this.heroX + 20)) / vx);
        this.spawnProjectile(
          'fx_jade_sword',
          this.heroX + 22,
          this.groundY - 30 + spreadY * 0.5,
          vx,
          vy,
          dmg,
          hitCrit,
          syn ? 3 : 1,
          false,
          false,
          false,
          aimEnemy.id,
          false,
          false,
          syn ? 'CONDOR' : 'JADE'
        );
      }
    } else if (art.style === 'staff_spin') {
      soundFX.playSwing();
      this.playHeroAttackAnimation('warrior', syn ? 1.45 : 1.15);
      const radius = syn ? 330 : 165 + level * 35;
      this.spawnHeroAfterimage(syn ? 0x6ee7b7 : 0x10b981);
      this.spawnWhirlingStaffVfx(
        this.heroX + 20,
        this.groundY - 28,
        radius,
        syn ? 0x6ee7b7 : 0x10b981
      );
      this.spawnSlashVfx(
        this.heroX + 24,
        this.groundY - 28,
        syn ? 0x6ee7b7 : 0x10b981,
        syn ? 1.7 : 1.1 + level * 0.16
      );
      if (syn) {
        this.cameras.main.shake(100, 0.006);
        this.spawnFloatingText(this.heroX + 32, this.groundY - 98, 'HEAVEN UNDER STAFF!', '#6ee7b7', 15);
      }
      for (const e of [...this.enemies]) {
        if (e.hp <= 0) continue;
        if (Math.abs(e.sprite.x - this.heroX) <= radius) {
          this.spawnHitSpark(e.sprite.x, e.sprite.y, hitCrit, 0x10b981);
          this.damageEnemy(e, dmg, hitCrit, syn ? 'STAFF' : 'SWEEP');
          if (e.hp > 0) {
            e.chillTimer = Math.max(e.chillTimer, 1.5);
            if (syn || level >= 2) e.stunTimer = Math.max(e.stunTimer, syn ? 0.75 : 0.35);
          }
        }
      }
    } else if (art.style === 'iron_cleave') {
      soundFX.playBossRoar();
      this.playHeroAttackAnimation('warrior', syn ? 1.5 : 1.25);
      const strikeX = target.sprite.x;
      this.spawnFallingGreatswordVfx(
        strikeX,
        target.sprite.y,
        syn ? 0xe879f9 : 0xa855f7,
        syn !== null
      );
      this.spawnSlashVfx(
        strikeX,
        target.sprite.y,
        syn ? 0xe879f9 : 0xa855f7,
        syn ? 1.9 : 1.25 + level * 0.16
      );
      if (syn) {
        this.spawnFloatingText(strikeX, target.sprite.y - 54, 'SWORD TOMB!', '#e879f9', 16);
      }
      for (const e of [...this.enemies]) {
        if (e.hp <= 0) continue;
        if (Math.abs(e.sprite.x - strikeX) <= (syn ? 195 : 135)) {
          this.spawnHitSpark(e.sprite.x, e.sprite.y, hitCrit, 0xc084fc);
          this.damageEnemy(e, dmg, hitCrit, syn ? 'TOMB' : 'IRON');
          if (e.hp > 0) e.stunTimer = Math.max(e.stunTimer, syn ? 1.1 : 0.6);
        }
      }
      if (syn) {
        for (let i = 0; i < count; i++) {
          const offset = i - (count - 1) / 2;
          this.spawnProjectile(
            'fx_iron_cleave',
            this.heroX + 24,
            this.groundY - 40 + offset * 12,
            530,
            offset * 20,
            Math.round(dmg * 0.45),
            true,
            5,
            false,
            false,
            true,
            null,
            false,
            false,
            'SWORD'
          );
        }
      }
    } else if (art.style === 'flute_sonic') {
      soundFX.playSpell();
      this.playHeroAttackAnimation('mage', syn ? 1.3 : 1.05);
      this.spawnQiShockwaveRing(
        this.heroX + 18,
        this.groundY - 30,
        syn ? 0x5eead4 : 0x2dd4bf,
        syn ? 160 : 105,
        240
      );
      if (syn) {
        this.spawnFloatingText(this.heroX + 36, this.groundY - 96, 'AZURE SYMPHONY!', '#5eead4', 15);
      }
      const vx = 550;
      for (let i = 0; i < count; i++) {
        const aimEnemy = this.enemies[i % this.enemies.length] ?? target;
        const vy =
          (aimEnemy.sprite.y - (this.groundY - 32)) /
          Math.max(0.08, (aimEnemy.sprite.x - (this.heroX + 22)) / vx);
        this.spawnProjectile(
          'fx_flute_wave',
          this.heroX + 22,
          this.groundY - 32 + ((i % 3) - 1) * 10,
          vx,
          vy,
          dmg,
          hitCrit,
          syn ? 5 : 2 + level,
          false,
          false,
          false,
          aimEnemy.id,
          false,
          false,
          syn ? 'SYMPHONY' : 'NOTE'
        );
      }
    } else if (art.style === 'six_pulse') {
      soundFX.playCrit();
      this.playHeroAttackAnimation('bowman', syn ? 1.4 : 1.15);
      this.spawnHeroAfterimage(syn ? 0x38bdf8 : 0x0ea5e9);
      this.spawnQiShockwaveRing(this.heroX + 26, this.groundY - 30, 0x38bdf8, syn ? 160 : 95, 220);
      if (syn) {
        this.spawnFloatingText(this.heroX + 36, this.groundY - 98, 'HEAVEN-PIERCING SIX PULSE!', '#38bdf8', 15);
      }
      const vx = 760;
      for (let i = 0; i < count; i++) {
        const aimEnemy = this.enemies[i % this.enemies.length] ?? target;
        const spreadY = (i - (count - 1) / 2) * 10;
        const vy =
          (aimEnemy.sprite.y - (this.groundY - 32) + spreadY) /
          Math.max(0.08, (aimEnemy.sprite.x - (this.heroX + 22)) / vx);
        this.spawnProjectile(
          'fx_jade_sword',
          this.heroX + 24,
          this.groundY - 32 + spreadY * 0.45,
          vx,
          vy,
          dmg,
          hitCrit,
          syn ? 99 : level + 1,
          false,
          false,
          true,
          null,
          false,
          false,
          syn ? 'SIX-PULSE★' : 'SIX-PULSE'
        );
      }
    } else if (art.style === 'flicking_finger') {
      soundFX.playSpell();
      this.playHeroAttackAnimation('warrior', syn ? 1.45 : 1.15);
      this.spawnQiShockwaveRing(
        this.heroX + 28,
        this.groundY - 30,
        syn ? 0xfb923c : 0xfb7185,
        syn ? 175 : 110,
        240
      );
      if (syn) {
        this.cameras.main.shake(105, 0.006);
        this.spawnFloatingText(this.heroX + 36, this.groundY - 98, 'TEN-DRAGON FINGER CANNON!', '#fb923c', 15);
      }
      const vx = 680;
      for (let i = 0; i < count; i++) {
        const aimEnemy = this.enemies[i % this.enemies.length] ?? target;
        const offset = (i - (count - 1) / 2) * 14;
        const vy =
          (aimEnemy.sprite.y - (this.groundY - 32) + offset) /
          Math.max(0.08, (aimEnemy.sprite.x - (this.heroX + 22)) / vx);
        this.spawnProjectile(
          'proj_palm_qi',
          this.heroX + 24,
          this.groundY - 32 + offset * 0.4,
          vx,
          vy,
          dmg,
          hitCrit,
          syn ? 4 : 2,
          false,
          false,
          true,
          aimEnemy.id,
          false,
          false,
          syn ? 'CANNON' : 'THRUM'
        );
      }
      for (const e of [...this.enemies]) {
        if (Math.abs(e.sprite.x - target.sprite.x) <= (syn ? 150 : 95) && e.hp > 0) {
          this.damageEnemy(e, Math.round(dmg * 0.35), false, 'SHOCK');
        }
      }
    } else {
      soundFX.playArrow();
      this.playHeroAttackAnimation('bowman', syn ? 1.3 : 1.05);
      if (syn) {
        this.spawnQiShockwaveRing(this.heroX + 20, this.groundY - 34, 0xc4b5fd, 140, 240);
        this.spawnFloatingText(this.heroX + 36, this.groundY - 96, 'FROST LOTUS!', '#c4b5fd', 15);
      }
      const vx = 650;
      for (let i = 0; i < count; i++) {
        const aimEnemy = this.enemies[i % this.enemies.length] ?? target;
        const spreadY = (i - (count - 1) / 2) * 10;
        const vy =
          (aimEnemy.sprite.y - (this.groundY - 36) + spreadY) /
          Math.max(0.08, (aimEnemy.sprite.x - (this.heroX + 18)) / vx);
        this.spawnProjectile(
          'fx_ice_needle',
          this.heroX + 18,
          this.groundY - 36 + spreadY * 0.45,
          vx,
          vy,
          dmg,
          hitCrit,
          syn ? 2 : 1,
          syn !== null,
          true,
          false,
          aimEnemy.id,
          false,
          false,
          syn ? 'LOTUS' : 'NEEDLE'
        );
      }
    }
  }

  public triggerActiveSkill(): void {
    if (this.phase !== 'combat' || !this.stats || !this.runConfig || this.skillTimer > 0) return;

    const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
    const cdMult = 1 - this.stats.cooldownReductionPct / 100;
    this.skillTimer = Math.max(2.5, (loadout.actives.length > 0 ? 7.5 : 4.5) * cdMult);

    if (loadout.actives.length === 0) {
      soundFX.playBossRoar();
      this.playHeroAttackAnimation('warrior', 1.4);
      this.spawnHeroAfterimage(0xfef08a);
      this.spawnQiShockwaveRing(this.heroX + 25, this.groundY - 30, 0xfef08a, 185, 290);
      const taijiSeal = this.add
        .image(this.heroX + 35, this.groundY - 32, 'fx_taiji_seal')
        .setScale(1.1)
        .setDepth(11);
      this.tweens.add({
        targets: taijiSeal,
        scale: 2.3,
        rotation: Math.PI * 2,
        alpha: 0,
        duration: 340,
        ease: 'Cubic.easeOut',
        onComplete: () => taijiSeal.destroy(),
      });
      this.cameras.main.shake(100, 0.005);
      this.spawnFloatingText(this.heroX + 35, this.groundY - 102, 'TAIJI PALM BREAK!', '#fef08a', 16);
      const dmg = Math.max(
        1,
        Math.round(this.stats.atk * 2.1 * this.stats.allDamageMult * this.stats.critDmg)
      );
      for (const e of [...this.enemies]) {
        if (Math.abs(e.sprite.x - this.heroX) <= 210) {
          this.spawnHitSpark(e.sprite.x, e.sprite.y, true, 0xfef08a);
          this.damageEnemy(e, dmg, true, 'TAIJI');
          if (e.hp > 0) e.stunTimer = Math.max(e.stunTimer, 0.75);
        }
      }
      this.emitHud();
      return;
    }

    this.spawnQiShockwaveRing(this.heroX + 25, this.groundY - 30, 0xfde047, 175, 280);
    this.cameras.main.shake(110, 0.006);
    this.spawnFloatingText(this.heroX + 40, this.groundY - 110, 'DANTIAN UNLEASHED!', '#fde047', 16);
    for (const slot of loadout.actives) {
      this.castWuxiaActiveArt(slot.id, true);
    }
    this.emitHud();
  }

  public triggerPotion(): void {
    if (this.phase !== 'combat' || !this.stats) return;
    if (this.fastingFloorsLeft > 0 || this.potionCharges <= 0 || this.potionCooldown > 0) return;

    this.potionCharges -= 1;
    this.potionCooldown = 10;
    this.healHero(this.stats.maxHp * 0.35, true);
    soundFX.playDraft();
    this.emitHud();
  }

  public triggerDash(): void {
    if (this.phase !== 'combat' || !this.stats || this.dashCooldown > 0) return;

    const cdMult = 1 - this.stats.cooldownReductionPct / 100;
    this.dashCooldown = Math.max(2.0, 5 * cdMult);
    this.invulnHitsLeft = Math.max(this.invulnHitsLeft, 1);

    soundFX.playSwing();
    this.spawnFloatingText(this.heroX + 20, this.groundY - 96, '💨 EVASIVE DASH!', '#38bdf8', 15);

    if (this.heroSprite) {
      this.tweens.add({
        targets: this.heroSprite,
        x: this.heroX - 24,
        duration: 90,
        yoyo: true,
      });
    }

    for (const e of [...this.enemies]) {
      if (e.sprite.x - this.heroX <= 180) {
        if (!e.mutations.includes('juggernaut')) {
          e.sprite.x = Math.min((this.scale.width || 1024) - 55, e.sprite.x + 110);
        }
        e.stunTimer = Math.max(e.stunTimer, 0.6);
      }
    }

    const closest = this.getClosestEnemy();
    if (closest) {
      this.damageEnemy(closest, this.stats.atk * 0.9 * this.stats.allDamageMult, false, 'COUNTER');
    }

    this.emitHud();
  }

  public toggleSpeed(): 1 | 2 {
    this.speedMult = this.speedMult === 1 ? 2 : 1;
    this.emitHud();
    return this.speedMult;
  }

  public toggleAutoSkill(): boolean {
    this.autoSkill = !this.autoSkill;
    this.emitHud();
    return this.autoSkill;
  }

  private spawnHazardBomb(x: number, y: number, damage: number): void {
    const sprite = this.add.image(x, y, 'bomb_hazard').setDepth(5);
    const ring = this.add.circle(x, y, 42, 0xef4444, 0.22).setDepth(4);
    this.hazards.push({ sprite, ring, fuse: 2.0, damage });
  }

  private updateHazards(dt: number): void {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (!h) continue;
      h.fuse -= dt;
      h.ring.setScale(1 + (2 - h.fuse) * 0.2);
      if (h.fuse <= 0) {
        if (Math.abs(h.sprite.x - this.heroX) <= 64) {
          this.damageHero(h.damage, null);
        }
        h.sprite.destroy();
        h.ring.destroy();
        this.hazards.splice(i, 1);
      }
    }
  }

  private spawnLootDrop(x: number, y: number, kind: 'coin' | 'orb' | 'chest', value: number): void {
    const key = kind === 'coin' ? 'loot_coin' : kind === 'chest' ? 'loot_chest' : 'proj_orb_hp';
    const sprite = this.add.image(x, y - 10, key).setDepth(7);
    this.loots.push({
      sprite,
      kind,
      value,
      vx: (this.rng() - 0.5) * 140,
      vy: -190 - this.rng() * 90,
      age: 0,
    });
  }

  private updateLootDrops(dt: number): void {
    for (let i = this.loots.length - 1; i >= 0; i--) {
      const l = this.loots[i];
      if (!l) continue;
      l.age += dt;
      if (l.age < 0.45) {
        l.vy += 580 * dt;
        l.sprite.x += l.vx * dt;
        l.sprite.y = Math.min(this.groundY - 8, l.sprite.y + l.vy * dt);
      } else {
        l.sprite.x = Phaser.Math.Linear(l.sprite.x, this.heroX, Math.min(1, dt * 9));
        l.sprite.y = Phaser.Math.Linear(l.sprite.y, this.groundY - 26, Math.min(1, dt * 9));
      }

      if (Phaser.Math.Distance.Between(l.sprite.x, l.sprite.y, this.heroX, this.groundY - 26) < 26) {
        if (l.kind === 'coin') {
          this.goldCollected += l.value;
          soundFX.playCoin();
        } else if (l.kind === 'orb' && this.stats) {
          this.healHero(this.stats.maxHp * 0.08, true);
        } else if (l.kind === 'chest') {
          this.goldCollected += 35;
          this.shardsCollected += 4;
        }
        l.sprite.destroy();
        this.loots.splice(i, 1);
      }
    }
  }

  private spawnFloatingText(x: number, y: number, msg: string, color: string, sizePx: number): void {
    const txt = this.add
      .text(x, y, msg, {
        fontFamily: 'monospace',
        fontSize: `${sizePx}px`,
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.tweens.add({
      targets: txt,
      y: y - 34,
      alpha: 0,
      duration: 620,
      onComplete: () => txt.destroy(),
    });
  }

  private onWaveCleared(): void {
    if (this.waveIndex < this.totalWavesOnFloor) {
      this.waveIndex += 1;
      this.phase = 'walking';
      this.walkTimer = 0.85;
      this.emitHud();
      return;
    }

    // Collect remaining loots instantaneously
    for (const l of this.loots) {
      if (l.kind === 'coin') this.goldCollected += l.value;
      if (l.kind === 'chest') {
        this.goldCollected += 35;
        this.shardsCollected += 4;
      }
      l.sprite.destroy();
    }
    this.loots = [];

    this.floorsCleared += 1;
    if (this.fastingFloorsLeft > 0) this.fastingFloorsLeft -= 1;

    if (this.stats) {
      const floorHeal = computeFloorClearHeal(
        this.stats.maxHp,
        this.draftedBuffIds,
        this.fastingFloorsLeft
      );
      if (floorHeal > 0) {
        this.healHero(floorHeal, true);
      }
    }

    if (isCultLeaderFloor(this.floor)) {
      soundFX.playVictory();
      this.spawnFloatingText(
        this.heroX + 35,
        this.groundY - 125,
        `CULT LEADER FLOOR ${this.floor} VANQUISHED!`,
        '#fde047',
        18
      );
    }

    // Pause for 3-Buff Draft after floors 1-9
    this.phase = 'paused';
    const silverMult = this.hasEquippedLegendary('bow_cape_sylvanspirit')
      ? this.isEquippedLegendaryCursed('bow_cape_sylvanspirit')
        ? 1.5
        : 2
      : 1;
    this.callbacks?.onRequestDraft(this.floor, [...this.draftedBuffIds], silverMult);
    this.emitHud();
  }

  public resumeAfterDraft(chosenBuffId: string): void {
    const prevMaxHp = this.stats?.maxHp ?? 200;
    this.draftedBuffIds.push(chosenBuffId);
    if (chosenBuffId === 'cursed_fasting_vow') {
      this.fastingFloorsLeft = 3;
    }
    this.recomputeStats();
    this.spawnCompanionVisuals();
    this.syncHeroWuxiaWeapon();

    if (this.stats && this.stats.maxHp > prevMaxHp) {
      this.heroHp += this.stats.maxHp - prevMaxHp;
    } else if (this.stats) {
      this.heroHp = Math.min(this.heroHp, this.stats.maxHp);
    }

    if (isCultLeaderFloor(this.floor)) {
      this.phase = 'paused';
      this.callbacks?.onRequestExtraction(
        this.floor,
        this.goldCollected,
        this.shardsCollected,
        this.coresCollected
      );
      this.emitHud();
      return;
    }

    this.beginFloor(this.floor + 1);
  }

  public resumeAfterExtraction(extractNow: boolean): void {
    if (extractNow) {
      soundFX.playVictory();
      this.finishRun('extracted');
      return;
    }
    this.beginFloor(this.floor + 1);
  }

  public retreatWithLoot(): void {
    if (!this.runConfig || this.phase === 'idle') return;
    soundFX.playVictory();
    this.finishRun('extracted');
  }

  private finishRun(outcome: 'cleared' | 'extracted' | 'died'): void {
    if (outcome === 'died') soundFX.playDefeat();
    this.phase = 'idle';
    this.clearCombatEntities();

    if (!this.runConfig) return;
    this.callbacks?.onRunEnded({
      runId: this.runConfig.runId,
      mode: this.runConfig.mode,
      classId: this.runConfig.classId,
      floorReached: this.floor,
      outcome,
      durationMs: Math.max(2000, Math.round(this.elapsedRunMs)),
      goldCollected: this.goldCollected,
      shardsCollected: this.shardsCollected,
      coresCollected: this.coresCollected,
      draftedBuffIds: [...this.draftedBuffIds],
      bossMutations: [...this.lastBossMutations],
      greedGamblePurified: false,
    });
  }

  private emitHud(): void {
    if (!this.runConfig || !this.stats) return;
    const boss = this.enemies.find((e) => e.isBoss);
    const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);

    const mutNames = this.currentBossMutations.map((m) => getMutationById(m).id);
    const cdMult = 1 - this.stats.cooldownReductionPct / 100;
    const totalCd = Math.max(2.5, (loadout.actives.length > 0 ? 7.5 : 4.5) * cdMult);
    const totalDashCd = Math.max(2.0, 5 * cdMult);

    this.callbacks?.onHudUpdate({
      floor: this.floor,
      maxFloors: Math.ceil(Math.max(1, this.floor) / 10) * 10,
      waveLabel: isCultLeaderFloor(this.floor)
        ? `Cult Leader F${this.floor}`
        : isRandomMiniBossFloor(this.floor, this.runConfig.seed)
          ? 'Hall Master Ambush'
          : `Wave ${this.waveIndex}/${this.totalWavesOnFloor}`,
      hp: Math.round(this.heroHp),
      maxHp: this.stats.maxHp,
      shield: Math.round(this.heroShield),
      gold: this.goldCollected,
      shards: this.shardsCollected,
      cores: this.coresCollected,
      skillCooldownPct: Math.min(1, Math.max(0, this.skillTimer / totalCd)),
      skillReady: this.skillTimer <= 0,
      skillName: loadout.actives.length > 0 ? 'Dantian Burst' : 'Taiji Palm Break',
      dashCooldownPct: Math.min(1, Math.max(0, this.dashCooldown / totalDashCd)),
      dashReady: this.dashCooldown <= 0,
      potionCharges: this.potionCharges,
      potionDisabledReason: this.fastingFloorsLeft > 0 ? `Fasting Vow (${this.fastingFloorsLeft}f)` : null,
      speedMult: this.speedMult,
      autoSkill: this.autoSkill,
      draftedBuffIds: [...this.draftedBuffIds],
      activeBossName: boss ? boss.name : null,
      activeBossHp: boss ? boss.hp : 0,
      activeBossMaxHp: boss ? boss.maxHp : 0,
      activeBossShield: boss ? boss.hitShield : 0,
      activeMutations: mutNames,
    });
  }
}
