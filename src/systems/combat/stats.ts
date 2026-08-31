/**
 * 스탯 정의 및 파생 스탯 계산.
 *
 * 기본 스탯: 힘(str)/민첩(dex)/지능(int)/활력(vit)
 * 파생: 공격력/공속/치명타/치명타피해/생명력/방어도/저항
 *
 * 파생 공식은 문서화된 단일 위치에서만 계산한다(재계산 파이프라인).
 */

export interface CoreStats {
  str: number; // 힘 → 공격력
  dex: number; // 민첩 → 공속/치명타
  int: number; // 지능 → 저항/(추후 마나)
  vit: number; // 활력 → 생명력/방어도
}

export interface DerivedStats {
  attackPower: number; // 물리 공격력 가산
  attackSpeed: number; // 초당 공격 횟수 배율 (1.0 = 기본)
  critChance: number; // 0..1
  critDamage: number; // 치명타 배율 (1.5 = +50%)
  maxHp: number;
  armor: number; // 물리 감소
  resistance: number; // 원소 감소 (0..1로 환산 전 원시값)
  moveSpeed: number; // 타일/초
}

/** 기본 스탯 프리셋 */
export function baseStats(): CoreStats {
  return { str: 10, dex: 10, int: 10, vit: 10 };
}

/**
 * 파생 스탯 계산. 레벨과 코어 스탯, 장비 보너스(추후)를 입력받는다.
 * Phase 4에서는 코어 스탯 + 레벨만 사용.
 */
export function computeDerived(core: CoreStats, level: number): DerivedStats {
  return {
    attackPower: core.str * 1.0,
    attackSpeed: 1.0 + core.dex * 0.005,
    critChance: Math.min(0.75, 0.05 + core.dex * 0.002),
    critDamage: 1.5,
    maxHp: 50 + core.vit * 8 + level * 10,
    armor: core.vit * 0.5,
    resistance: core.int * 0.4,
    moveSpeed: 4,
  };
}
