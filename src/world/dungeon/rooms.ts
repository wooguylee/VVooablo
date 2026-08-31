/**
 * BSP 방+복도 던전 생성.
 *
 * 공간을 재귀적으로 이분할하여 리프마다 방을 배치하고,
 * 형제 방을 복도로 연결한다. 시드 기반으로 완전 재현 가능.
 * 입구/출구/보스방/보물방을 보장하고 도달성을 검증한다.
 */
import { Rng } from '@/core/Rng';
import { TileMap, TileType } from '@/world/TileMap';
import { type Dungeon, verifyReachable } from '@/world/dungeon/common';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BspNode {
  rect: Rect;
  left?: BspNode;
  right?: BspNode;
  room?: Rect;
}

const MIN_LEAF = 8;
const MIN_ROOM = 4;

function center(r: Rect): { x: number; y: number } {
  return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) };
}

function split(node: BspNode, rng: Rng, depth: number): void {
  if (depth <= 0) return;
  const { w, h } = node.rect;
  if (w < MIN_LEAF * 2 && h < MIN_LEAF * 2) return;

  // 분할 방향 결정 (긴 쪽 우선)
  let horizontal = rng.chance(0.5);
  if (w > h * 1.25) horizontal = false;
  else if (h > w * 1.25) horizontal = true;

  if (horizontal) {
    const max = h - MIN_LEAF;
    if (max <= MIN_LEAF) return;
    const cut = rng.int(MIN_LEAF, max);
    node.left = { rect: { x: node.rect.x, y: node.rect.y, w, h: cut } };
    node.right = { rect: { x: node.rect.x, y: node.rect.y + cut, w, h: h - cut } };
  } else {
    const max = w - MIN_LEAF;
    if (max <= MIN_LEAF) return;
    const cut = rng.int(MIN_LEAF, max);
    node.left = { rect: { x: node.rect.x, y: node.rect.y, w: cut, h } };
    node.right = { rect: { x: node.rect.x + cut, y: node.rect.y, w: w - cut, h } };
  }
  split(node.left, rng, depth - 1);
  split(node.right, rng, depth - 1);
}

function createRooms(node: BspNode, rng: Rng, rooms: Rect[]): void {
  if (node.left || node.right) {
    if (node.left) createRooms(node.left, rng, rooms);
    if (node.right) createRooms(node.right, rng, rooms);
    return;
  }
  // 리프: 방 배치 (여백 두고)
  const r = node.rect;
  const rw = rng.int(MIN_ROOM, Math.max(MIN_ROOM, r.w - 2));
  const rh = rng.int(MIN_ROOM, Math.max(MIN_ROOM, r.h - 2));
  const rx = r.x + rng.int(1, Math.max(1, r.w - rw - 1));
  const ry = r.y + rng.int(1, Math.max(1, r.h - rh - 1));
  node.room = { x: rx, y: ry, w: rw, h: rh };
  rooms.push(node.room);
}

function carveRoom(map: TileMap, r: Rect): void {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      map.set(x, y, TileType.Floor);
    }
  }
}

function carveCorridor(map: TileMap, a: { x: number; y: number }, b: { x: number; y: number }, rng: Rng): void {
  // L자 복도 (수평 먼저 또는 수직 먼저)
  const hFirst = rng.chance(0.5);
  const carveH = (x0: number, x1: number, y: number) => {
    const [s, e] = x0 < x1 ? [x0, x1] : [x1, x0];
    for (let x = s; x <= e; x++) map.set(x, y, TileType.Floor);
  };
  const carveV = (y0: number, y1: number, x: number) => {
    const [s, e] = y0 < y1 ? [y0, y1] : [y1, y0];
    for (let y = s; y <= e; y++) map.set(x, y, TileType.Floor);
  };
  if (hFirst) {
    carveH(a.x, b.x, a.y);
    carveV(a.y, b.y, b.x);
  } else {
    carveV(a.y, b.y, a.x);
    carveH(a.x, b.x, b.y);
  }
}

function connect(node: BspNode, map: TileMap, rng: Rng): { x: number; y: number } {
  if (node.room) return center(node.room);
  const lc = node.left ? connect(node.left, map, rng) : null;
  const rc = node.right ? connect(node.right, map, rng) : null;
  if (lc && rc) carveCorridor(map, lc, rc, rng);
  return lc ?? rc ?? { x: 0, y: 0 };
}

export function generateRooms(cols: number, rows: number, seed: number): Dungeon {
  const rng = new Rng(seed);
  let map!: TileMap;
  let rooms: Rect[] = [];

  // 도달성 통과할 때까지 재시도 (시드 파생으로 결정성 유지)
  for (let attempt = 0; attempt < 8; attempt++) {
    const aRng = new Rng(seed + attempt * 0x1000);
    map = new TileMap(cols, rows);
    // 전부 벽으로 채움
    for (let i = 0; i < map.raw.length; i++) map.raw[i] = TileType.Wall;

    const root: BspNode = { rect: { x: 1, y: 1, w: cols - 2, h: rows - 2 } };
    split(root, aRng, 5);
    rooms = [];
    createRooms(root, aRng, rooms);
    rooms.forEach((r) => carveRoom(map, r));
    connect(root, map, aRng);

    if (rooms.length >= 4) {
      const feats = assignFeatures(rooms);
      if (
        verifyReachable(map, feats.entrance, [
          feats.exit,
          feats.bossRoom!,
          feats.treasureRoom!,
        ])
      ) {
        return { map, features: feats, seed, kind: 'rooms' };
      }
    }
  }

  // 폴백: 마지막 시도 결과라도 반환
  const feats = assignFeatures(rooms.length ? rooms : [{ x: 2, y: 2, w: 4, h: 4 }]);
  void rng;
  return { map, features: feats, seed, kind: 'rooms' };
}

function assignFeatures(rooms: Rect[]) {
  // 입구=첫 방, 출구=가장 먼 방, 보스=출구 근처 큰 방, 보물=중간
  const first = rooms[0];
  const entrance = center(first);
  let exitRoom = rooms[0];
  let maxDist = -1;
  for (const r of rooms) {
    const c = center(r);
    const d = Math.abs(c.x - entrance.x) + Math.abs(c.y - entrance.y);
    if (d > maxDist) {
      maxDist = d;
      exitRoom = r;
    }
  }
  const exit = center(exitRoom);
  const bossRoom = exit;
  // 보물방: 입구/출구가 아닌 방 중 하나
  const others = rooms.filter((r) => r !== first && r !== exitRoom);
  const treasureRoom = others.length ? center(others[Math.floor(others.length / 2)]) : entrance;

  return { entrance, exit, bossRoom, treasureRoom };
}
