/**
 * AI 컴포넌트 (유한 상태 기계).
 * Phase 4: Idle → Chase → Attack. Phase 6에서 Patrol/Reposition/원거리/보스 확장.
 */
export type AiState = 'idle' | 'patrol' | 'chase' | 'attack' | 'reposition' | 'death';

export const AC = {
  Ai: 'Ai',
} as const;

export interface Ai {
  state: AiState;
  /** 감지 반경(타일) */
  aggroRange: number;
  /** 공격 사거리(타일) */
  attackRange: number;
  /** 경로 재계산 타이머 */
  repathTimer: number;
  /** 추적 대상 (플레이어 등) */
  target: number;
}
