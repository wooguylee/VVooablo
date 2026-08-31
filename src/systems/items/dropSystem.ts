/**
 * 드롭(루팅) 시스템.
 * 몬스터 사망 시 아이템 레벨 기반으로 아이템/골드를 롤링한다.
 * 결과는 콜백으로 전달되어 지면 아이템으로 생성된다.
 */
import type { Rng } from '@/core/Rng';
import { generateItem } from '@/systems/items/generateItem';
import type { ItemInstance } from '@/data/itemTypes';

export interface DropResult {
  items: ItemInstance[];
  gold: number;
}

/**
 * 드롭 롤링.
 * @param dropChance 아이템 드롭 확률 (엘리트/보스는 높게)
 * @param bonusRolls 추가 롤 횟수
 */
export function rollDrops(
  rng: Rng,
  itemLevel: number,
  dropChance: number,
  bonusRolls = 0,
): DropResult {
  const items: ItemInstance[] = [];
  const rolls = 1 + bonusRolls;
  for (let i = 0; i < rolls; i++) {
    if (rng.chance(dropChance)) {
      items.push(generateItem(rng, itemLevel));
    }
  }
  // 골드 (아이템 레벨 비례 + 변동)
  const gold = Math.round(itemLevel * rng.range(2, 6) + rng.range(1, 5));
  return { items, gold };
}
