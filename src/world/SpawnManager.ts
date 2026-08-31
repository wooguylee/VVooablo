/**
 * 스폰 매니저.
 * 층 생성 시 도달 가능한 바닥 타일에 몬스터를 시드 기반으로 배치한다.
 * 입구/출구 주변은 안전 구역으로 비운다.
 */
import type { Container } from 'pixi.js';
import type { World, Entity } from '@/core/ecs';
import { Rng } from '@/core/Rng';
import { createMonster } from '@/entities/createMonster';
import { MONSTERS } from '@/data/monsters';
import type { Dungeon } from '@/world/dungeon/common';
import { floodFill } from '@/world/dungeon/common';

const SAFE_RADIUS = 5;

export function spawnMonsters(
  world: World,
  layer: Container,
  dungeon: Dungeon,
  monsterLevel: number,
  count: number,
): Entity[] {
  const rng = new Rng((dungeon.seed ^ 0x5a1e5a1e) >>> 0);
  const map = dungeon.map;
  const feats = dungeon.features;

  // 도달 가능한 바닥 타일 후보
  const reach = [...floodFill(map, feats.entrance)];
  const candidates = reach
    .map((id) => ({ x: id % map.cols, y: Math.floor(id / map.cols) }))
    .filter((p) => {
      const dEnt = Math.abs(p.x - feats.entrance.x) + Math.abs(p.y - feats.entrance.y);
      const dExit = Math.abs(p.x - feats.exit.x) + Math.abs(p.y - feats.exit.y);
      return dEnt > SAFE_RADIUS && dExit > 2;
    });

  const spawned: Entity[] = [];
  const def = MONSTERS.grunt;
  for (let i = 0; i < count && candidates.length > 0; i++) {
    const idx = rng.int(0, candidates.length - 1);
    const p = candidates.splice(idx, 1)[0];
    spawned.push(createMonster(world, layer, def, p.x, p.y, monsterLevel));
  }
  return spawned;
}
