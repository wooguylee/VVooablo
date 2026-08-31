/**
 * 아이템 기본 타입 정의.
 * 등급/슬롯/스탯 modifier 구조. 실제 롤링은 items.ts + affixes.ts에서.
 */

export type ItemRarity = 'common' | 'magic' | 'rare' | 'legendary';

/** 장비 슬롯 */
export type EquipSlot =
  | 'weapon'
  | 'armor'
  | 'helmet'
  | 'gloves'
  | 'boots'
  | 'ring1'
  | 'ring2'
  | 'amulet';

/** 스탯 modifier 키 (파생 스탯 재계산에 합산) */
export type ModKey =
  | 'str'
  | 'dex'
  | 'int'
  | 'vit'
  | 'flatDamage'
  | 'increasedDamage' // %
  | 'critChance' // %
  | 'critDamage' // %
  | 'maxHp'
  | 'armor'
  | 'resistance'
  | 'attackSpeed'; // %

export interface Modifier {
  key: ModKey;
  value: number;
}

/** 아이템 베이스(무기/방어구 종류) */
export interface ItemBase {
  id: string;
  name: string;
  slot: EquipSlot;
  /** 무기 기본 피해 (무기 전용) */
  baseDamage?: number;
  /** 방어구 기본 방어도 */
  baseArmor?: number;
  /** 아이템 레벨 요구치 하한 */
  minItemLevel: number;
  color: number;
}

/** 생성된 아이템 인스턴스 */
export interface ItemInstance {
  uid: number;
  baseId: string;
  name: string;
  rarity: ItemRarity;
  itemLevel: number;
  slot: EquipSlot;
  baseDamage?: number;
  baseArmor?: number;
  mods: Modifier[];
  /** 그리드 인벤토리 크기 (칸) */
  width: number;
  height: number;
  color: number;
}

export const RARITY_COLOR: Record<ItemRarity, number> = {
  common: 0xcccccc,
  magic: 0x6699ff,
  rare: 0xffdd44,
  legendary: 0xff8833,
};

export const RARITY_NAME: Record<ItemRarity, string> = {
  common: '일반',
  magic: '마법',
  rare: '희귀',
  legendary: '전설',
};

/** 등급별 접사 개수 (prefix+suffix 합) */
export const RARITY_AFFIX_COUNT: Record<ItemRarity, number> = {
  common: 0,
  magic: 2,
  rare: 4,
  legendary: 6,
};
