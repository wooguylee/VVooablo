/**
 * 접사 테이블 (prefix/suffix).
 * 각 접사는 아이템 레벨 요구치와 값 범위(tier)를 가진다.
 * 롤링은 itemLevel 이하 tier 중에서 선택하고, 값은 시드 RNG로 결정한다.
 */
import type { ModKey } from '@/data/itemTypes';

export type AffixKind = 'prefix' | 'suffix';

export interface AffixTier {
  minItemLevel: number;
  min: number;
  max: number;
}

export interface AffixDef {
  id: string;
  kind: AffixKind;
  key: ModKey;
  name: string; // 표기 (예: "날카로운")
  tiers: AffixTier[];
  /** 적용 가능한 슬롯 (미지정 시 전체) */
  slots?: string[];
}

export const AFFIXES: AffixDef[] = [
  // ---- prefix (주로 공격/방어 수치) ----
  {
    id: 'sharp',
    kind: 'prefix',
    key: 'flatDamage',
    name: '날카로운',
    slots: ['weapon'],
    tiers: [
      { minItemLevel: 1, min: 2, max: 5 },
      { minItemLevel: 5, min: 5, max: 10 },
      { minItemLevel: 10, min: 10, max: 18 },
    ],
  },
  {
    id: 'brutal',
    kind: 'prefix',
    key: 'increasedDamage',
    name: '잔혹한',
    slots: ['weapon', 'gloves', 'ring1', 'ring2', 'amulet'],
    tiers: [
      { minItemLevel: 1, min: 5, max: 12 },
      { minItemLevel: 6, min: 12, max: 25 },
      { minItemLevel: 12, min: 25, max: 40 },
    ],
  },
  {
    id: 'sturdy',
    kind: 'prefix',
    key: 'armor',
    name: '견고한',
    slots: ['armor', 'helmet', 'gloves', 'boots'],
    tiers: [
      { minItemLevel: 1, min: 3, max: 8 },
      { minItemLevel: 5, min: 8, max: 16 },
      { minItemLevel: 10, min: 16, max: 30 },
    ],
  },
  {
    id: 'vigorous',
    kind: 'prefix',
    key: 'maxHp',
    name: '활력의',
    tiers: [
      { minItemLevel: 1, min: 10, max: 25 },
      { minItemLevel: 6, min: 25, max: 50 },
      { minItemLevel: 12, min: 50, max: 90 },
    ],
  },
  // ---- suffix (주로 스탯/치명/속성) ----
  {
    id: 'ofStrength',
    kind: 'suffix',
    key: 'str',
    name: '힘의',
    tiers: [
      { minItemLevel: 1, min: 2, max: 5 },
      { minItemLevel: 6, min: 5, max: 10 },
      { minItemLevel: 12, min: 10, max: 18 },
    ],
  },
  {
    id: 'ofDexterity',
    kind: 'suffix',
    key: 'dex',
    name: '민첩의',
    tiers: [
      { minItemLevel: 1, min: 2, max: 5 },
      { minItemLevel: 6, min: 5, max: 10 },
      { minItemLevel: 12, min: 10, max: 18 },
    ],
  },
  {
    id: 'ofIntellect',
    kind: 'suffix',
    key: 'int',
    name: '지능의',
    tiers: [
      { minItemLevel: 1, min: 2, max: 5 },
      { minItemLevel: 6, min: 5, max: 10 },
      { minItemLevel: 12, min: 10, max: 18 },
    ],
  },
  {
    id: 'ofPrecision',
    kind: 'suffix',
    key: 'critChance',
    name: '정밀의',
    slots: ['weapon', 'gloves', 'ring1', 'ring2', 'amulet'],
    tiers: [
      { minItemLevel: 3, min: 2, max: 5 },
      { minItemLevel: 10, min: 5, max: 9 },
    ],
  },
  {
    id: 'ofDevastation',
    kind: 'suffix',
    key: 'critDamage',
    name: '파괴의',
    slots: ['weapon', 'amulet'],
    tiers: [
      { minItemLevel: 5, min: 10, max: 20 },
      { minItemLevel: 12, min: 20, max: 40 },
    ],
  },
  {
    id: 'ofWarding',
    kind: 'suffix',
    key: 'resistance',
    name: '보호의',
    tiers: [
      { minItemLevel: 1, min: 5, max: 12 },
      { minItemLevel: 8, min: 12, max: 25 },
    ],
  },
  {
    id: 'ofHaste',
    kind: 'suffix',
    key: 'attackSpeed',
    name: '신속의',
    slots: ['weapon', 'gloves', 'boots'],
    tiers: [
      { minItemLevel: 4, min: 3, max: 7 },
      { minItemLevel: 12, min: 7, max: 14 },
    ],
  },
];
