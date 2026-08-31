/**
 * 포션 사용 로직.
 * 체력 포션: 최대 체력의 일정 비율 회복. 쿨다운 관리.
 */
import type { World, Entity } from '@/core/ecs';
import { CC, type Health } from '@/entities/combatComponents';
import type { PlayerProfile } from '@/entities/playerProfile';

export const POTION_HEAL_RATIO = 0.4;
export const POTION_COOLDOWN = 3;

export interface PotionState {
  cooldown: number;
}

export function updatePotionCooldown(state: PotionState, dt: number): void {
  if (state.cooldown > 0) state.cooldown = Math.max(0, state.cooldown - dt);
}

/** 포션 사용 시도. 성공 시 회복량 반환(0=실패). */
export function usePotion(
  world: World,
  player: Entity,
  profile: PlayerProfile,
  state: PotionState,
): number {
  if (state.cooldown > 0) return 0;
  if (profile.potions <= 0) return 0;
  const health = world.store<Health>(CC.Health).get(player);
  if (!health || health.dead) return 0;
  if (health.hp >= health.maxHp) return 0;

  const heal = Math.round(health.maxHp * POTION_HEAL_RATIO);
  const before = health.hp;
  health.hp = Math.min(health.maxHp, health.hp + heal);
  profile.potions -= 1;
  state.cooldown = POTION_COOLDOWN;
  return health.hp - before;
}
