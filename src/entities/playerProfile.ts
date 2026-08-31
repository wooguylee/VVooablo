/**
 * 플레이어 영속 프로필.
 * 층 전환 시 엔티티는 재생성되지만, 진행 상태(스탯/장비/인벤/골드)는 유지된다.
 * Game이 이 프로필을 보관하고 createPlayer에 주입한다.
 */
import type { CoreStats } from '@/systems/combat/stats';
import { baseStats } from '@/systems/combat/stats';
import type { Equipment, Inventory } from '@/systems/items/equipment';
import type { ItemInstance } from '@/data/itemTypes';

export interface PlayerProfile {
  level: number;
  xp: number;
  baseCore: CoreStats;
  baseWeaponDamage: number;
  equipment: Equipment;
  inventory: Inventory;
  /** 배분 가능한 스탯/스킬 포인트 (Phase 8) */
  statPoints: number;
  skillPoints: number;
}

export function createProfile(): PlayerProfile {
  return {
    level: 1,
    xp: 0,
    baseCore: baseStats(),
    baseWeaponDamage: 12,
    equipment: { slots: {} },
    inventory: { cols: 8, rows: 4, items: new Map(), gold: 0 },
    statPoints: 0,
    skillPoints: 0,
  };
}

/** 인벤토리에 아이템 추가 (빈 자리 자동 배치) */
export function addToInventory(inv: Inventory, item: ItemInstance): boolean {
  if (inv.items.size >= inv.cols * inv.rows) return false;
  inv.items.set(item.uid, { item, x: 0, y: 0 });
  return true;
}
