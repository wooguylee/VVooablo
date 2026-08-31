/**
 * 클릭 이동 입력 컨트롤러.
 * - 좌클릭(홀드): 목표 타일로 지속 이동
 * - 마우스 이동 시 목표 타일 추적
 * - 모바일 터치 대응 (pointer 이벤트)
 *
 * 목표 타일이 바뀌면 A* 재탐색 후 경로 스무딩하여 Movement에 주입.
 */
import type { World, Entity } from '@/core/ecs';
import { C, type Position, type Movement } from '@/entities/components';
import { findPath, smoothPath } from '@/world/pathfinding';
import type { TileMap } from '@/world/TileMap';
import type { Camera } from '@/render/Camera';
import { screenToTile } from '@/render/iso';
import { Config } from '@/core/Config';

export class InputController {
  private world: World;
  private map: TileMap;
  private camera: Camera;
  private canvas: HTMLCanvasElement;
  private player: Entity;

  private pointerDown = false;
  private targetTile = { x: -1, y: -1 };
  private lastTargetTile = { x: -1, y: -1 };
  hoverTile = { x: 0, y: 0 };
  /** 디버그 시각화용 마지막 경로 */
  lastPath: Array<{ x: number; y: number }> = [];

  constructor(
    world: World,
    map: TileMap,
    camera: Camera,
    canvas: HTMLCanvasElement,
    player: Entity,
  ) {
    this.world = world;
    this.map = map;
    this.camera = camera;
    this.canvas = canvas;
    this.player = player;
    this.attach();
  }

  private toTile(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * Config.internalWidth;
    const py = ((clientY - rect.top) / rect.height) * Config.internalHeight;
    const local = this.camera.screenToWorldLocal(px, py);
    return screenToTile(local.x, local.y);
  }

  private attach(): void {
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0 || e.pointerType === 'touch') {
        this.pointerDown = true;
        this.targetTile = this.toTile(e.clientX, e.clientY);
      }
    });
    window.addEventListener('pointerup', () => {
      this.pointerDown = false;
    });
    this.canvas.addEventListener('pointermove', (e) => {
      this.hoverTile = this.toTile(e.clientX, e.clientY);
      if (this.pointerDown) this.targetTile = this.hoverTile;
    });
  }

  /** 고정 스텝에서 호출: 목표 변경 시 경로 재계산 */
  update(): void {
    if (!this.pointerDown) return;
    const tgt = this.targetTile;
    if (tgt.x === this.lastTargetTile.x && tgt.y === this.lastTargetTile.y) return;
    this.lastTargetTile = { ...tgt };

    if (!this.map.isWalkable(tgt.x, tgt.y)) return;

    const pos = this.world.store<Position>(C.Position).get(this.player);
    const mv = this.world.store<Movement>(C.Movement).get(this.player);
    if (!pos || !mv) return;

    const start = { x: Math.round(pos.x), y: Math.round(pos.y) };
    const raw = findPath(start, tgt, this.map.walkable);
    if (raw.length === 0) return;
    const smoothed = smoothPath(start, raw, this.map.walkable);
    // 타일 중심 좌표로 변환
    mv.path = smoothed.map((p) => ({ x: p.x, y: p.y }));
    this.lastPath = mv.path;
  }
}
