/**
 * 던전 생성 공통 타입 및 도달성 검증(플러드 필).
 */
import { TileMap, TileType } from '@/world/TileMap';

/** 특수 지점 종류 */
export interface DungeonFeatures {
  entrance: { x: number; y: number };
  exit: { x: number; y: number };
  bossRoom?: { x: number; y: number };
  treasureRoom?: { x: number; y: number };
}

export interface Dungeon {
  map: TileMap;
  features: DungeonFeatures;
  seed: number;
  kind: 'rooms' | 'cave';
}

/**
 * 4방향 플러드 필로 start에서 도달 가능한 바닥 타일 집합 반환.
 */
export function floodFill(map: TileMap, start: { x: number; y: number }): Set<number> {
  const visited = new Set<number>();
  if (!map.isWalkable(start.x, start.y)) return visited;
  const stack: Array<[number, number]> = [[start.x, start.y]];
  const idx = (x: number, y: number) => y * map.cols + x;
  visited.add(idx(start.x, start.y));

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (!map.isWalkable(nx, ny)) continue;
      const id = idx(nx, ny);
      if (visited.has(id)) continue;
      visited.add(id);
      stack.push([nx, ny]);
    }
  }
  return visited;
}

/** entrance에서 exit(및 지정 지점들)까지 도달 가능한지 검증 */
export function verifyReachable(
  map: TileMap,
  from: { x: number; y: number },
  targets: Array<{ x: number; y: number }>,
): boolean {
  const reach = floodFill(map, from);
  return targets.every((t) => reach.has(t.y * map.cols + t.x));
}

/**
 * 도달 불가능한 바닥 섬을 벽으로 메워 단일 연결 영역만 남긴다.
 * (셀룰러 오토마타 결과 정리에 사용)
 */
export function keepLargestRegion(map: TileMap): { x: number; y: number } {
  let best: Set<number> | null = null;
  let bestStart = { x: 0, y: 0 };
  const seen = new Set<number>();

  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      if (!map.isWalkable(x, y)) continue;
      const id = y * map.cols + x;
      if (seen.has(id)) continue;
      const region = floodFill(map, { x, y });
      for (const r of region) seen.add(r);
      if (!best || region.size > best.size) {
        best = region;
        bestStart = { x, y };
      }
    }
  }

  if (best) {
    // best에 속하지 않은 바닥은 벽으로
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        if (map.isWalkable(x, y) && !best.has(y * map.cols + x)) {
          map.set(x, y, TileType.Wall);
        }
      }
    }
  }
  return bestStart;
}
