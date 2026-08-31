/**
 * 공간 해시: 근접 쿼리 가속.
 * 셀 크기 단위로 엔티티를 버킷에 넣고, 반경 내 후보를 빠르게 조회한다.
 */
import type { Entity } from '@/core/ecs';

export class SpatialHash {
  private cellSize: number;
  private buckets: Map<number, Entity[]> = new Map();

  constructor(cellSize = 4) {
    this.cellSize = cellSize;
  }

  private hash(cx: number, cy: number): number {
    // 32비트 좌표 해시 (음수 지원 위해 오프셋)
    return ((cx + 0x8000) & 0xffff) | (((cy + 0x8000) & 0xffff) << 16);
  }

  clear(): void {
    this.buckets.clear();
  }

  insert(entity: Entity, x: number, y: number): void {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const key = this.hash(cx, cy);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = [];
      this.buckets.set(key, bucket);
    }
    bucket.push(entity);
  }

  /** (x,y) 중심 반경 r 내 후보 엔티티 (셀 단위 근사, 정밀 거리 검사는 호출측) */
  query(x: number, y: number, r: number): Entity[] {
    const result: Entity[] = [];
    const minCx = Math.floor((x - r) / this.cellSize);
    const maxCx = Math.floor((x + r) / this.cellSize);
    const minCy = Math.floor((y - r) / this.cellSize);
    const maxCy = Math.floor((y + r) / this.cellSize);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const bucket = this.buckets.get(this.hash(cx, cy));
        if (bucket) result.push(...bucket);
      }
    }
    return result;
  }
}
