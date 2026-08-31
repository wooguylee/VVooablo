/**
 * 게임 오케스트레이터.
 * 던전 층 생성/전환, 플레이어 배치, 전투/AI/스폰/렌더러 결선을 담당.
 * main.ts를 얇게 유지하기 위해 상태를 이 클래스에 모은다.
 */
import { Container, Graphics } from 'pixi.js';
import { Config } from '@/core/Config';
import { Rng } from '@/core/Rng';
import { World } from '@/core/ecs';
import { Camera } from '@/render/Camera';
import { TileGridRenderer } from '@/render/TileGridRenderer';
import { FeatureMarkers } from '@/render/FeatureMarkers';
import { DamageNumbers } from '@/render/DamageNumbers';
import { HealthBars } from '@/render/HealthBars';
import { ParticleSystem } from '@/render/ParticleSystem';
import { worldToScreen, screenToWorld } from '@/render/iso';
import { generateFloor, type FloorInfo } from '@/world/DungeonManager';
import { spawnMonsters } from '@/world/SpawnManager';
import { SpatialHash } from '@/world/SpatialHash';
import type { TileMap } from '@/world/TileMap';
import { createPlayer } from '@/entities/createPlayer';
import { createProfile, addToInventory, type PlayerProfile } from '@/entities/playerProfile';
import { equipItem, unequipItem, applyProfileStats } from '@/systems/items/equipSystem';
import { rollDrops } from '@/systems/items/dropSystem';
import { GroundItems } from '@/render/GroundItems';
import { gainXp } from '@/systems/leveling';
import { generateTown, type TownFeatures } from '@/world/Town';
import { generateShopStock } from '@/systems/shopSystem';
import { buyItem, sellItem, buyPotion } from '@/systems/shopSystem';
import { spendStatPoint } from '@/systems/leveling';
import { allocateTalent, resetTalents } from '@/systems/talentSystem';
import { updatePotionCooldown, usePotion, type PotionState } from '@/systems/potionSystem';
import type { ItemInstance } from '@/data/itemTypes';
import { buildSave, deserializeProfile, type SaveData } from '@/save/serialize';
import { nextUid, setNextUid } from '@/systems/items/generateItem';
import type { SoundSystem } from '@/audio/SoundSystem';
import { createTotem } from '@/entities/createTotem';
import { createMonster } from '@/entities/createMonster';
import { MONSTERS } from '@/data/monsters';
import { C, type Position, type Movement } from '@/entities/components';
import { CC, type Health, type Corpse, type Faction, type Stats } from '@/entities/combatComponents';
import { AC, type Boss, type Elite } from '@/entities/aiComponents';
import { SC, type SkillUser } from '@/entities/skillComponents';
import { InputController } from '@/systems/InputController';
import { SkillInput } from '@/systems/SkillInput';
import { movementSystem } from '@/systems/movementSystem';
import { animationTickSystem, renderSyncSystem } from '@/systems/renderSyncSystem';
import { aiSystem, type AiContext } from '@/systems/aiSystem';
import { combatSystem } from '@/systems/combatSystem';
import { applyDamageToEntity } from '@/systems/combat/applyDamage';
import { inCircle } from '@/systems/combat/hitbox';
import { vulnerabilityMultiplier } from '@/systems/status/statusSystem';
import { computeDamage } from '@/systems/combat/damage';
import {
  rebuildSpatialHash,
  playerTargetingSystem,
  allyTargetingSystem,
} from '@/systems/targetingSystem';
import { ProjectileSystem } from '@/systems/ProjectileSystem';
import { statusSystem } from '@/systems/status/statusSystem';
import { castSkill, skillSystem, type SkillContext } from '@/systems/skillSystem';

const CORPSE_FADE = 1.2;
const SPAWN_BASE = 10;

export class Game {
  readonly world = new World();
  readonly camera: Camera;
  private worldContainer: Container;
  private canvas: HTMLCanvasElement;
  private rng: Rng;
  private hash = new SpatialHash(4);

  baseSeed: number;
  depth = 1;
  floor!: FloorInfo;
  map!: TileMap;
  player = 0;
  playerDead = false;
  boss = -1;
  isTown = false;
  townFeatures: TownFeatures | null = null;
  shopStock: ItemInstance[] = [];
  private potionState: PotionState = { cooldown: 0 };
  profile: PlayerProfile = createProfile();
  sound: SoundSystem | null = null;
  /** 자동 저장 슬롯 (기본 0) */
  saveSlot = 0;
  private autosaveTimer = 0;
  onAutosave: ((data: SaveData) => void) | null = null;

