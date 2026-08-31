/**
 * 특성 트리 데이터 (3분기 × 5노드).
 * 각 노드는 스킬 포인트로 배분하며, 앞 노드를 찍어야 다음이 열린다.
 * 특성 효과는 modifier 형태로 파생 스탯 재계산에 합산된다.
 */
import type { ModKey } from '@/data/itemTypes';

export type TalentBranch = 'warrior' | 'hunter' | 'mystic';

export interface TalentNode {
  id: string;
  branch: TalentBranch;
  tier: number; // 0~4 (선행 조건)
  name: string;
  key: ModKey;
  valuePerRank: number;
  maxRank: number;
}

export const TALENT_BRANCHES: Record<TalentBranch, string> = {
  warrior: '전사',
  hunter: '사냥꾼',
  mystic: '신비가',
};

export const TALENTS: TalentNode[] = [
  // 전사: 힘/생명/방어/피해
  { id: 'w0', branch: 'warrior', tier: 0, name: '강인함', key: 'maxHp', valuePerRank: 20, maxRank: 3 },
  { id: 'w1', branch: 'warrior', tier: 1, name: '힘', key: 'str', valuePerRank: 3, maxRank: 3 },
  { id: 'w2', branch: 'warrior', tier: 2, name: '방벽', key: 'armor', valuePerRank: 8, maxRank: 3 },
  { id: 'w3', branch: 'warrior', tier: 3, name: '분노', key: 'increasedDamage', valuePerRank: 8, maxRank: 3 },
  { id: 'w4', branch: 'warrior', tier: 4, name: '광전사', key: 'increasedDamage', valuePerRank: 15, maxRank: 2 },

  // 사냥꾼: 민첩/치명/공속
  { id: 'h0', branch: 'hunter', tier: 0, name: '민첩', key: 'dex', valuePerRank: 3, maxRank: 3 },
  { id: 'h1', branch: 'hunter', tier: 1, name: '정밀', key: 'critChance', valuePerRank: 3, maxRank: 3 },
  { id: 'h2', branch: 'hunter', tier: 2, name: '신속', key: 'attackSpeed', valuePerRank: 5, maxRank: 3 },
  { id: 'h3', branch: 'hunter', tier: 3, name: '치명', key: 'critDamage', valuePerRank: 15, maxRank: 3 },
  { id: 'h4', branch: 'hunter', tier: 4, name: '사신', key: 'critDamage', valuePerRank: 30, maxRank: 2 },

  // 신비가: 지능/저항/생명
  { id: 'm0', branch: 'mystic', tier: 0, name: '지능', key: 'int', valuePerRank: 3, maxRank: 3 },
  { id: 'm1', branch: 'mystic', tier: 1, name: '보호막', key: 'resistance', valuePerRank: 8, maxRank: 3 },
  { id: 'm2', branch: 'mystic', tier: 2, name: '활력', key: 'maxHp', valuePerRank: 25, maxRank: 3 },
  { id: 'm3', branch: 'mystic', tier: 3, name: '집중', key: 'critChance', valuePerRank: 4, maxRank: 3 },
  { id: 'm4', branch: 'mystic', tier: 4, name: '초월', key: 'increasedDamage', valuePerRank: 12, maxRank: 2 },
];

export function talentById(id: string): TalentNode | undefined {
  return TALENTS.find((t) => t.id === id);
}
