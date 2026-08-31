/**
 * 몬스터 데이터 테이블.
 * Phase 4: 근접형 1종. Phase 6에서 원거리/돌진/소환/엘리트/보스 확장.
 */
import type { CoreStats } from '@/systems/combat/stats';

export type MonsterKind = 'melee' | 'ranged' | 'charger' | 'summoner';

export interface MonsterDef {
  id: string;
  name: string;
  kind: MonsterKind;
  color: number;
  core: CoreStats;
  weaponBase: number;
  aggroRange: number;
  attackRange: number;
  attackInterval: number; // 초
  moveSpeed: number; // 타일/초
  /** 처치 경험치(추후 레벨링에서 사용) */
  xp: number;
}

export const MONSTERS: Record<string, MonsterDef> = {
  grunt: {
    id: 'grunt',
    name: '해골 병사',
    kind: 'melee',
    color: 0xcc5555,
    core: { str: 8, dex: 6, int: 4, vit: 8 },
    weaponBase: 6,
    aggroRange: 7,
    attackRange: 1.2,
    attackInterval: 1.2,
    moveSpeed: 2.6,
    xp: 5,
  },
};
