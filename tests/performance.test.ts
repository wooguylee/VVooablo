/**
 * 성능/부하 헤드리스 테스트.
 * 200 유닛 + 다수 상태이상/공간해시 갱신을 여러 틱 돌려
 * 로직 처리 시간이 예산 내인지(프레임당 여유) 확인한다.
 * (렌더 제외 — 로직 스루풋 프록시)
 */
import { describe, it, expect } from 'vitest';
import { World } from '@/core/ecs';
import { C, type Position, type Movement, type Facing } from '@/entities/components';
import { CC, type Health } from '@/entities/combatComponents';
import { movementSystem } from '@/systems/movementSystem';
import { statusSystem, applyStatus } from '@/systems/status/statusSystem';
import { rebuildSpatialHash } from '@/systems/targetingSystem';
import { SpatialHash } from '@/world/SpatialHash';

const DT = 1 / 60;

function makeUnit(world: World, x: number, y: number) {
  const e = world.createEntity();
  world.store<Position>(C.Position).set(e, { x, y, prevX: x, prevY: y });
  world.store<Movement>(C.Movement).set(e, {
    path: [
      { x: x + 5, y: y + 5 },
      { x: x - 5, y: y - 5 },
    ],
    speed: 3,
    moving: false,
  });
  world.store<Facing>(C.Facing).set(e, { dir: 2, state: 'idle', animTime: 0 });
  world.store<Health>(CC.Health).set(e, { hp: 100, maxHp: 100, invuln: 0, dead: false });
  return e;
}

describe('부하 테스트 (로직 스루풋)', () => {
  it('200 유닛 × 300틱 이동+상태+해시 갱신이 예산 내', () => {
    const world = new World();
    const hash = new SpatialHash(4);
    for (let i = 0; i < 200; i++) {
      const e = makeUnit(world, (i % 20) * 2, Math.floor(i / 20) * 2);
      if (i % 3 === 0) applyStatus(world, e, 'burn', 100, 2);
      if (i % 4 === 0) applyStatus(world, e, 'slow', 100, 0.3);
    }

    const ticks = 300;
    const start = performance.now();
    for (let t = 0; t < ticks; t++) {
      movementSystem(world, DT);
      rebuildSpatialHash(world, hash);
      statusSystem(world, DT, { onBurnTick: () => {} });
    }
    const elapsed = performance.now() - start;
    const perTick = elapsed / ticks;

    // 60Hz 예산은 16.6ms. 로직만은 그 일부여야 함(넉넉히 8ms 이내).
    // CI 변동 고려해 관대하게 설정.
    expect(perTick).toBeLessThan(8);
  });

  it('엔티티 대량 생성/파괴 후에도 무결성 유지', () => {
    const world = new World();
    const created: number[] = [];
    for (let i = 0; i < 1000; i++) created.push(makeUnit(world, i, i));
    for (let i = 0; i < 500; i++) world.destroyEntity(created[i]);
    expect(world.entityCount).toBe(500);
    // 재생성 시 ID 재사용
    const reused = makeUnit(world, 0, 0);
    expect(reused).toBeLessThanOrEqual(1000);
  });
});