  private grid!: TileGridRenderer;
  private markers!: FeatureMarkers;
  private entityLayer!: Container;
  private telegraphGfx!: Graphics;
  private groundItems!: GroundItems;
  private damageNumbers!: DamageNumbers;
  private healthBars!: HealthBars;
  private particles!: ParticleSystem;
  private projectiles!: ProjectileSystem;
  private skillCtx!: SkillContext;
  private skillInput: SkillInput;
  private input!: InputController;
  private debugGfx: Graphics;

  constructor(
    worldContainer: Container,
    camera: Camera,
    canvas: HTMLCanvasElement,
    baseSeed: number,
  ) {
    this.worldContainer = worldContainer;
    this.camera = camera;
    this.canvas = canvas;
    this.baseSeed = baseSeed;
    this.rng = new Rng(baseSeed);
    this.debugGfx = new Graphics();
    this.skillInput = new SkillInput(camera, canvas);
    // 포션 입력 (1~4)
    window.addEventListener('keydown', (e) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        this.tryUsePotion();
      }
    });
    this.loadFloor(0); // 마을에서 시작
  }

  private tryUsePotion(): void {
    const healed = usePotion(this.world, this.player, this.profile, this.potionState);
    if (healed > 0) {
      const pos = this.world.store<Position>(C.Position).get(this.player);
      if (pos) this.damageNumbers.spawn(pos.x, pos.y, healed, 'cold', false);
      this.sound?.play('potion');
    }
  }

  /** 피격 연출 + 사운드 */
  private hitFx(x: number, y: number, amount: number, type: import('@/systems/combat/damage').DamageType, isCrit: boolean): void {
    this.damageNumbers.spawn(x, y, amount, type, isCrit);
    this.sound?.play(isCrit ? 'crit' : 'hit');
  }

  loadFloor(depth: number, spawnAt: 'entrance' | 'exit' = 'entrance'): void {
    this.worldContainer.removeChildren();
    this.world.clear();
    this.playerDead = false;

    this.depth = depth;
    this.isTown = depth === 0;
    if (this.isTown) {
      const town = generateTown(this.baseSeed);
      this.floor = { depth: 0, monsterLevel: 1, dungeon: town.dungeon };
      this.townFeatures = town.features;
    } else {
      this.floor = generateFloor(this.baseSeed, depth);
      this.townFeatures = null;
    }
    this.map = this.floor.dungeon.map;
    // 층 RNG (전투/변동에 사용, 층별 결정성)
    this.rng = new Rng((this.floor.dungeon.seed ^ 0xc0dba7) >>> 0);

    this.grid = new TileGridRenderer(this.worldContainer, this.map, this.floor.dungeon.seed);
    this.markers = new FeatureMarkers(this.worldContainer);
    this.markers.draw(this.floor.dungeon.features);

    this.entityLayer = new Container();
    this.entityLayer.sortableChildren = true;
    this.worldContainer.addChild(this.entityLayer);

    this.healthBars = new HealthBars(this.worldContainer);
    this.damageNumbers = new DamageNumbers(this.worldContainer);
    this.particles = new ParticleSystem(this.worldContainer);
    this.projectiles = new ProjectileSystem(this.worldContainer);
    this.groundItems = new GroundItems(this.worldContainer);
    this.telegraphGfx = new Graphics();
    this.worldContainer.addChild(this.telegraphGfx);
    this.worldContainer.addChild(this.debugGfx);

    this.skillCtx = {
      world: this.world,
      rng: this.rng,
      projectiles: this.projectiles,
      particles: this.particles,
      onHit: (x, y, r) => this.hitFx(x, y, r.amount, r.type, r.isCrit),
      onKill: (e) => this.onDeath(e, 'enemy'),
      onSummon: (x, y, def, lvl) => {
        createTotem(this.world, this.entityLayer, def, x, y, lvl);
      },
    };

    const feats = this.floor.dungeon.features;
    const spawn = spawnAt === 'entrance' ? feats.entrance : feats.exit;
    this.player = createPlayer(this.world, this.entityLayer, {
      x: spawn.x,
      y: spawn.y,
      profile: this.profile,
    });

    // 몬스터 스폰 (마을은 생략)
    if (this.isTown) {
      this.boss = -1;
      // 상점 재고 생성 (방문 시 갱신)
      this.shopStock = generateShopStock(
        new Rng((this.baseSeed ^ 0x5407) >>> 0),
        Math.max(1, this.profile.level),
      );
    } else {
      const count = SPAWN_BASE + depth * 3;
      const spawnResult = spawnMonsters(
        this.world,
        this.entityLayer,
        this.floor.dungeon,
        this.floor.monsterLevel,
        count,
      );
      this.boss = spawnResult.boss ?? -1;
    }

    const s = worldToScreen(spawn.x + 0.5, spawn.y + 0.5);
    this.camera.snapTo(s.x, s.y);

    this.input = new InputController(this.world, this.map, this.camera, this.canvas, this.player);
  }

  reseed(seedStr: string): void {
    const s = seedStr.trim();
    if (!s) return;
    this.baseSeed = Number.isNaN(Number(s)) ? Rng.seedFromString(s) : Number(s) >>> 0;
    this.loadFloor(this.depth);
  }

  descend(): void {
    this.loadFloor(this.depth + 1, 'entrance');
  }
  ascend(): void {
    if (this.depth > 1) this.loadFloor(this.depth - 1, 'exit');
  }

  update(dt: number): void {
    this.input.update();
    this.telegraphGfx.clear();
    movementSystem(this.world, dt);

    // AI → 타겟팅 → 전투
    rebuildSpatialHash(this.world, this.hash);
    aiSystem(this.buildAiContext(), dt);
    playerTargetingSystem(this.world, this.hash, this.player);
    allyTargetingSystem(this.world, this.hash, this.player);
    combatSystem(this.world, dt, this.rng, {
      onDamage: (_e, x, y, r) => this.hitFx(x, y, r.amount, r.type, r.isCrit),
      onDeath: (e, fac) => this.onDeath(e, fac),
    });

    // 스킬 입력 처리 + 스킬/상태이상/투사체
    this.processSkillInput();
    skillSystem(this.skillCtx, dt);
    statusSystem(this.world, dt, {
      onBurnTick: (e, dmg) => {
        const pos = this.world.store<Position>(C.Position).get(e);
        if (pos) this.damageNumbers.spawn(pos.x, pos.y, dmg, 'fire', false);
      },
    });
    this.projectiles.update(this.world, dt, this.rng, {
      onHit: (x, y, r) => this.hitFx(x, y, r.amount, r.type, r.isCrit),
      onKill: (e) => this.onDeath(e, 'enemy'),
    });

    animationTickSystem(this.world, dt);
    this.particles.update(dt);
    this.damageNumbers.update(dt);
    updatePotionCooldown(this.potionState, dt);
    this.cleanupCorpses(dt);

    // 자동 저장 (10초마다)
    this.autosaveTimer += dt;
    if (this.autosaveTimer >= 10) {
      this.autosaveTimer = 0;
      if (this.onAutosave && !this.playerDead) {
        this.onAutosave(this.buildSaveData());
      }
    }

    const pos = this.world.store<Position>(C.Position).get(this.player);
    if (pos) {
      const s = worldToScreen(pos.x + 0.5, pos.y + 0.5);
      this.camera.follow(s.x, s.y);
      if (!this.playerDead) {
        this.checkStairs(pos);
        this.pickupNearby(pos);
      }
    }
    this.camera.update(dt);
  }

  /** 근처 지면 아이템/골드 자동 획득 */
  private pickupNearby(pos: Position): void {
    const result = this.groundItems.tryPickup(pos.x, pos.y);
    if (result.gold > 0) this.profile.inventory.gold += result.gold;
    for (const item of result.items) {
      addToInventory(this.profile.inventory, item);
    }
    if (result.gold > 0 || result.items.length > 0) this.sound?.play('pickup');
  }

  private processSkillInput(): void {
    if (this.playerDead) return;
    const su = this.world.store<SkillUser>(SC.SkillUser).get(this.player);
    if (!su) return;
    for (const req of this.skillInput.drain()) {
      const skillId = su.slots[req.slot];
      if (skillId && castSkill(this.skillCtx, this.player, skillId, req.targetX, req.targetY)) {
        this.sound?.play('skill');
      }
    }
  }

  private buildAiContext(): AiContext {
    return {
      world: this.world,
      map: this.map,
      player: this.player,
      rng: this.rng,
      projectiles: this.projectiles,
      requestSummon: (x, y, id, lvl) => {
        const def = MONSTERS[id];
        if (def) createMonster(this.world, this.entityLayer, def, x, y, lvl, {});
      },
      onTelegraph: (x, y, radius, type) => this.drawTelegraph(x, y, radius, type),
      dealAoe: (x, y, radius, coeff, level, weaponBase) =>
        this.dealAoe(x, y, radius, coeff, level, weaponBase),
      onHit: (x, y, amount, type) => this.damageNumbers.spawn(x, y, amount, type, false),
      onKill: (e) => this.onDeath(e, e === this.player ? 'player' : 'enemy'),
    };
  }

  /** 보스 광역 패턴 피해 (플레이어 대상) */
  private dealAoe(
    x: number,
    y: number,
    radius: number,
    coeff: number,
    level: number,
    weaponBase: number,
  ): void {
    if (radius <= 0 || coeff <= 0) return;
    const pos = this.world.store<Position>(C.Position).get(this.player);
    const ph = this.world.store<Health>(CC.Health).get(this.player);
    const pStats = this.world.store<Stats>(CC.Stats).get(this.player);
    if (!pos || !ph || ph.dead) return;
    if (!inCircle(pos.x, pos.y, x, y, radius)) return;
    const result = computeDamage(
      {
        weaponBase,
        skillCoeff: coeff,
        increasedDamage: 0,
        critChance: 0,
        critDamage: 1.5,
        attackerLevel: level,
        type: 'fire',
      },
      { armor: pStats?.derived.armor ?? 0, resistance: pStats?.derived.resistance ?? 0 },
      this.rng,
    );
    const vuln = vulnerabilityMultiplier(this.world, this.player);
    result.amount = Math.max(1, Math.round(result.amount * vuln));
    applyDamageToEntity(this.world, this.player, result.amount);
    this.damageNumbers.spawn(pos.x, pos.y, result.amount, 'fire', false);
    this.camera.shake(5, 0.25);
    if (ph.hp <= 0 && !ph.dead) {
      ph.hp = 0;
      ph.dead = true;
      this.onDeath(this.player, 'player');
    }
  }

  private drawTelegraph(x: number, y: number, radius: number, type: string): void {
    const g = this.telegraphGfx;
    const s = worldToScreen(x + 0.5, y + 0.5);
    const color = type === 'nova' ? 0xff3333 : 0xffaa33;
    // 아이소 타원 근사 (반경을 화면 비율로)
    g.ellipse(s.x, s.y, radius * 16, radius * 8);
    g.stroke({ color, width: 2, alpha: 0.8 });
    g.ellipse(s.x, s.y, radius * 16, radius * 8);
    g.fill({ color, alpha: 0.15 });
  }

  private onDeath(entity: number, faction: 'player' | 'enemy'): void {
    if (faction === 'player') {
      this.playerDead = true;
      this.camera.shake(8, 0.5);
      this.sound?.play('death');
    } else {
      this.camera.shake(3, 0.15);
      this.sound?.play('death');
      this.grantXp(entity);
      this.rollLoot(entity);
      // 시체 표시 후 제거 예약
      this.world.store<Corpse>(CC.Corpse).set(entity, { timer: CORPSE_FADE });
    }
  }

  /** 적 처치 경험치 획득 + 레벨업 시 스탯 재적용 */
  private grantXp(entity: number): void {
    const xp = this.world.store<number>(CC.XpReward).get(entity) ?? 0;
    if (xp <= 0) return;
    const result = gainXp(this.profile, xp);
    if (result.leveledUp) {
      applyProfileStats(this.world, this.player, this.profile);
      // 레벨업 시 체력 완전 회복 + 연출
      const h = this.world.store<Health>(CC.Health).get(this.player);
      if (h) h.hp = h.maxHp;
      this.camera.shake(2, 0.2);
      this.sound?.play('levelup');
    }
  }

  /** 적 사망 시 드롭 롤링 → 지면 아이템 생성 */
  private rollLoot(entity: number): void {
    const pos = this.world.store<Position>(C.Position).get(entity);
    if (!pos) return;
    const isBoss = entity === this.boss;
    const isElite = this.world.store<Elite>(AC.Elite).has(entity);
    const dropChance = isBoss ? 1 : isElite ? 0.6 : 0.18;
    const bonus = isBoss ? 3 : isElite ? 1 : 0;
    const itemLevel = this.floor.monsterLevel + (isBoss ? 3 : 0);
    const drops = rollDrops(this.rng, itemLevel, dropChance, bonus);
    // 아이템을 몬스터 주변에 흩뿌림
    let offset = 0;
    for (const item of drops.items) {
      const dx = Math.cos(offset) * 0.6;
      const dy = Math.sin(offset) * 0.6;
      this.groundItems.dropItem(item, pos.x + dx, pos.y + dy);
      offset += 1.2;
    }
    if (drops.gold > 0) this.groundItems.dropGold(drops.gold, pos.x, pos.y);
  }

  /** 인벤토리 장착 (UI 콜백) */
  equip(uid: number): void {
    if (equipItem(this.profile, uid)) {
      applyProfileStats(this.world, this.player, this.profile);
    }
  }
  unequip(slot: import('@/data/itemTypes').EquipSlot): void {
    if (unequipItem(this.profile, slot)) {
      applyProfileStats(this.world, this.player, this.profile);
    }
  }

  private cleanupCorpses(dt: number): void {
    const corpses = this.world.store<Corpse>(CC.Corpse);
    const toRemove: number[] = [];
    for (const [entity, c] of corpses.entries()) {
      c.timer -= dt;
      if (c.timer <= 0) toRemove.push(entity);
    }
    for (const e of toRemove) {
      const spr = this.world.store<{ container: Container }>(C.Sprite).get(e);
      spr?.container.destroy();
      this.world.destroyEntity(e);
    }
  }

  private checkStairs(pos: Position): void {
    const mv = this.world.store<Movement>(C.Movement).get(this.player);
    if (mv && mv.moving) return;
    const feats = this.floor.dungeon.features;
    if (Math.round(pos.x) === feats.exit.x && Math.round(pos.y) === feats.exit.y) {
      this.descend();
    }
  }

  /** 마을에서 부활 */
  respawn(): void {
    this.loadFloor(0, 'entrance');
  }

  /** 마을로 귀환 (포탈) */
  returnToTown(): void {
    this.loadFloor(0, 'entrance');
  }

  /** 현재 상태를 SaveData로 직렬화 */
  buildSaveData(slot = this.saveSlot): SaveData {
    return buildSave(slot, this.baseSeed, this.depth, this.profile, nextUid());
  }

  /** SaveData 적용 (로드) */
  applySave(data: SaveData): void {
    this.baseSeed = data.baseSeed;
    this.profile = deserializeProfile(data.profile);
    setNextUid(data.nextUid);
    this.saveSlot = data.slot;
    this.loadFloor(data.depth === 0 ? 0 : data.depth, 'entrance');
  }

  render(alpha: number): void {
    this.camera.apply();
    renderSyncSystem(this.world, alpha);
    this.projectiles.render(alpha);
    this.particles.render();
    this.healthBars.render(this.world, this.player);
    this.damageNumbers.render();

    const z = this.camera.zoom;
    const wpos = this.worldContainer.position;
    this.grid.cull(
      -wpos.x,
      -wpos.y,
      -wpos.x + Config.internalWidth / z,
      -wpos.y + Config.internalHeight / z,
    );
    this.drawDebug();
  }

  private drawDebug(): void {
    const g = this.debugGfx;
    g.clear();
    const hw = Config.tileWidth / 2;
    const hh = Config.tileHeight / 2;
    const h = this.input.hoverTile;
    const s = worldToScreen(h.x + 0.5, h.y + 0.5);
    g.poly([s.x, s.y - hh, s.x + hw, s.y, s.x, s.y + hh, s.x - hw, s.y]);
    g.stroke({ color: 0xffff66, width: 1 });
    for (const p of this.input.lastPath) {
      const ps = worldToScreen(p.x + 0.5, p.y + 0.5);
      g.circle(ps.x, ps.y, 2);
      g.fill({ color: 0x66ccff, alpha: 0.8 });
    }
  }

  playerHealth(): Health | undefined {
    return this.world.store<Health>(CC.Health).get(this.player);
  }

  playerSkills(): SkillUser | undefined {
    return this.world.store<SkillUser>(SC.SkillUser).get(this.player);
  }

  get inventory() {
    return this.profile.inventory;
  }
  get equipment() {
    return this.profile.equipment;
  }

  /** 플레이어 타일 위치 (UI 상호작용 판정용) */
  playerTile(): { x: number; y: number } | null {
    const pos = this.world.store<Position>(C.Position).get(this.player);
    return pos ? { x: pos.x, y: pos.y } : null;
  }

  /** 마을에서 상인/스탯리셋 근처인지 */
  nearMerchant(): boolean {
    return this.nearFeature(this.townFeatures?.merchant);
  }
  nearStatReset(): boolean {
    return this.nearFeature(this.townFeatures?.statReset);
  }
  private nearFeature(f: { x: number; y: number } | undefined): boolean {
    if (!this.isTown || !f) return false;
    const p = this.playerTile();
    if (!p) return false;
    return Math.hypot(p.x - f.x, p.y - f.y) <= 2;
  }

  /**
   * 가상 조이스틱 방향 이동 (모바일).
   * 화면 방향 벡터 → 월드 방향으로 변환해 한 칸 앞 목표로 이동시킨다.
   */
  moveByDirection(screenDx: number, screenDy: number): void {
    if (this.playerDead) return;
    if (Math.abs(screenDx) < 0.1 && Math.abs(screenDy) < 0.1) return;
    const pos = this.world.store<Position>(C.Position).get(this.player);
    const mv = this.world.store<Movement>(C.Movement).get(this.player);
    if (!pos || !mv) return;
    // 화면 방향 → 월드 방향
    const w = screenToWorld(screenDx, screenDy);
    const len = Math.hypot(w.x, w.y) || 1;
    const tx = Math.round(pos.x + (w.x / len) * 2);
    const ty = Math.round(pos.y + (w.y / len) * 2);
    if (this.map.isWalkable(tx, ty)) {
      mv.path = [{ x: tx, y: ty }];
    }
  }

  /** 가상 버튼: 스킬 시전 (마우스 방향 대신 최근접 적/전방) */
  castSkillSlot(slot: number): void {
    if (this.playerDead) return;
    const su = this.world.store<SkillUser>(SC.SkillUser).get(this.player);
    const pos = this.world.store<Position>(C.Position).get(this.player);
    if (!su || !pos) return;
    const skillId = su.slots[slot];
    if (!skillId) return;
    const atk = this.world
      .store<import('@/entities/combatComponents').Attacker>(CC.Attacker)
      .get(this.player);
    let tx = pos.x + 2;
    let ty = pos.y + 2;
    if (atk && atk.target >= 0 && this.world.isAlive(atk.target)) {
      const tp = this.world.store<Position>(C.Position).get(atk.target);
      if (tp) {
        tx = tp.x;
        ty = tp.y;
      }
    }
    if (castSkill(this.skillCtx, this.player, skillId, tx, ty)) this.sound?.play('skill');
  }

  /** 가상 버튼: 포션 사용 */
  usePotionButton(): void {
    this.tryUsePotion();
  }

  /** 장착 후 스탯 반영을 외부(특성/스탯 UI)에서 호출 */
  refreshStats(): void {
    applyProfileStats(this.world, this.player, this.profile);
  }

  /** 스탯 포인트 투자 */
  spendStat(stat: 'str' | 'dex' | 'int' | 'vit'): void {
    if (spendStatPoint(this.profile, stat)) this.refreshStats();
  }
  /** 특성 배분 */
  allocTalent(id: string): void {
    if (allocateTalent(this.profile, id)) this.refreshStats();
  }
  /** 특성 초기화 */
  resetTalents(): void {
    resetTalents(this.profile);
    this.refreshStats();
  }
  /** 상점 구매 */
  buy(item: ItemInstance): void {
    if (buyItem(this.profile, item)) {
      this.shopStock = this.shopStock.filter((i) => i.uid !== item.uid);
    }
  }
  sell(uid: number): void {
    sellItem(this.profile, uid);
  }
  buyPotion(): void {
    buyPotion(this.profile);
  }

  /** 보스 정보 (HUD용). 없으면 null. */
  bossInfo(): { hp: number; maxHp: number; phase: number } | null {
    if (this.boss < 0 || !this.world.isAlive(this.boss)) return null;
    const h = this.world.store<Health>(CC.Health).get(this.boss);
    const b = this.world.store<Boss>(AC.Boss).get(this.boss);
    if (!h || h.dead || !b) return null;
    return { hp: h.hp, maxHp: h.maxHp, phase: b.phase };
  }

  get visibleChunks(): number {
    return this.grid.visibleChunks;
  }
  get totalChunks(): number {
    return this.grid.totalChunks;
  }
  get hoverTile(): { x: number; y: number } {
    return this.input.hoverTile;
  }
  get aliveEnemies(): number {
    let n = 0;
    const healths = this.world.store<Health>(CC.Health);
    const factions = this.world.store<Faction>(CC.Faction);
    for (const [e, f] of factions.entries()) {
      if (f.id === 'enemy') {
        const h = healths.get(e);
        if (h && !h.dead) n++;
      }
    }
    return n;
  }
}
