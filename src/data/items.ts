/**
 * 아이템 베이스 테이블 (슬롯별 종류).
 */
import type { ItemBase } from '@/data/itemTypes';

export const ITEM_BASES: Record<string, ItemBase> = {
  shortSword: {
    id: 'shortSword',
    name: '숏소드',
    slot: 'weapon',
    baseDamage: 12,
    minItemLevel: 1,
    color: 0xcccccc,
  },
  battleAxe: {
    id: 'battleAxe',
    name: '배틀액스',
    slot: 'weapon',
    baseDamage: 20,
    minItemLevel: 5,
    color: 0xddaa88,
  },
  leatherArmor: {
    id: 'leatherArmor',
    name: '가죽 갑옷',
    slot: 'armor',
    baseArmor: 8,
    minItemLevel: 1,
    color: 0xaa8855,
  },
  plateArmor: {
    id: 'plateArmor',
    name: '판금 갑옷',
    slot: 'armor',
    baseArmor: 18,
    minItemLevel: 6,
    color: 0xaaaacc,
  },
  ironHelm: {
    id: 'ironHelm',
    name: '철 투구',
    slot: 'helmet',
    baseArmor: 5,
    minItemLevel: 1,
    color: 0xbbbbcc,
  },
  gloves: {
    id: 'gloves',
    name: '가죽 장갑',
    slot: 'gloves',
    baseArmor: 3,
    minItemLevel: 1,
    color: 0xaa8855,
  },
  boots: {
    id: 'boots',
    name: '가죽 신발',
    slot: 'boots',
    baseArmor: 3,
    minItemLevel: 1,
    color: 0xaa8855,
  },
  ring: {
    id: 'ring',
    name: '반지',
    slot: 'ring1',
    minItemLevel: 1,
    color: 0xffdd88,
  },
  amulet: {
    id: 'amulet',
    name: '목걸이',
    slot: 'amulet',
    minItemLevel: 1,
    color: 0xffcc66,
  },
};

/** 슬롯별 인벤토리 그리드 크기 */
export const SLOT_GRID_SIZE: Record<string, { w: number; h: number }> = {
  weapon: { w: 1, h: 3 },
  armor: { w: 2, h: 3 },
  helmet: { w: 2, h: 2 },
  gloves: { w: 2, h: 2 },
  boots: { w: 2, h: 2 },
  ring1: { w: 1, h: 1 },
  ring2: { w: 1, h: 1 },
  amulet: { w: 1, h: 1 },
};

export const ALL_BASE_IDS = Object.keys(ITEM_BASES);
