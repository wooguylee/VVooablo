import { describe, it, expect } from 'vitest';
import { World } from '@/core/ecs';
import { CC, type Health } from '@/entities/combatComponents';
import { AC, type Shield } from '@/entities/aiComponents';
import { applyDamageToEntity } from '@/systems/combat/applyDamage';

function makeEntity(world: World, hp: number, shield?: number) {
  const e = world.createEntity();
  world.store<Health>(CC.Health).set(e, { hp, maxHp: hp, invuln: 0, dead: false });
  if (shield !== undefined) {
    world.store<Shield>(AC.Shield).set(e, { amount: shield, max: shield });
  }
  return e;
}

describe('보호막 피해 흡수', () => {
  it('보호막이 먼저 소모된다', () => {
    const w = new World();
    const e = makeEntity(w, 100, 50);
    applyDamageToEntity(w, e, 30);
    expect(w.store<Shield>(AC.Shield).get(e)!.amount).toBe(20);
    expect(w.store<Health>(CC.Health).get(e)!.hp).toBe(100); // 체력 온전
  });

  it('보호막 초과분은 체력에 적용', () => {
    const w = new World();
    const e = makeEntity(w, 100, 20);
    applyDamageToEntity(w, e, 50);
    expect(w.store<Shield>(AC.Shield).get(e)!.amount).toBe(0);
    expect(w.store<Health>(CC.Health).get(e)!.hp).toBe(70); // 100 - (50-20)
  });

  it('보호막 없으면 체력 직접 감소', () => {
    const w = new World();
    const e = makeEntity(w, 100);
    applyDamageToEntity(w, e, 40);
    expect(w.store<Health>(CC.Health).get(e)!.hp).toBe(60);
  });

  it('사망한 대상은 피해 무시', () => {
    const w = new World();
    const e = makeEntity(w, 100);
    w.store<Health>(CC.Health).get(e)!.dead = true;
    applyDamageToEntity(w, e, 40);
    expect(w.store<Health>(CC.Health).get(e)!.hp).toBe(100);
  });
});
