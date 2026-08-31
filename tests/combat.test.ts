import { describe, it, expect } from 'vitest';
import { Rng } from '@/core/Rng';
import {
  computeDamage,
  physicalReduction,
  elementalReduction,
  type AttackParams,
  type DefenseParams,
} from '@/systems/combat/damage';
import { computeDerived, baseStats } from '@/systems/combat/stats';
import { inCircle, inArc } from '@/systems/combat/hitbox';

describe('데미지 공식', () => {
  const baseAtk: AttackParams = {
    weaponBase: 100,
    skillCoeff: 0,
    increasedDamage: 0,
    critChance: 0,
    critDamage: 1.5,
    attackerLevel: 1,
    type: 'physical',
    variance: 0,
  };
  const noDef: DefenseParams = { armor: 0, resistance: 0 };

  it('방어/변동/치명 없으면 무기 피해 그대로', () => {
    const r = computeDamage(baseAtk, noDef, new Rng(1));
    expect(r.amount).toBe(100);
    expect(r.isCrit).toBe(false);
  });

  it('스킬계수/증가피해가 곱연산으로 적용', () => {
    const atk = { ...baseAtk, skillCoeff: 0.5, increasedDamage: 0.2 };
    // 100 * 1.5 * 1.2 = 180
    const r = computeDamage(atk, noDef, new Rng(1));
    expect(r.amount).toBe(180);
  });

  it('치명타 100%면 critDamage 배율 적용', () => {
    const atk = { ...baseAtk, critChance: 1 };
    const r = computeDamage(atk, noDef, new Rng(1));
    expect(r.isCrit).toBe(true);
    expect(r.amount).toBe(150);
  });

  it('방어도는 물리 피해를 감소시킨다', () => {
    const def: DefenseParams = { armor: 100, resistance: 0 };
    const r = computeDamage(baseAtk, def, new Rng(1));
    expect(r.amount).toBeLessThan(100);
    expect(r.amount).toBeGreaterThanOrEqual(1);
  });

  it('저항은 원소 피해를 감소(상한 75%)', () => {
    // 매우 높은 저항 → 75% 상한
    expect(elementalReduction(100000)).toBeCloseTo(0.75, 2);
    const atk = { ...baseAtk, type: 'fire' as const };
    const def: DefenseParams = { armor: 0, resistance: 100000 };
    const r = computeDamage(atk, def, new Rng(1));
    expect(r.amount).toBe(25); // 100 * 0.25
  });

  it('최소 피해는 1', () => {
    const atk = { ...baseAtk, weaponBase: 1 };
    const def: DefenseParams = { armor: 100000, resistance: 0 };
    const r = computeDamage(atk, def, new Rng(1));
    expect(r.amount).toBe(1);
  });

  it('동일 시드는 동일 결과 (결정성)', () => {
    const atk = { ...baseAtk, critChance: 0.5, variance: 0.2 };
    const a = computeDamage(atk, noDef, new Rng(123));
    const b = computeDamage(atk, noDef, new Rng(123));
    expect(a).toEqual(b);
  });

  it('물리 감소율은 방어도 증가에 따라 단조 증가', () => {
    expect(physicalReduction(50, 1)).toBeLessThan(physicalReduction(200, 1));
  });
});

describe('파생 스탯', () => {
  it('활력이 생명력을 증가', () => {
    const low = computeDerived({ ...baseStats(), vit: 5 }, 1);
    const high = computeDerived({ ...baseStats(), vit: 50 }, 1);
    expect(high.maxHp).toBeGreaterThan(low.maxHp);
  });
  it('치명타 확률 상한 75%', () => {
    const d = computeDerived({ ...baseStats(), dex: 100000 }, 1);
    expect(d.critChance).toBeLessThanOrEqual(0.75);
  });
});

describe('히트박스', () => {
  it('원형 범위 판정', () => {
    expect(inCircle(1, 0, 0, 0, 2)).toBe(true);
    expect(inCircle(3, 0, 0, 0, 2)).toBe(false);
  });
  it('부채꼴 판정 (정면 90도)', () => {
    const half = Math.PI / 4; // 반각 45도
    expect(inArc(2, 0, 0, 0, 3, 0, half)).toBe(true); // 정면
    expect(inArc(0, 2, 0, 0, 3, 0, half)).toBe(false); // 옆
  });
});
