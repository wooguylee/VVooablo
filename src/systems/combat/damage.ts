/**
 * 데미지 공식 (격리된 단일 모듈).
 *
 * 최종 데미지 계산 순서 (명세 준수):
 *   1. 기본 무기 피해 (weaponBase)
 *   2. × (1 + 스킬계수 skillCoeff)
 *   3. × (1 + 증가피해 increasedDamage)
 *   4. 치명타 판정 시 × critDamage
 *   5. 방어도/저항으로 감소 (물리=armor, 원소=resistance)
 *   6. 최종 (최소 1)
 *
 * 감소 공식:
 *   물리 감소율 = armor / (armor + K + 10*attackerLevel)   (K=50)
 *   원소 감소율 = resistance / (resistance + K)             (상한 75%)
 *
 * 모든 무작위성(치명타/난수 변동)은 시드 RNG로 처리한다.
 */
import type { Rng } from '@/core/Rng';

export type DamageType = 'physical' | 'fire' | 'cold' | 'lightning';

export interface AttackParams {
  weaponBase: number;
  skillCoeff: number; // 예: 0.5 = +50%
  increasedDamage: number; // 예: 0.2 = +20%
  critChance: number; // 0..1
  critDamage: number; // 배율
  attackerLevel: number;
  type: DamageType;
  /** 데미지 하한/상한 변동폭 (0.15 = ±15%) */
  variance?: number;
}

export interface DefenseParams {
  armor: number;
  resistance: number;
}

export interface DamageResult {
  amount: number;
  isCrit: boolean;
  type: DamageType;
}

const ARMOR_K = 50;
const RES_K = 100;
const RES_CAP = 0.75;

/** 물리 데미지 감소율 [0,1) */
export function physicalReduction(armor: number, attackerLevel: number): number {
  const denom = armor + ARMOR_K + 10 * attackerLevel;
  return denom > 0 ? armor / denom : 0;
}

/** 원소 데미지 감소율 [0, RES_CAP] */
export function elementalReduction(resistance: number): number {
  const r = resistance / (resistance + RES_K);
  return Math.min(RES_CAP, r);
}

/**
 * 데미지 계산. RNG를 주입해 치명타/변동을 결정론적으로.
 */
export function computeDamage(
  atk: AttackParams,
  def: DefenseParams,
  rng: Rng,
): DamageResult {
  // 1~3단계
  let dmg = atk.weaponBase * (1 + atk.skillCoeff) * (1 + atk.increasedDamage);

  // 변동
  const variance = atk.variance ?? 0.1;
  if (variance > 0) {
    dmg *= 1 + rng.range(-variance, variance);
  }

  // 4단계: 치명타
  const isCrit = rng.chance(atk.critChance);
  if (isCrit) dmg *= atk.critDamage;

  // 5단계: 감소
  const reduction =
    atk.type === 'physical'
      ? physicalReduction(def.armor, atk.attackerLevel)
      : elementalReduction(def.resistance);
  dmg *= 1 - reduction;

  // 6단계: 최종
  return {
    amount: Math.max(1, Math.round(dmg)),
    isCrit,
    type: atk.type,
  };
}
