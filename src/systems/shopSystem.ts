/**
 * 상점 시스템.
 * 방문마다 재고를 시드 기반으로 생성하고, 매매 가격을 계산한다.
 */
import type { Rng } from '@/core/Rng';
import { generateItem } from '@/systems/items/generateItem';
import type { ItemInstance } from '@/data/itemTypes';
import type { PlayerProfile } from '@/entities/playerProfile';
import { addToInventory } from '@/entities/playerProfile';

/** 아이템 판매/구매 기준가 (등급/아이템레벨 기반) */
export function itemPrice(item: ItemInstance): number {
  const rarityMult: Record<string, number> = {
    common: 1,
    magic: 3,
    rare: 8,
    legendary: 20,
  };
  return Math.round((10 + item.itemLevel * 5) * (rarityMult[item.rarity] ?? 1));
}

export function buyPrice(item: ItemInstance): number {
  return itemPrice(item);
}
export function sellPrice(item: ItemInstance): number {
  return Math.max(1, Math.floor(itemPrice(item) * 0.35));
}

/** 상점 재고 생성 */
export function generateShopStock(rng: Rng, itemLevel: number, count = 8): ItemInstance[] {
  const stock: ItemInstance[] = [];
  for (let i = 0; i < count; i++) {
    stock.push(generateItem(rng, itemLevel));
  }
  return stock;
}

/** 구매: 골드 차감 + 인벤토리 추가. 성공 여부 반환. */
export function buyItem(profile: PlayerProfile, item: ItemInstance): boolean {
  const price = buyPrice(item);
  if (profile.inventory.gold < price) return false;
  if (profile.inventory.items.size >= profile.inventory.cols * profile.inventory.rows) return false;
  profile.inventory.gold -= price;
  addToInventory(profile.inventory, item);
  return true;
}

/** 판매: 인벤토리 제거 + 골드 획득. */
export function sellItem(profile: PlayerProfile, uid: number): boolean {
  const entry = profile.inventory.items.get(uid);
  if (!entry) return false;
  profile.inventory.gold += sellPrice(entry.item);
  profile.inventory.items.delete(uid);
  return true;
}

/** 포션 구매 (고정가) */
export const POTION_PRICE = 25;
export function buyPotion(profile: PlayerProfile): boolean {
  if (profile.inventory.gold < POTION_PRICE) return false;
  profile.inventory.gold -= POTION_PRICE;
  profile.potions += 1;
  return true;
}
