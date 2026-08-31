/**
 * 셀룰러 오토마타 동굴 생성.
 *
 * 초기 무작위 벽 밀도 → 이웃 규칙 반복 → 유기적 동굴.
 * 최대 연결 영역만 남기고, 입구/출구/보스방/보물방을 그 영역 내에 배치한다.
 */
import { Rng } from '@/core/Rng';
import { TileMap, TileType } from '@/world/TileMap';
import { type Dungeon, floodFill, keepLargestRegion } from '@/world/dungeon/common';

const INITIAL_WALL_PROB = 0.45;
const STEPS = 5;

export function generateCave(cols: number, rows: number, seed: number): Dungeon {
  const rng = new Rng((seed ^ 0xca7e0000) >>> 0);
  let map = new TileMap(cols, rows);

  // 초기 무작위 채움 (테두리는 벽)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const border = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
      const wall = border || rng.chance(INITIAL_WALL_PROB);
      map.set(x, y, wall ? TileType.Wall : TileType.Floor);
    }
  }

  // 오토마타 반복
  for (let step = 0; step < STEPS; step++) {
    map = smooth(map);
  }

  // 최대 영역만 남김
  const start = keepLargestRegion(map);

  // 특수 지점 배치
  const region = [...floodFill(map, start)].map((id) => ({
    x: id % cols,
    y: Math.floor(id / cols),
  }));
  const features = assignFeatures(region, start);

  return { map, features, seed, kind: 'cave' };
}

function countWallNeighbors(map: TileMap, x: number, y: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (map.get(x + dx, y + dy) === TileType.Wall) count++;
    }
  }
  return count;
}

function smooth(map: TileMap): TileMap {
  const next = new TileMap(map.cols, map.rows);
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      const border = x === 0 || y === 0 || x === map.cols - 1 || y === map.rows - 1;
      if (border) {
        next.set(x, y, TileType.Wall);
        continue;
      }
      const walls = countWallNeighbors(map, x, y);
      // 4-5 규칙: 벽 이웃 4개 이상이면 벽, 아니면 바닥
      next.set(x, y, walls >= 5 ? TileType.Wall : TileType.Floor);
    }
  }
  return next;
}

function assignFeatures(region: Array<{ x: number; y: number }>, start: { x: number; y: number }) {
  const entrance = start;
  // 출구: entrance에서 맨해튼 거리 최대인 타일
  let exit = start;
  let maxDist = -1;
  for (const p of region) {
    const d = Math.abs(p.x - entrance.x) + Math.abs(p.y - entrance.y);
    if (d > maxDist) {
      maxDist = d;
      exit = p;
    }
  }
  // 보스방: 출구, 보물방: 중간 지점
  const mid = region[Math.floor(region.length / 2)] ?? entrance;
  return { entrance, exit, bossRoom: exit, treasureRoom: mid };
}
