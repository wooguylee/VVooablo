/**
 * 전투 관련 컴포넌트.
 */
import type { CoreStats, DerivedStats } from '@/systems/combat/stats';

export const CC = {
  Health: 'Health',
  Stats: 'Stats',
  Faction: 'Faction',
  Attacker: 'Attacker',
  Enemy: 'Enemy',
  Corpse: 'Corpse',
} as const;

export interface Health {
  hp: number;
  maxHp: number;
  /** 피격 무적 타이머(초) */
  invuln: number;
  dead: boolean;
}

export interface Stats {
  core: CoreStats;
  derived: DerivedStats;
  level: number;
  /** 기본 무기 피해 */
  weaponBase: number;
}

export type FactionId = 'player' | 'enemy';
export interface Faction {
  id: FactionId;
}

/** 근접 자동 공격 상태 */
export interface Attacker {
  range: number; // 타일
  cooldown: number; // 현재 남은 쿨다운(초)
  baseCooldown: number; // 공격 간격(초)
  skillCoeff: number;
  /** 공격 대상 엔티티 (없으면 -1) */
  target: number;
}

/** 사망 후 시체 페이드 타이머 */
export interface Corpse {
  timer: number;
}
