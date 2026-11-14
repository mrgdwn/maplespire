import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { getBiomeById, getMutationById } from '../../shared/catalogs/biomes.ts';
import { getClassDefinition } from '../../shared/catalogs/classes.ts';
import { computeHeroCombatStats } from '../../shared/catalogs/classes.ts';
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
import { registerPixelTextures } from '../fx/pixelArt.ts';
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
    this.heroSprite?.destroy();
    this.hawkSprite?.destroy();
    this.wolfSprite?.destroy();
    for (const book of this.runeBooks) book.destroy();
    this.runeBooks = [];

    const clsColor = getClassDefinition(classId).colorInt;
    this.heroAura = this.add
      .circle(this.heroX, this.groundY - 28, 36, clsColor, level >= 60 ? 0.28 : level >= 35 ? 0.16 : 0.08)
      .setDepth(4);

    this.heroGlow = this.add
      .circle(this.heroX + 14, this.groundY - 24, 14, 0xfef08a, level >= 15 ? 0.25 : 0)
      .setDepth(4);

    this.heroSprite = this.add
      .image(this.heroX, this.groundY - 28, `hero_${classId}`)
      .setDepth(6);

    if (classId === 'bowman') {
      this.hawkSprite = this.add
        .image(this.heroX - 38, this.groundY - 92, 'pet_hawk')
        .setDepth(6);
    } else {
      this.hawkSprite = null;
    }
    this.wolfSprite = null;
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
    this.totalWavesOnFloor = 2;
    this.elapsedRunMs = 0;
    this.goldCollected = 0;
    this.shardsCollected = 0;
    this.coresCollected = 0;
    this.draftedBuffIds = [];
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
      this.runConfig.classId === 'bowman' &&
      (this.hasEquippedLegendary('bow_head_beastmaster') ||
        this.draftedBuffIds.includes('prism_bow_spectral_pack')) &&
      !this.wolfSprite
    ) {
      this.wolfSprite = this.add
        .image(this.heroX + 36, this.groundY - 18, 'pet_wolf')
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
    this.heroShield = 0;

    if (this.draftedBuffIds.includes('gold_aegis_bastion')) {
      this.heroShield += Math.round(this.stats.maxHp * 0.3);
    }
    if (this.draftedBuffIds.includes('prism_mage_mana_barrier')) {
      this.heroShield += Math.round(this.stats.maxHp * 0.25);
    }
    if (this.hasEquippedLegendary('war_cape_aegis')) {
      const pct = this.isEquippedLegendaryCursed('war_cape_aegis') ? 0.15 : 0.25;
      this.heroShield += Math.round(this.stats.maxHp * pct);
    }
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

    if (floorNum === 4 || floorNum === 10) {
      this.totalWavesOnFloor = 1;
      this.phase = 'paused';
      const count =
        floorNum === 10 && this.draftedBuffIds.includes('cursed_double_edged_fate') ? 2 : 1;
      this.callbacks?.onRequestRoulette(floorNum, count, this.lastBossMutations);
      this.emitHud();
      return;
    }

    this.totalWavesOnFloor = floorNum === 7 ? 1 : 2;
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
    const label =
      this.floor === 4
        ? `MINI-BOSS: ${this.activeBiome.miniBossName}`
        : `END BOSS: ${this.activeBiome.endBossName}`;
    this.spawnFloatingText(this.scale.width / 2, this.groundY - 150, label, '#f97316', 24);
    soundFX.playBossRoar();
    this.emitHud();
  }

  private spawnWave(): void {
    const w = this.scale.width || 1024;
    const hpMult = this.draftedBuffIds.includes('cursed_gilded_avarice') ? 1.25 : 1;

    if (this.floor === 4 || this.floor === 10) {
      const isEndBoss = this.floor === 10;
      const baseHp = isEndBoss ? 2250 : 720;
      const baseAtk = isEndBoss ? 36 : 20;
      const name = isEndBoss ? this.activeBiome.endBossName : this.activeBiome.miniBossName;

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

    const mobCount =
      this.floor === 1 ? 2 : this.floor === 7 ? 5 : 3 + Math.min(2, Math.floor(this.floor / 4));
    for (let i = 0; i < mobCount; i++) {
      const kindIdx = Math.floor(this.rng() * 3);
      const textureKey = `mob_${kindIdx}`;
      const tint = this.activeBiome.mobColors[kindIdx] ?? 0x6ede8a;
      const mobName = this.activeBiome.mobNames[kindIdx] ?? 'Monster';
      const isElite = this.floor === 7 && i === mobCount - 1;
      const maxHp = Math.round(
        (42 + this.floor * 26 + this.waveIndex * 10) * (isElite ? 2.1 : 1) * hpMult
      );
      const atk = Math.round((6 + this.floor * 2.0) * (isElite ? 1.35 : 1));
      const x = w - 75 - i * 95;
      const y = this.groundY - 24;

      const sprite = this.add.image(x, y, textureKey).setTint(tint).setDepth(6);
      if (isElite) sprite.setScale(1.35);

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
        hitShield: 0,
        atk,
        atkIntervalSec: 1.5,
        atkTimer: 0.5 + this.rng() * 0.6,
        speed: 44 + this.floor * 2,
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
    let atkIntervalSec = isEndBoss ? 1.35 : 1.55;
    let scale = isSplitClone ? 0.78 : 1;

    if (mutations.includes('juggernaut')) {
      maxHp = Math.round(maxHp * 1.3);
      atkIntervalSec *= 1.2;
      scale *= 1.25;
    }
    if (mutations.includes('hasted')) {
      maxHp = Math.round(maxHp * 0.8);
      atkIntervalSec *= 0.7;
    }

    const y = this.groundY - (isEndBoss ? 44 : 34);
    const key = isEndBoss ? 'endboss' : 'miniboss';
    const baseColor = this.activeBiome.mobColors[0] ?? 0xef4444;
    const tint = mutations.includes('golden_gilded')
      ? 0xffd700
      : isSplitClone
        ? 0xc084fc
        : baseColor;

    const sprite = this.add.image(x, y, key).setTint(tint).setScale(scale).setDepth(6);
    const hpBg = this.add.rectangle(x, y - 62, 92, 8, 0x0f172a).setDepth(8);
    const hpFill = this.add.rectangle(x, y - 62, 92, 8, 0xf97316).setDepth(9);
    const nameText = this.add
      .text(x, y - 76, name, {
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
      atkTimer: 1.0,
      speed: 26,
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
      }
      if (this.walkTimer <= 0) {
        this.phase = 'combat';
        this.spawnWave();
      }
      this.updateCompanionVisuals();
      return;
    }

    if (this.phase === 'combat') {
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
    if (this.heroAura && this.heroSprite) {
      this.heroAura.setPosition(this.heroSprite.x, this.heroSprite.y);
    }
    if (this.heroGlow && this.heroSprite) {
      this.heroGlow.setPosition(this.heroSprite.x + 14, this.heroSprite.y + 4);
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

    // Auto-Skill check
    if (this.autoSkill && this.skillTimer <= 0 && this.enemies.length > 0) {
      this.triggerActiveSkill();
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
        const target = this.enemies[0];
        if (target) {
          this.damageEnemy(target, this.stats.atk * 0.65, false, 'RUNE');
        }
      }
    }

    // Bowman Hawk + Wolf companions
    if (this.runConfig.classId === 'bowman') {
      const clsLvl = this.runConfig.profile.classes.bowman.level;
      if (clsLvl >= 15 || this.hasEquippedLegendary('bow_cape_goldenfalcon')) {
        this.hawkTimer += dt;
        if (this.hawkTimer >= 1.5 && this.enemies.length > 0) {
          this.hawkTimer = 0;
          const target = this.enemies[0];
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
            this.damageEnemy(target, dmg, isCrit, 'HAWK');
            if (this.hasEquippedLegendary('bow_cape_goldenfalcon')) {
              const chance = this.isEquippedLegendaryCursed('bow_cape_goldenfalcon') ? 0.25 : 0.45;
              if (this.rng() < chance) {
                this.spawnLootDrop(target.sprite.x, target.sprite.y, this.rng() < 0.6 ? 'coin' : 'orb', 14);
              }
            }
          }
        }
      }

      if (this.wolfSprite) {
        this.wolfTimer += dt;
        const interval = this.isEquippedLegendaryCursed('bow_head_beastmaster') ? 1.5 : 1.3;
        if (this.wolfTimer >= interval && this.enemies.length > 0) {
          this.wolfTimer = 0;
          const target = this.enemies[0];
          if (target) {
            this.damageEnemy(target, this.stats.atk * 0.85, false, 'WOLF');
          }
        }
      }
    }

    // Move enemies & tick enemy status effects / boss mechanics
    const frontEnemy = this.getClosestEnemy();
    const inRange = frontEnemy ? frontEnemy.sprite.x - this.heroX <= this.stats.range : false;

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
      const d = e.sprite.x - this.heroX;
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private performHeroAttack(target: EnemyEntity): void {
    if (!this.stats || !this.runConfig) return;
    this.attackCount += 1;
    const classId = this.runConfig.classId;

    if (this.heroSprite) {
      this.tweens.add({
        targets: this.heroSprite,
        x: this.heroX + (classId === 'warrior' || classId === 'thief' ? 18 : 6),
        duration: 70,
        yoyo: true,
      });
    }

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

    if (classId === 'warrior') {
      soundFX.playSwing();
      const cleaveRange = this.draftedBuffIds.includes('prism_war_titan_cleave') ? 165 : 120;
      const { dmg, isCrit } = rollHit(1);
      for (const e of [...this.enemies]) {
        if (Math.abs(e.sprite.x - this.heroX) <= cleaveRange + 40) {
          this.damageEnemy(e, dmg, isCrit);
          if (!e.mutations.includes('juggernaut')) {
            const pushedX = Math.min(this.scale.width - 55, e.sprite.x + this.stats.knockbackPower);
            if (pushedX >= this.scale.width - 60 && this.hasEquippedLegendary('war_wep_worldbreaker')) {
              this.damageEnemy(e, dmg, false, 'WALL SLAM');
            }
            e.sprite.x = pushedX;
          }
        }
      }
      if (this.hasEquippedLegendary('war_wep_ragnarok') && this.attackCount % 3 === 0) {
        this.spawnProjectile('proj_wave', this.heroX + 20, this.groundY - 34, 460, 0, dmg * 1.4, isCrit, 99, false, false, true);
      }
    } else if (classId === 'mage') {
      soundFX.playSpell();
      const boltCount = this.hasEquippedLegendary('mage_wep_starlight')
        ? 3
        : this.draftedBuffIds.includes('prism_mage_tri_elemental')
          ? 2
          : 1;
      for (let i = 0; i < boltCount; i++) {
        const { dmg, isCrit } = rollHit(i === 0 ? 1 : 0.65);
        this.spawnProjectile(
          'proj_bolt',
          this.heroX + 24,
          this.groundY - 34 + (i - 1) * 14,
          440,
          (i - 1) * 28,
          dmg,
          isCrit,
          1,
          false,
          this.hasEquippedLegendary('mage_wep_glacial'),
          false,
          target.id
        );
      }
      if (this.hasEquippedLegendary('mage_wep_abyssal') && this.rng() < 0.2) {
        for (const e of this.enemies) {
          e.sprite.x = Phaser.Math.Linear(e.sprite.x, target.sprite.x, 0.55);
        }
        this.spawnFloatingText(target.sprite.x, target.sprite.y - 45, 'VOID PULL!', '#c084fc', 14);
      }
    } else if (classId === 'thief') {
      soundFX.playArrow();
      const pierce = this.hasEquippedLegendary('thief_head_bandana')
        ? this.isEquippedLegendaryCursed('thief_head_bandana')
          ? 2
          : 3
        : 1;
      const { dmg, isCrit } = rollHit(1);
      this.spawnProjectile('proj_star', this.heroX + 18, this.groundY - 28, 560, 0, dmg, isCrit, pierce, false, false, false, target.id);
      if (this.draftedBuffIds.includes('prism_thief_shadow_partner') || (isCrit && this.hasEquippedLegendary('thief_wep_shadowfang'))) {
        const mult = this.isEquippedLegendaryCursed('thief_wep_shadowfang') ? 0.4 : 0.6;
        this.spawnProjectile('proj_star', this.heroX + 8, this.groundY - 40, 560, 0, Math.round(dmg * mult), false, 1, false, false, false, target.id);
      }
    } else {
      soundFX.playArrow();
      const extraArrows =
        (this.hasEquippedLegendary('bow_wep_galeforce') ? 2 : 0) +
        (this.draftedBuffIds.includes('prism_bow_split_arrow') ? 2 : 0);
      const totalArrows = 1 + extraArrows;
      const guaranteedMark =
        this.draftedBuffIds.includes('prism_bow_snipers_mark') && this.attackCount % 3 === 0;
      const thunderInterval = this.isEquippedLegendaryCursed('bow_wep_thunderbird') ? 7 : 5;
      const isThunder = this.hasEquippedLegendary('bow_wep_thunderbird') && this.attackCount % thunderInterval === 0;

      for (let i = 0; i < totalArrows; i++) {
        const { dmg, isCrit } = rollHit(i === 0 ? 1 : 0.6, guaranteedMark && i === 0);
        const spreadVy = (i - (totalArrows - 1) / 2) * 32;
        this.spawnProjectile(
          isThunder && i === 0 ? 'proj_lightning' : 'proj_arrow',
          this.heroX + 24,
          this.groundY - 30,
          620,
          spreadVy,
          dmg * (guaranteedMark && i === 0 ? 1.25 : 1),
          isCrit,
          isThunder && i === 0 ? 4 : this.draftedBuffIds.includes('prism_bow_split_arrow') ? 2 : 1,
          this.hasEquippedLegendary('bow_wep_worldtree') && this.rng() < 0.25,
          false,
          false,
          target.id
        );
      }
    }

    // Silver Buff: Echo Strike (25% double strike)
    if (this.draftedBuffIds.includes('silver_echo_strike')) {
      const chance = this.hasEquippedLegendary('bow_cape_endlesssky')
        ? this.isEquippedLegendaryCursed('bow_cape_endlesssky')
          ? 0.375
          : 0.5
        : 0.25;
      if (this.rng() < chance) {
        const { dmg, isCrit } = rollHit(0.75);
        this.damageEnemy(target, dmg, isCrit, 'ECHO');
      }
    }

    // Silver Buff: Static Discharge (every 4th attack chains to 2 nearby foes)
    if (this.draftedBuffIds.includes('silver_static_discharge') && this.attackCount % 4 === 0) {
      const { dmg, isCrit } = rollHit(0.8);
      for (const e of this.enemies.slice(0, 2)) {
        this.damageEnemy(e, dmg, isCrit, 'CHAIN');
      }
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
    targetId: number | null = null
  ): void {
    const sprite = this.add.image(x, y, textureKey).setDepth(7);
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

      let destroyed = p.life <= 0 || p.sprite.x > (this.scale.width || 1024) + 60;
      if (!destroyed) {
        for (const e of [...this.enemies]) {
          if (p.hitIds.has(e.id)) continue;
          const dist = Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, e.sprite.x, e.sprite.y);
          if (dist <= (p.isWave ? 54 : 36)) {
            p.hitIds.add(e.id);
            this.damageEnemy(e, p.damage, p.isCrit);
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
    if (enemy.hp <= 0 || !this.stats || !this.runConfig) return;

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
        const skyDmg = Math.round(this.stats.atk * 1.2);
        for (const other of this.enemies) {
          if (other.id !== enemy.id && Math.abs(other.sprite.x - enemy.sprite.x) <= 95) {
            other.hp = Math.max(0, other.hp - skyDmg);
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
        const other = this.enemies.find((o) => o.id !== enemy.id);
        if (other) other.hp = Math.max(0, other.hp - Math.round(finalDmg * 0.4));
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
      this.spawnLootDrop(ex, ey, 'chest', enemy.isBoss ? 1 : 0);
      this.shardsCollected += enemy.isBoss ? 12 : 5;
      if (enemy.isBoss && this.floor === 4) {
        this.coresCollected += 1;
      }
    }
  }

  private updateEnemy(e: EnemyEntity, dt: number, heroInRange: boolean): void {
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
    const meleeDist = this.heroX + 74;
    if (e.stunTimer <= 0 && e.rootTimer <= 0 && e.sprite.x > meleeDist) {
      const slow = e.chillTimer > 0 ? 0.75 : 1;
      e.sprite.x = Math.max(meleeDist, e.sprite.x - e.speed * slow * dt);
    }

    if (e.stunTimer <= 0 && (e.sprite.x <= meleeDist + 16 || (e.isBoss && heroInRange))) {
      const enrageSpeed = 1 + e.enrageStacks * 0.15;
      const chillSlow = e.chillTimer > 0 ? 0.8 : 1;
      e.atkTimer -= dt * enrageSpeed * chillSlow;
      if (e.atkTimer <= 0) {
        e.atkTimer = e.atkIntervalSec;
        this.damageHero(e.atk, e);
      }
    }

    // Sync HP bar positions
    const barY = e.sprite.y - (e.isBoss ? 62 : 42);
    e.hpBg.setPosition(e.sprite.x, barY);
    e.hpFill.setPosition(e.sprite.x, barY);
    const ratio = Math.max(0, Math.min(1, e.hp / e.maxHp));
    e.hpFill.width = (e.isBoss ? 92 : 46) * ratio;
    e.nameText.setPosition(e.sprite.x, barY - 13);
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

  public triggerActiveSkill(): void {
    if (this.phase !== 'combat' || !this.stats || !this.runConfig || this.skillTimer > 0) return;

    const clsId = this.runConfig.classId;
    const def = getClassDefinition(clsId);
    const clsLvl = this.runConfig.profile.classes[clsId].level;
    const isUltimate = clsLvl >= 60;
    const cdMult = 1 - this.stats.cooldownReductionPct / 100;
    this.skillTimer = Math.max(2.5, def.activeSkillCooldownSec * cdMult);

    const skillMult = (1 + this.stats.skillPowerPct / 100) * this.stats.allDamageMult;
    const critMult = this.stats.critDmg;
    const skillName = isUltimate ? def.activeSkillUltimateName : def.activeSkillName;
    this.spawnFloatingText(this.heroX + 40, this.groundY - 105, skillName.toUpperCase(), '#38bdf8', 16);

    if (clsId === 'warrior') {
      soundFX.playBossRoar();
      const mult = isUltimate ? 4.5 : 2.5;
      for (const e of [...this.enemies]) {
        this.damageEnemy(e, this.stats.atk * mult * skillMult * critMult, true, 'SLAM');
        e.stunTimer = Math.max(e.stunTimer, 1.4);
      }
    } else if (clsId === 'mage') {
      soundFX.playSpell();
      const mult = isUltimate ? 5.2 : 3.0;
      const echoes = this.draftedBuffIds.includes('prism_mage_spell_echo') ? 2 : 1;
      for (let pass = 0; pass < echoes; pass++) {
        const power = pass === 0 ? mult : mult * 0.65;
        for (const e of [...this.enemies]) {
          this.damageEnemy(e, this.stats.atk * power * skillMult * critMult, true, 'NOVA');
        }
      }
    } else if (clsId === 'thief') {
      soundFX.playCrit();
      this.invulnHitsLeft = Math.max(this.invulnHitsLeft, 2);
      const hits = isUltimate ? 8 : 4;
      for (let i = 0; i < hits; i++) {
        const t = this.enemies[i % Math.max(1, this.enemies.length)];
        if (t) {
          t.bleedStacks = Math.min(5, t.bleedStacks + 1);
          t.bleedTimer = 3;
          this.damageEnemy(t, this.stats.atk * 0.85 * skillMult * critMult, true, 'SHADOW');
          if (!t.mutations.includes('juggernaut') && t.hp > 0) {
            t.sprite.x = Math.min((this.scale.width || 1024) - 55, t.sprite.x + 45);
          }
        }
      }
    } else {
      soundFX.playArrow();
      const arrows = isUltimate ? 16 : 8;
      for (let i = 0; i < arrows; i++) {
        this.spawnProjectile(
          'proj_arrow',
          this.heroX + 20,
          this.groundY - 56 + (i % 4) * 14,
          640,
          (i % 3 - 1) * 18,
          this.stats.atk * 0.85 * skillMult * critMult,
          true,
          2,
          false,
          false,
          false
        );
      }
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
      const recoveryPct = this.draftedBuffIds.includes('silver_second_wind') ? 0.27 : 0.15;
      this.healHero(this.stats.maxHp * recoveryPct, true);
    }

    if (this.floor >= 10) {
      soundFX.playVictory();
      this.finishRun('cleared');
      return;
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

    if (this.stats && this.stats.maxHp > prevMaxHp && chosenBuffId === 'bronze_hearty_constitution') {
      this.heroHp += this.stats.maxHp - prevMaxHp;
    } else if (this.stats) {
      this.heroHp = Math.min(this.heroHp, this.stats.maxHp);
    }

    if (this.floor === 4 || this.floor === 7) {
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
    const def = getClassDefinition(this.runConfig.classId);
    const clsLvl = this.runConfig.profile.classes[this.runConfig.classId].level;
    const boss = this.enemies.find((e) => e.isBoss);

    const mutNames = this.currentBossMutations.map((m) => getMutationById(m).id);
    const cdMult = 1 - this.stats.cooldownReductionPct / 100;
    const totalCd = Math.max(2.5, def.activeSkillCooldownSec * cdMult);
    const totalDashCd = Math.max(2.0, 5 * cdMult);

    this.callbacks?.onHudUpdate({
      floor: this.floor,
      maxFloors: 10,
      waveLabel:
        this.floor === 4
          ? 'Mini-Boss'
          : this.floor === 7
            ? 'Elite Ambush'
            : this.floor === 10
              ? 'End Boss'
              : `Wave ${this.waveIndex}/${this.totalWavesOnFloor}`,
      hp: Math.round(this.heroHp),
      maxHp: this.stats.maxHp,
      shield: Math.round(this.heroShield),
      gold: this.goldCollected,
      shards: this.shardsCollected,
      cores: this.coresCollected,
      skillCooldownPct: Math.min(1, Math.max(0, this.skillTimer / totalCd)),
      skillReady: this.skillTimer <= 0,
      skillName: clsLvl >= 60 ? def.activeSkillUltimateName : def.activeSkillName,
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
