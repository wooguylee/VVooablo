import { describe, it, expect } from 'vitest';
import { MONSTERS } from '@/data/monsters';
import { rollElite } from '@/entities/eliteRoll';
import { ELITE_AFFIXES } from '@/data/eliteAffixes';
import { Rng } from '@/core/Rng';

describe('몬스터 데이터', () => {
  it('4종 + 보스가 정의됨', () => {
    expect(MONSTERS.grunt.kind).toBe('melee');
    expect(MONSTERS.archer.kind).toBe('ranged');
    expect(MONSTERS.brute.kind).toBe('charger');
    expect(MONSTERS.necromancer.kind).toBe('summoner');
    expect(MONSTERS.overlord.isBoss).toBe(true);
  });

  it('보스는 소환/돌진/원거리 파라미터를 모두 가진다', () => {
    const b = MONSTERS.overlord;
    expect(b.summonId).toBeDefined();
    expect(b.chargeSpeed).toBeDefined();
    expect(b.projectileSpeed).toBeDefined();
  });
});

describe('엘리트 접사 롤링', () => {
  it('1~2개의 접사를 뽑는다', () => {
    for (let s = 1; s < 30; s++) {
      const roll = rollElite(new Rng(s));
      expect(roll.affixes.length).toBeGreaterThanOrEqual(1);
      expect(roll.affixes.length).toBeLessThanOrEqual(2);
    }
  });

  it('중복 접사는 없다', () => {
    for (let s = 1; s < 30; s++) {
      const roll = rollElite(new Rng(s));
      const uniq = new Set(roll.affixes);
      expect(uniq.size).toBe(roll.affixes.length);
    }
  });

  it('빠름 접사는 속도 배수를 올린다', () => {
    // swift가 포함된 롤 찾기
    let found = false;
    for (let s = 1; s < 100 && !found; s++) {
      const roll = rollElite(new Rng(s));
      if (roll.affixes.includes('swift')) {
        expect(roll.speedMult).toBeCloseTo(ELITE_AFFIXES.swift.speedMult!, 5);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it('동일 시드는 동일 접사 (재현성)', () => {
    expect(rollElite(new Rng(77)).affixes).toEqual(rollElite(new Rng(77)).affixes);
  });

  it('보호막 접사가 등장할 수 있다', () => {
    let found = false;
    for (let s = 1; s < 100 && !found; s++) {
      if (rollElite(new Rng(s)).affixes.includes('shielded')) found = true;
    }
    expect(found).toBe(true);
  });
});
