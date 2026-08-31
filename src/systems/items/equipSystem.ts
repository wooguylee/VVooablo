/**
 * 장착/해제 로직.
 * 프로필의 인벤토리/장비를 갱신하고, 라이브 엔티티의 Stats/Health를 재계산 반영한다.
 */
import type { World, Entity } from '@/core/ecs';
import { CC, type Stats, type Health } from '@/entities/combatComponents';
import type { PlayerProfile } from '@/entities/playerProfile';
import type { EquipSlot } from '@/data/itemTypes';
import { recalcStats } from '@/systems/items/equipment';

/** 아이템을 장착 (같은 슬롯 아이템은 인벤토리로 반환). ring은 빈 슬롯 우선. */
export function equipItem(profile: PlayerProfile, uid: number): boolean {
  const entry = profile.inventory.items.get(uid);
  if (!entry) return false;
  const item = entry.item;

  let slot: EquipSlot = item.slot;
  // 반지는 ring1/ring2 중 빈 곳
  if (item.slot === 'ring1' || item.slot === 'ring2') {
    slot = !profile.equipment.slots.ring1 ? 'ring1' : 'ring2';
  }

  // 기존 장비를 인벤토리로
  const prev = profile.equipment.slots[slot];
  profile.inventory.items.delete(uid);
  if (prev) {
    profile.inventory.items.set(prev.uid, { item: prev, x: 0, y: 0 });
  }
  profile.equipment.slots[slot] = item;
  return true;
}

/** 장비 해제 → 인벤토리로 */
export function unequipItem(profile: PlayerProfile, slot: EquipSlot): boolean {
  const item = profile.equipment.slots[slot];
  if (!item) return false;
  if (profile.inventory.items.size >= profile.inventory.cols * profile.inventory.rows) {
    return false; // 인벤토리 가득
  }
  delete profile.equipment.slots[slot];
  profile.inventory.items.set(item.uid, { item, x: 0, y: 0 });
  return true;
}

/** 라이브 엔티티에 재계산 스탯 반영 (최대체력 변화 시 현재 체력 비율 유지) */
export function applyProfileStats(world: World, entity: Entity, profile: PlayerProfile): void {
  const stats = world.store<Stats>(CC.Stats).get(entity);
  const health = world.store<Health>(CC.Health).get(entity);
  if (!stats || !health) return;

  const recalc = recalcStats(
    profile.baseCore,
    profile.equipment,
    profile.level,
    profile.baseWeaponDamage,
  );
  const ratio = health.maxHp > 0 ? health.hp / health.maxHp : 1;
  stats.core = recalc.core;
  stats.derived = recalc.derived;
  stats.level = profile.level;
  stats.weaponBase = recalc.weaponBase;
  health.maxHp = recalc.derived.maxHp;
  health.hp = Math.min(health.maxHp, health.maxHp * ratio);
}
