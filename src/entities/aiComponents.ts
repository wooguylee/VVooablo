/**
 * AI 컴포넌트 (유한 상태 기계) 및 확장 행동 상태.
 * Idle → Patrol → Chase → Attack → Reposition → Death.
 */
import type { MonsterKind } from '@/data/monsters';
import type { EliteAffixId } from '@/data/eliteAffixes';

export type AiState = 'idle' | 'patrol' | 'chase' | 'attack' | 'reposition' | 'death';

export const AC = {
  Ai: 'Ai',
  Elite: 'Elite',
  Boss: 'Boss',
  Shield: 'Shield',
} as const;

export interface Ai {
  state: AiState;
  kind: MonsterKind;
  aggroRange: number;
  attackRange: number;
  repathTimer: number;
  target: number;
  // 원거리/소환용 발사 위치 유지: 사거리보다 가까우면 후퇴(reposition)
  preferredRange: number;
  // 돌진
  chargeCd: number;
  charging: boolean;
  chargeTargetX: number;
  chargeTargetY: number;
  chargeTimer: number;
  // 소환
  summonCd: number;
  summonCount: number;
  // 원거리 공격 쿨다운
  rangedCd: number;
}

export interface Elite {
  affixes: EliteAffixId[];
}

export interface Boss {
  phase: number; // 1 또는 2
  /** 패턴 텔레그래프 타이머 */
  telegraphTimer: number;
  telegraphType: 'none' | 'slam' | 'nova' | 'charge';
  patternCd: number;
}

export interface Shield {
  amount: number;
  max: number;
}
