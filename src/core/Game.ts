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
import { worldToScreen } from '@/render/iso';
import { generateFloor, type FloorInfo } from '@/world/DungeonManager';
import { spawnMonsters } from '@/world/SpawnManager';
import { SpatialHash } from '@/world/SpatialHash';
import type { TileMap } from '@/world/TileMap';
import { createPlayer } from '@/entities/createPlayer';
import { C, type Position, type Movement } from '@/entities/components';
import { CC, type Health, type Corpse, type Faction } from '@/entities/combatComponents';
import { InputController } from '@/systems/InputController';
import { movementSystem } from '@/systems/movementSystem';
import { animationTickSystem, renderSyncSystem } from '@/systems/renderSyncSystem';
import { aiSystem } from '@/systems/aiSystem';
import { combatSystem } from '@/systems/combatSystem';
import { rebuildSpatialHash, playerTargetingSystem } from '@/systems/targetingSystem';

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

  private grid!: TileGridRenderer;
  private markers!: FeatureMarkers;
  private entityLayer!: Container;
  private damageNumbers!: DamageNumbers;
  private healthBars!: HealthBars;
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
    this.loadFloor(1);
  }

  loadFloor(depth: number, spawnAt: 'entrance' | 'exit' = 'entrance'): void {
    this.worldContainer.removeChildren();
    this.world.clear();
    this.playerDead = false;

    this.depth = depth;
    this.floor = generateFloor(this.baseSeed, depth);
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
    this.worldContainer.addChild(this.debugGfx);

    const feats = this.floor.dungeon.features;
    const spawn = spawnAt === 'entrance' ? feats.entrance : feats.exit;
    this.player = createPlayer(this.world, this.entityLayer, { x: spawn.x, y: spawn.y });

    // 몬스터 스폰 (깊이에 따라 증가)
    const count = SPAWN_BASE + depth * 3;
    spawnMonsters(this.world, this.entityLayer, this.floor.dungeon, this.floor.monsterLevel, count);

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
    movementSystem(this.world, dt);

    // AI → 타겟팅 → 전투
    rebuildSpatialHash(this.world, this.hash);
    aiSystem(this.world, dt, this.map, this.player);
    playerTargetingSystem(this.world, this.hash, this.player);
    combatSystem(this.world, dt, this.rng, {
      onDamage: (_e, x, y, r) => this.damageNumbers.spawn(x, y, r.amount, r.type, r.isCrit),
      onDeath: (e, fac) => this.onDeath(e, fac),
    });

    animationTickSystem(this.world, dt);
    this.damageNumbers.update(dt);
    this.cleanupCorpses(dt);

    const pos = this.world.store<Position>(C.Position).get(this.player);
    if (pos) {
      const s = worldToScreen(pos.x + 0.5, pos.y + 0.5);
      this.camera.follow(s.x, s.y);
      if (!this.playerDead) this.checkStairs(pos);
    }
    this.camera.update(dt);
  }

  private onDeath(entity: number, faction: 'player' | 'enemy'): void {
    if (faction === 'player') {
      this.playerDead = true;
      this.camera.shake(8, 0.5);
    } else {
      this.camera.shake(3, 0.15);
      // 시체 표시 후 제거 예약
      this.world.store<Corpse>(CC.Corpse).set(entity, { timer: CORPSE_FADE });
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

  /** 마을(1층)에서 부활 */
  respawn(): void {
    this.loadFloor(1, 'entrance');
  }

  render(alpha: number): void {
    this.camera.apply();
    renderSyncSystem(this.world, alpha);
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
