import { describe, it, expect } from 'vitest';
import { World } from '@/core/ecs';
import { CC, type Health } from '@/entities/combatComponents';
import {
  applyStatus,
  hasStatus,
  moveSpeedMultiplier,
  vulnerabilityMultiplier,
  statusSystem,
} from '@/systems/status/statusSystem';

function makeEntity(world: World, hp = 100) {
  const e = world.createEntity();
  world.store<Health>(CC.Health).set(e, { hp, maxHp: hp, invuln: 0, dead: false });
  return e;
}

describe('상태이상 시스템', () => {
  it('부여 후 hasStatus true', () => {
    const w = new World();
    const e = makeEntity(w);
    applyStatus(w, e, 'stun', 1, 1);
    expect(hasStatus(w, e, 'stun')).toBe(true);
  });

  it('지속시간 만료 시 제거', () => {
    const w = new World();
    const e = makeEntity(w);
    applyStatus(w, e, 'slow', 0.5, 0.3);
    statusSystem(w, 0.6, { onBurnTick: () => {} });
    expect(hasStatus(w, e, 'slow')).toBe(false);
  });

  it('둔화는 이동 배율을 감소', () => {
    const w = new World();
    const e = makeEntity(w);
    applyStatus(w, e, 'slow', 5, 0.5);
    expect(moveSpeedMultiplier(w, e)).toBeCloseTo(0.5, 5);
  });

  it('취약은 받는 피해 배율 증가', () => {
    const w = new World();
    const e = makeEntity(w);
    applyStatus(w, e, 'vulnerable', 5, 0.25);
    expect(vulnerabilityMultiplier(w, e)).toBeCloseTo(1.25, 5);
  });

  it('화상은 도트 피해를 입힌다', () => {
    const w = new World();
    const e = makeEntity(w, 100);
    applyStatus(w, e, 'burn', 3, 10); // 초당 10
    let total = 0;
    statusSystem(w, 1.0, { onBurnTick: (_e, dmg) => (total += dmg) });
    expect(total).toBeGreaterThan(0);
    const h = w.store<Health>(CC.Health).get(e)!;
    expect(h.hp).toBeLessThan(100);
  });

  it('동일 타입 재적용 시 지속시간은 더 긴 쪽, 강도는 최대', () => {
    const w = new World();
    const e = makeEntity(w);
    applyStatus(w, e, 'slow', 2, 0.3);
    applyStatus(w, e, 'slow', 5, 0.2);
    // 강도 최대 유지 → 0.3
    expect(moveSpeedMultiplier(w, e)).toBeCloseTo(0.7, 5);
  });
});
