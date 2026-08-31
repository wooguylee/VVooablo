/**
 * 장비 + 인벤토리 컴포넌트 및 스탯 재계산 파이프라인.
 *
 * 장비 슬롯의 아이템 modifier를 합산해 코어 스탯/파생 스탯을 재계산한다.
 * 무기 baseDamage는 weaponBase로 반영된다.
 */
import type { ItemInstance, EquipSlot, ModKey } from '@/data/itemTypes';
import type { CoreStats, DerivedStats } from '@/systems/combat/stats';
import { computeDerived } from '@/systems/combat/stats';

export const IC = {
  Equipment: 'Equipment',
  Inventory: 'Inventory',
} as const;

export type EquipMap = Partial<Record<EquipSlot, ItemInstance>>;

export interface Equipment {
  slots: EquipMap;
}

export interface Inventory {
  /** 그리드 크기 */
  cols: number;
  rows: number;
  /** 배치된 아이템: uid → {item, x, y} */
  items: Map<number, { item: ItemInstance; x: number; y: number }>;
  gold: number;
}

/** modifier 합산 결과 */
export interface ModTotals {
  str: number;
  dex: number;
  int: number;
  vit: number;
  flatDamage: number;
  increasedDamage: number;
  critChance: number;
  critDamage: number;
  maxHp: number;
  armor: number;
  resistance: number;
  attackSpeed: number;
}

export function emptyTotals(): ModTotals {
  return {
    str: 0,
    dex: 0,
    int: 0,
    vit: 0,
    flatDamage: 0,
    increasedDamage: 0,
    critChance: 0,
    critDamage: 0,
    maxHp: 0,
    armor: 0,
    resistance: 0,
    attackSpeed: 0,
  };
}

/** 장비의 모든 modifier + 기본 방어/무기 피해 합산 */
export function sumEquipment(equip: Equipment): {
  totals: ModTotals;
  weaponBase: number;
  baseArmor: number;
} {
  const totals = emptyTotals();
  let weaponBase = 0;
  let baseArmor = 0;

  for (const item of Object.values(equip.slots)) {
    if (!item) continue;
    if (item.baseDamage) weaponBase += item.baseDamage;
    if (item.baseArmor) baseArmor += item.baseArmor;
    for (const mod of item.mods) {
      totals[mod.key as ModKey] += mod.value;
    }
  }
  return { totals, weaponBase, baseArmor };
}

export interface RecalcResult {
  core: CoreStats;
  derived: DerivedStats;
  weaponBase: number;
}

/**
 * 최종 스탯 재계산.
 * baseCore(레벨업/특성으로 얻은 코어) + 장비 스탯 → 파생 스탯.
 */
export function recalcStats(
  baseCore: CoreStats,
  equip: Equipment,
  level: number,
  baseWeaponDamage: number,
): RecalcResult {
  const { totals, weaponBase, baseArmor } = sumEquipment(equip);

  const core: CoreStats = {
    str: baseCore.str + totals.str,
    dex: baseCore.dex + totals.dex,
    int: baseCore.int + totals.int,
    vit: baseCore.vit + totals.vit,
  };

  const derived = computeDerived(core, level);
  // 장비 modifier 반영
  derived.maxHp += totals.maxHp;
  derived.armor += baseArmor + totals.armor;
  derived.resistance += totals.resistance;
  derived.attackPower += totals.flatDamage;
  derived.critChance = Math.min(0.9, derived.critChance + totals.critChance / 100);
  derived.critDamage += totals.critDamage / 100;
  derived.attackSpeed *= 1 + totals.attackSpeed / 100;

  // 최종 무기 피해 = 무기 기본 + 평타 가산 + 증가피해%
  const finalWeaponBase =
    (baseWeaponDamage + weaponBase + totals.flatDamage) * (1 + totals.increasedDamage / 100);

  return { core, derived, weaponBase: Math.round(finalWeaponBase) };
}
