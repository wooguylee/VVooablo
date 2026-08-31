/**
 * 타일맵: 격자 기반 지형/이동 가능 여부.
 * Phase 2에서는 단순 맵(테두리 벽 + 일부 장애물)을 시드로 생성.
 * Phase 3에서 절차적 던전 생성이 이 구조를 채운다.
 */
import { Rng } from '@/core/Rng';

export const enum TileType {
  Floor = 0,
  Wall = 1,
}

export class TileMap {
  readonly cols: number;
  readonly rows: number;
  private tiles: Uint8Array;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.tiles = new Uint8Array(cols * rows);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  get(x: number, y: number): TileType {
    if (!this.inBounds(x, y)) return TileType.Wall;
    return this.tiles[y * this.cols + x] as TileType;
  }

  set(x: number, y: number, type: TileType): void {
    if (this.inBounds(x, y)) this.tiles[y * this.cols + x] = type;
  }

  isWalkable(x: number, y: number): boolean {
    return this.get(x, y) === TileType.Floor;
  }

  /** 이동 가능 여부 콜백 (경로탐색용). */
  walkable = (x: number, y: number): boolean => this.isWalkable(x, y);

  get raw(): Uint8Array {
    return this.tiles;
  }

  /**
   * Phase 2 데모용 맵 생성: 테두리 벽 + 시드 기반 무작위 장애물 기둥.
   * 도달성은 Phase 3의 플러드 필 검증에서 다룬다(여기선 성긴 장애물이라 안전).
   */
  static demo(cols: number, rows: number, seed: number): TileMap {
    const map = new TileMap(cols, rows);
    const rng = new Rng(seed ^ 0x9e3779b9);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const border = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
        map.set(x, y, border ? TileType.Wall : TileType.Floor);
      }
    }
    // 무작위 장애물 (5%), 단 맵 중앙(스폰 지점) 주변은 비움
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    for (let y = 2; y < rows - 2; y++) {
      for (let x = 2; x < cols - 2; x++) {
        if (Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2) continue;
        if (rng.chance(0.05)) map.set(x, y, TileType.Wall);
      }
    }
    return map;
  }
}
