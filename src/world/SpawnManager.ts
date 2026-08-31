/**
 * 스폰 매니저.
 * 도달 가능한 바닥에 몬스터 4종을 시드 기반 배치.
 * 일부는 엘리트로 강화하고, 보스방에 보스를 배치한다.
 */
import type { Container } from 'pixi.js';
import type { World, Entity } from '@/core/ecs';
import { Rng } from '@/core/Rng';
import { createMonster } from '@/entities/createMonster';
import { MONSTERS, type MonsterDef } from '@/data/monsters';
import type { Dungeon } from '@/world/dungeon/common';
import { floodFill } from '@/world/dungeon/common';

const SAFE_RADIUS = 5;
const ELITE_CHANCE = 0.15;
const NORMAL_POOL: string[] = ['grunt', 'grunt', 'archer', 'brute', 'necromancer'];

export interface SpawnResult {
  entities: Entity[];
  boss: Entity | null;
}

export function spawnMonsters(
  world: World,
  layer: Container,
  dungeon: Dungeon,
  monsterLevel: number,
  count: number,
): SpawnResult {
  const rng = new Rng((dungeon.seed ^ 0x5a1e5a1e) >>> 0);
  const map = dungeon.map;
  const feats = dungeon.features;

  const reach = [...floodFill(map, feats.entrance)];
  const candidates = reach
    .map((id) => ({ x: id % map.cols, y: Math.floor(id / map.cols) }))
    .filter((p) => {
      const dEnt = Math.abs(p.x - feats.entrance.x) + Math.abs(p.y - feats.entrance.y);
      const dExit = Math.abs(p.x - feats.exit.x) + Math.abs(p.y - feats.exit.y);
      return dEnt > SAFE_RADIUS && dExit > 3;
    });

  const entities: Entity[] = [];
  for (let i = 0; i < count && candidates.length > 0; i++) {
    const idx = rng.int(0, candidates.length - 1);
    const p = candidates.splice(idx, 1)[0];
    const def: MonsterDef = MONSTERS[rng.pick(NORMAL_POOL)];
    const elite = rng.chance(ELITE_CHANCE);
    entities.push(createMonster(world, layer, def, p.x, p.y, monsterLevel, { elite, rng }));
  }

  // 보스: 보스방에 배치 (5층마다)
  let boss: Entity | null = null;
  if (dungeon.features.bossRoom) {
    const b = dungeon.features.bossRoom;
    if (map.isWalkable(b.x, b.y)) {
      boss = createMonster(world, layer, MONSTERS.overlord, b.x, b.y, monsterLevel + 2, {});
    }
  }

  return { entities, boss };
}
