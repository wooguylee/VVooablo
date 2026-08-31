/**
 * 상태이상 시스템.
 * 지속시간 감소, 화상 도트 피해, 만료 제거.
 * 동일 타입은 지속시간 갱신(재적용 시 더 긴 쪽), 강도는 최대값 유지.
 */
import type { World, Entity } from '@/core/ecs';
import { CC, type Health } from '@/entities/combatComponents';
import {
  STATUS,
  type StatusBag,
  type StatusInstance,
  type StatusType,
} from '@/systems/status/statusTypes';

const BURN_TICK = 0.5;

export interface StatusCallbacks {
  onBurnTick: (entity: Entity, damage: number) => void;
}

/** 상태이상 부여 (스택/갱신 규칙 적용) */
export function applyStatus(
  world: World,
  entity: Entity,
  type: StatusType,
  duration: number,
  magnitude: number,
): void {
  const bag = getBag(world, entity);
  const existing = bag.effects.find((e) => e.type === type);
  if (existing) {
    existing.duration = Math.max(existing.duration, duration);
    existing.magnitude = Math.max(existing.magnitude, magnitude);
  } else {
    bag.effects.push({ type, duration, magnitude, tickAccum: 0 });
  }
}

function getBag(world: World, entity: Entity): StatusBag {
  const store = world.store<StatusBag>(STATUS.Status);
  let bag = store.get(entity);
  if (!bag) {
    bag = { effects: [] };
    store.set(entity, bag);
  }
  return bag;
}

/** 엔티티가 특정 상태인지 */
export function hasStatus(world: World, entity: Entity, type: StatusType): boolean {
  const bag = world.store<StatusBag>(STATUS.Status).get(entity);
  return bag ? bag.effects.some((e) => e.type === type) : false;
}

/** 둔화 이동 배율 (1 - slow) */
export function moveSpeedMultiplier(world: World, entity: Entity): number {
  const bag = world.store<StatusBag>(STATUS.Status).get(entity);
  if (!bag) return 1;
  let mult = 1;
  for (const e of bag.effects) {
    if (e.type === 'slow') mult *= 1 - e.magnitude;
  }
  return Math.max(0.1, mult);
}

/** 받는 피해 증가 배율 (취약) */
export function vulnerabilityMultiplier(world: World, entity: Entity): number {
  const bag = world.store<StatusBag>(STATUS.Status).get(entity);
  if (!bag) return 1;
  let mult = 1;
  for (const e of bag.effects) {
    if (e.type === 'vulnerable') mult += e.magnitude;
  }
  return mult;
}

export function statusSystem(world: World, dt: number, cb: StatusCallbacks): void {
  const statuses = world.store<StatusBag>(STATUS.Status);
  const healths = world.store<Health>(CC.Health);

  for (const [entity, bag] of statuses.entries()) {
    const health = healths.get(entity);
    const dead = !health || health.dead;

    for (let i = bag.effects.length - 1; i >= 0; i--) {
      const eff: StatusInstance = bag.effects[i];
      eff.duration -= dt;

      if (eff.type === 'burn' && health && !dead) {
        eff.tickAccum += dt;
        while (eff.tickAccum >= BURN_TICK) {
          eff.tickAccum -= BURN_TICK;
          const dmg = Math.max(1, Math.round(eff.magnitude * BURN_TICK));
          health.hp -= dmg;
          cb.onBurnTick(entity, dmg);
          if (health.hp <= 0 && !health.dead) {
            health.hp = 0;
            health.dead = true;
          }
        }
      }

      if (eff.duration <= 0) {
        bag.effects.splice(i, 1);
      }
    }
  }
}
