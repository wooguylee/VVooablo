/**
 * 게임 오케스트레이터.
 * 던전 층 생성/전환, 플레이어 배치, 렌더러/시스템 결선을 담당.
 * main.ts를 얇게 유지하기 위해 상태를 이 클래스에 모은다.
 */
import { Container, Graphics } from 'pixi.js';
import { Config } from '@/core/Config';
import { Rng } from '@/core/Rng';
import { World } from '@/core/ecs';
import { Camera } from '@/render/Camera';
import { TileGridRenderer } from '@/render/TileGridRenderer';
import { FeatureMarkers } from '@/render/FeatureMarkers';
import { worldToScreen } from '@/render/iso';
import { generateFloor, type FloorInfo } from '@/world/DungeonManager';
import type { TileMap } from '@/world/TileMap';
import { createPlayer } from '@/entities/createPlayer';
import { C, type Position, type Movement } from '@/entities/components';
import { InputController } from '@/systems/InputController';
import { movementSystem } from '@/systems/movementSystem';
import { animationTickSystem, renderSyncSystem } from '@/systems/renderSyncSystem';

export class Game {
  readonly world = new World();
  readonly camera: Camera;
  private worldContainer: Container;
  private canvas: HTMLCanvasElement;

  baseSeed: number;
  depth = 1;
  floor!: FloorInfo;
  map!: TileMap;
  player = 0;

  private grid!: TileGridRenderer;
  private markers!: FeatureMarkers;
  private entityLayer!: Container;
  private input!: InputController;
  private debugGfx: Graphics;

  constructor(worldContainer: Container, camera: Camera, canvas: HTMLCanvasElement, baseSeed: number) {
    this.worldContainer = worldContainer;
    this.camera = camera;
    this.canvas = canvas;
    this.baseSeed = baseSeed;
    this.debugGfx = new Graphics();
    this.loadFloor(1);
  }

  /** 지정 층 생성 후 전환. spawnAt: 'entrance' | 'exit' */
  loadFloor(depth: number, spawnAt: 'entrance' | 'exit' = 'entrance'): void {
    // 기존 렌더 정리
    this.worldContainer.removeChildren();
    this.world.clear();

    this.depth = depth;
    this.floor = generateFloor(this.baseSeed, depth);
    this.map = this.floor.dungeon.map;

    this.grid = new TileGridRenderer(this.worldContainer, this.map, this.floor.dungeon.seed);
    this.markers = new FeatureMarkers(this.worldContainer);
    this.markers.draw(this.floor.dungeon.features);

    this.entityLayer = new Container();
    this.entityLayer.sortableChildren = true;
    this.worldContainer.addChild(this.entityLayer);
    this.worldContainer.addChild(this.debugGfx);

    const feats = this.floor.dungeon.features;
    const spawn = spawnAt === 'entrance' ? feats.entrance : feats.exit;
    this.player = createPlayer(this.world, this.entityLayer, { x: spawn.x, y: spawn.y });

    const s = worldToScreen(spawn.x + 0.5, spawn.y + 0.5);
    this.camera.snapTo(s.x, s.y);

    this.input = new InputController(this.world, this.map, this.camera, this.canvas, this.player);
  }

  /** 새 base 시드로 현재 층 재생성 */
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

  /** 고정 스텝 업데이트 */
  update(dt: number): void {
    this.input.update();
    movementSystem(this.world, dt);
    animationTickSystem(this.world, dt);

    const pos = this.world.store<Position>(C.Position).get(this.player);
    if (pos) {
      const s = worldToScreen(pos.x + 0.5, pos.y + 0.5);
      this.camera.follow(s.x, s.y);
      this.checkStairs(pos);
    }
    this.camera.update(dt);
  }

  /** 출구 타일 도달 시 다음 층으로 (이동 완료 후) */
  private checkStairs(pos: Position): void {
    const mv = this.world.store<Movement>(C.Movement).get(this.player);
    if (mv && mv.moving) return;
    const feats = this.floor.dungeon.features;
    const px = Math.round(pos.x);
    const py = Math.round(pos.y);
    if (px === feats.exit.x && py === feats.exit.y) {
      this.descend();
    }
  }

  /** 렌더 (가변 프레임) */
  render(alpha: number): void {
    this.camera.apply();
    renderSyncSystem(this.world, alpha);

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

  get visibleChunks(): number {
    return this.grid.visibleChunks;
  }
  get totalChunks(): number {
    return this.grid.totalChunks;
  }
  get hoverTile(): { x: number; y: number } {
    return this.input.hoverTile;
  }
}
