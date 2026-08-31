/**
 * A* 경로탐색 (옥타일 휴리스틱, 8방향 이동) + 경로 스무딩.
 *
 * 격자는 이동 가능(walkable) 여부를 반환하는 콜백으로 추상화한다.
 * 대각선 이동 시 코너 컷팅을 방지한다(양옆이 막히면 대각선 불가).
 */

export interface GridPoint {
  x: number;
  y: number;
}

export type WalkableFn = (x: number, y: number) => boolean;

const SQRT2 = Math.SQRT2;

interface Node {
  x: number;
  y: number;
  g: number;
  f: number;
  parent: Node | null;
}

/** 옥타일 거리 휴리스틱 */
function octile(dx: number, dy: number): number {
  dx = Math.abs(dx);
  dy = Math.abs(dy);
  return dx > dy ? dx - dy + SQRT2 * dy : dy - dx + SQRT2 * dx;
}

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * A* 탐색. 시작/목표는 정수 격자 좌표.
 * 반환: 격자 좌표 경로 (시작 제외, 목표 포함) 또는 빈 배열(실패).
 * maxNodes로 탐색 상한을 둔다.
 */
export function findPath(
  start: GridPoint,
  goal: GridPoint,
  walkable: WalkableFn,
  maxNodes = 4000,
): GridPoint[] {
  if (!walkable(goal.x, goal.y)) return [];
  if (start.x === goal.x && start.y === goal.y) return [];

  const open: Node[] = [];
  const openMap = new Map<string, Node>();
  const closed = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;

  const startNode: Node = {
    x: start.x,
    y: start.y,
    g: 0,
    f: octile(start.x - goal.x, start.y - goal.y),
    parent: null,
  };
  open.push(startNode);
  openMap.set(key(start.x, start.y), startNode);

  let processed = 0;
  while (open.length > 0) {
    if (++processed > maxNodes) return [];

    // 최소 f 노드 선택 (선형 스캔 — 격자 규모상 충분)
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open.splice(bestIdx, 1)[0];
    const ck = key(current.x, current.y);
    openMap.delete(ck);
    closed.add(ck);

    if (current.x === goal.x && current.y === goal.y) {
      return reconstruct(current);
    }

    for (const [dx, dy] of NEIGHBORS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      if (!walkable(nx, ny)) continue;

      // 코너 컷팅 방지
      if (dx !== 0 && dy !== 0) {
        if (!walkable(current.x + dx, current.y) || !walkable(current.x, current.y + dy)) {
          continue;
        }
      }

      const stepCost = dx !== 0 && dy !== 0 ? SQRT2 : 1;
      const g = current.g + stepCost;
      const existing = openMap.get(nk);
      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = g + octile(nx - goal.x, ny - goal.y);
          existing.parent = current;
        }
      } else {
        const node: Node = {
          x: nx,
          y: ny,
          g,
          f: g + octile(nx - goal.x, ny - goal.y),
          parent: current,
        };
        open.push(node);
        openMap.set(nk, node);
      }
    }
  }
  return [];
}

function reconstruct(node: Node): GridPoint[] {
  const path: GridPoint[] = [];
  let cur: Node | null = node;
  while (cur && cur.parent) {
    path.push({ x: cur.x, y: cur.y });
    cur = cur.parent;
  }
  path.reverse();
  return path;
}

/**
 * 경로 스무딩: 시선(line-of-sight)이 통하는 구간을 직선으로 병합.
 * Bresenham으로 두 점 사이 모든 타일이 walkable이면 중간 노드 제거.
 */
export function smoothPath(
  start: GridPoint,
  path: GridPoint[],
  walkable: WalkableFn,
): GridPoint[] {
  if (path.length <= 1) return path;
  const result: GridPoint[] = [];
  let anchor = start;
  let i = 0;
  while (i < path.length) {
    // anchor에서 가능한 한 멀리 시선이 통하는 지점 탐색
    let farthest = i;
    for (let j = i + 1; j < path.length; j++) {
      if (lineOfSight(anchor, path[j], walkable)) {
        farthest = j;
      }
    }
    result.push(path[farthest]);
    anchor = path[farthest];
    i = farthest + 1;
  }
  return result;
}

/** Bresenham 시선 검사 */
export function lineOfSight(a: GridPoint, b: GridPoint, walkable: WalkableFn): boolean {
  let x0 = a.x;
  let y0 = a.y;
  const x1 = b.x;
  const y1 = b.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  for (;;) {
    if (!walkable(x0, y0)) return false;
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    let movedX = false;
    let movedY = false;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
      movedX = true;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
      movedY = true;
    }
    // 대각 이동 시 코너 컷팅 방지
    if (movedX && movedY) {
      if (!walkable(x0 - sx, y0) || !walkable(x0, y0 - sy)) return false;
    }
  }
  return true;
}
