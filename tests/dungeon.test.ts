import { describe, it, expect } from 'vitest';
import { generateRooms } from '@/world/dungeon/rooms';
import { generateCave } from '@/world/dungeon/cave';
import { floorSeed, generateFloor, monsterLevelForDepth } from '@/world/DungeonManager';
import { floodFill, verifyReachable } from '@/world/dungeon/common';

describe('던전 생성 — 방+복도 (BSP)', () => {
  it('시드가 같으면 동일한 맵 (재현성)', () => {
    const a = generateRooms(48, 48, 777);
    const b = generateRooms(48, 48, 777);
    expect(a.map.raw).toEqual(b.map.raw);
    expect(a.features).toEqual(b.features);
  });

  it('입구에서 출구/보스방/보물방 도달 가능', () => {
    for (const seed of [1, 42, 1000, 55555]) {
      const d = generateRooms(48, 48, seed);
      const ok = verifyReachable(d.map, d.features.entrance, [
        d.features.exit,
        d.features.bossRoom!,
        d.features.treasureRoom!,
      ]);
      expect(ok).toBe(true);
    }
  });

  it('입구/출구는 바닥 타일', () => {
    const d = generateRooms(48, 48, 123);
    expect(d.map.isWalkable(d.features.entrance.x, d.features.entrance.y)).toBe(true);
    expect(d.map.isWalkable(d.features.exit.x, d.features.exit.y)).toBe(true);
  });
});

describe('던전 생성 — 셀룰러 오토마타 동굴', () => {
  it('시드가 같으면 동일한 맵', () => {
    const a = generateCave(48, 48, 999);
    const b = generateCave(48, 48, 999);
    expect(a.map.raw).toEqual(b.map.raw);
  });

  it('단일 연결 영역 (입구에서 모든 바닥 도달)', () => {
    const d = generateCave(48, 48, 314);
    const reach = floodFill(d.map, d.features.entrance);
    // 전체 바닥 수 = 도달 가능 바닥 수 (섬 제거됨)
    let floorCount = 0;
    for (let i = 0; i < d.map.raw.length; i++) if (d.map.raw[i] === 0) floorCount++;
    expect(reach.size).toBe(floorCount);
  });

  it('입구/출구 도달 가능', () => {
    const d = generateCave(48, 48, 271);
    expect(verifyReachable(d.map, d.features.entrance, [d.features.exit])).toBe(true);
  });
});

describe('DungeonManager 층 관리', () => {
  it('floorSeed는 결정적이고 depth별로 다르다', () => {
    expect(floorSeed(100, 1)).toBe(floorSeed(100, 1));
    expect(floorSeed(100, 1)).not.toBe(floorSeed(100, 2));
  });

  it('몬스터 레벨은 깊이에 따라 증가', () => {
    expect(monsterLevelForDepth(1)).toBeLessThan(monsterLevelForDepth(5));
  });

  it('홀수 층=방+복도, 짝수 층=동굴', () => {
    expect(generateFloor(5, 1).dungeon.kind).toBe('rooms');
    expect(generateFloor(5, 2).dungeon.kind).toBe('cave');
  });

  it('같은 baseSeed+depth는 동일 층 재현', () => {
    const a = generateFloor(42, 3);
    const b = generateFloor(42, 3);
    expect(a.dungeon.map.raw).toEqual(b.dungeon.map.raw);
  });
});
