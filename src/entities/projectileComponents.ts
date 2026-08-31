/**
 * 투사체 컴포넌트.
 */
import type { DamageType } from '@/systems/combat/damage';
import type { StatusType } from '@/systems/status/statusTypes';

export const PC = {
  Projectile: 'Projectile',
} as const;

export interface Projectile {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number; // 타일/초
  vy: number;
  /** 남은 사거리(타일) */
  rangeLeft: number;
  radius: number; // 충돌 반경
  skillCoeff: number;
  damageType: DamageType;
  ownerLevel: number;
  weaponBase: number;
  /** 발사 진영 (피아 구분) */
  faction: 'player' | 'enemy';
  applyStatus?: { type: StatusType; duration: number; magnitude: number };
  color: number;
  alive: boolean;
}
