/**
 * 던전 생성 파사드 + 층(depth) 관리.
 *
 * 층 깊이에 따라 생성 방식과 몬스터 레벨을 스케일링한다.
 * 시드는 baseSeed + depth 파생으로 층별 재현 가능.
 */
import { generateRooms } from '@/world/dungeon/rooms';
import { generateCave } from '@/world/dungeon/cave';
import type { Dungeon } from '@/world/dungeon/common';

export interface FloorInfo {
  depth: number;
  monsterLevel: number;
  dungeon: Dungeon;
}

/** 층 시드 파생 (baseSeed와 depth 조합) */
export function floorSeed(baseSeed: number, depth: number): number {
  let h = (baseSeed ^ (depth * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return h >>> 0;
}

/** 층별 몬스터 레벨: 깊이에 비례 */
export function monsterLevelForDepth(depth: number): number {
  return 1 + Math.floor(depth * 1.5);
}

/**
 * 층 생성. 홀수 층은 방+복도, 짝수 층은 동굴 (교차 배치).
 */
export function generateFloor(
  baseSeed: number,
  depth: number,
  cols = 64,
  rows = 64,
): FloorInfo {
  const seed = floorSeed(baseSeed, depth);
  const dungeon: Dungeon =
    depth % 2 === 1 ? generateRooms(cols, rows, seed) : generateCave(cols, rows, seed);
  return {
    depth,
    monsterLevel: monsterLevelForDepth(depth),
    dungeon,
  };
}
