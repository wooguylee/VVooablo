/**
 * 엘리트 접사 데이터.
 * 엘리트 몬스터에 부여되는 특성. Phase 6: 빠름/광폭화/보호막.
 */
export type EliteAffixId = 'swift' | 'berserk' | 'shielded';

export interface EliteAffixDef {
  id: EliteAffixId;
  name: string;
  color: number;
  /** 이동/공속 배수 */
  speedMult?: number;
  /** 체력 낮을 때 광폭화 데미지 배수 */
  berserkDamageMult?: number;
  /** 보호막 = 최대체력 비율 */
  shieldRatio?: number;
}

export const ELITE_AFFIXES: Record<EliteAffixId, EliteAffixDef> = {
  swift: {
    id: 'swift',
    name: '빠름',
    color: 0x66ffff,
    speedMult: 1.6,
  },
  berserk: {
    id: 'berserk',
    name: '광폭화',
    color: 0xff6633,
    berserkDamageMult: 2.2,
  },
  shielded: {
    id: 'shielded',
    name: '보호막',
    color: 0xffdd44,
    shieldRatio: 0.5,
  },
};

export const ELITE_AFFIX_IDS: EliteAffixId[] = ['swift', 'berserk', 'shielded'];
