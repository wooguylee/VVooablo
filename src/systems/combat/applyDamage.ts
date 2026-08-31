/**
 * 피해 적용 헬퍼.
 * 보호막(Shield)을 먼저 소모한 뒤 체력을 감소시킨다.
 * 취약(vulnerable) 배율은 호출측에서 이미 적용된 amount를 받는다.
 * 반환: 실제 체력에 적용된 여부(사망 판정용).
 */
import type { World, Entity } from '@/core/ecs';
import { CC, type Health } from '@/entities/combatComponents';
import { AC, type Shield } from '@/entities/aiComponents';

export function applyDamageToEntity(world: World, entity: Entity, amount: number): void {
  const health = world.store<Health>(CC.Health).get(entity);
  if (!health || health.dead) return;

  let remaining = amount;
  const shield = world.store<Shield>(AC.Shield).get(entity);
  if (shield && shield.amount > 0) {
    const absorbed = Math.min(shield.amount, remaining);
    shield.amount -= absorbed;
    remaining -= absorbed;
  }
  if (remaining > 0) {
    health.hp -= remaining;
  }
}
