import { describe, it, expect } from 'vitest';
import { World } from '@/core/ecs';
import { CC, type Health } from '@/entities/combatComponents';
import { createProfile } from '@/entities/playerProfile';
import { usePotion, updatePotionCooldown } from '@/systems/potionSystem';

function setup(hp: number, maxHp: number) {
  const world = new World();
  const e = world.createEntity();
  world.store<Health>(CC.Health).set(e, { hp, maxHp, invuln: 0, dead: false });
  const profile = createProfile();
  return { world, e, profile, state: { cooldown: 0 } };
}

describe('포션 사용', () => {
  it('체력을 회복하고 포션을 소모', () => {
    const { world, e, profile, state } = setup(50, 100);
    const healed = usePotion(world, e, profile, state);
    expect(healed).toBeGreaterThan(0);
    expect(world.store<Health>(CC.Health).get(e)!.hp).toBeGreaterThan(50);
    expect(profile.potions).toBe(1); // 기본 2 → 1
  });

  it('쿨다운 중에는 사용 불가', () => {
    const { world, e, profile, state } = setup(50, 100);
    usePotion(world, e, profile, state);
    expect(usePotion(world, e, profile, state)).toBe(0); // 쿨다운
  });

  it('쿨다운 경과 후 다시 사용 가능', () => {
    const { world, e, profile, state } = setup(10, 100);
    usePotion(world, e, profile, state);
    updatePotionCooldown(state, 5);
    const healed = usePotion(world, e, profile, state);
    expect(healed).toBeGreaterThan(0);
  });

  it('포션이 없으면 실패', () => {
    const { world, e, profile, state } = setup(50, 100);
    profile.potions = 0;
    expect(usePotion(world, e, profile, state)).toBe(0);
  });

  it('만피면 사용 안 함', () => {
    const { world, e, profile, state } = setup(100, 100);
    expect(usePotion(world, e, profile, state)).toBe(0);
    expect(profile.potions).toBe(2); // 소모 안 됨
  });
});
