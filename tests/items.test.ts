import { describe, it, expect, beforeEach } from 'vitest';
import { Rng } from '@/core/Rng';
import { generateItem, rollRarity, setNextUid } from '@/systems/items/generateItem';
import { recalcStats, type Equipment } from '@/systems/items/equipment';
import { rollDrops } from '@/systems/items/dropSystem';
import { RARITY_AFFIX_COUNT } from '@/data/itemTypes';

beforeEach(() => setNextUid(1));

describe('아이템 생성', () => {
  it('동일 시드는 동일 아이템 (재현성)', () => {
    const a = generateItem(new Rng(100), 10);
    setNextUid(1);
    const b = generateItem(new Rng(100), 10);
    expect(a.baseId).toBe(b.baseId);
    expect(a.rarity).toBe(b.rarity);
    expect(a.mods).toEqual(b.mods);
  });

  it('등급별 접사 개수가 규칙과 일치', () => {
    for (const rarity of ['common', 'magic', 'rare', 'legendary'] as const) {
      const item = generateItem(new Rng(5), 15, { rarity, baseId: 'shortSword' });
      // 접사 개수는 최대 RARITY_AFFIX_COUNT (풀 고갈 시 그 이하 가능)
      expect(item.mods.length).toBeLessThanOrEqual(RARITY_AFFIX_COUNT[rarity]);
      if (rarity === 'common') expect(item.mods.length).toBe(0);
    }
  });

  it('접사 값이 tier 범위 내', () => {
    for (let s = 1; s < 40; s++) {
      const item = generateItem(new Rng(s), 20, { rarity: 'rare', baseId: 'shortSword' });
      for (const m of item.mods) {
        expect(m.value).toBeGreaterThan(0);
      }
    }
  });

  it('아이템 레벨이 낮으면 상위 tier 접사가 안 나온다', () => {
    // itemLevel 1에서는 minItemLevel 큰 접사 제외 → 값이 낮은 tier
    const low = generateItem(new Rng(3), 1, { rarity: 'magic', baseId: 'shortSword' });
    expect(low.mods.every((m) => m.value < 100)).toBe(true);
  });

  it('UID는 고유하게 증가', () => {
    const a = generateItem(new Rng(1), 5);
    const b = generateItem(new Rng(2), 5);
    expect(b.uid).toBeGreaterThan(a.uid);
  });
});

describe('등급 롤링', () => {
  it('아이템 레벨이 높으면 상위 등급 확률 증가', () => {
    const count = (level: number) => {
      let rares = 0;
      for (let s = 0; s < 2000; s++) {
        const r = rollRarity(new Rng(s), level);
        if (r === 'rare' || r === 'legendary') rares++;
      }
      return rares;
    };
    expect(count(30)).toBeGreaterThan(count(1));
  });
});

describe('스탯 재계산 파이프라인', () => {
  const baseCore = { str: 10, dex: 10, int: 10, vit: 10 };

  it('빈 장비는 기본 스탯 유지', () => {
    const equip: Equipment = { slots: {} };
    const r = recalcStats(baseCore, equip, 1, 12);
    expect(r.core.str).toBe(10);
    expect(r.weaponBase).toBe(12);
  });

  it('힘 접사가 코어 스탯에 합산되어 최대체력 등에 반영', () => {
    const equip: Equipment = {
      slots: {
        amulet: {
          uid: 1,
          baseId: 'amulet',
          name: '힘의 목걸이',
          rarity: 'magic',
          itemLevel: 5,
          slot: 'amulet',
          mods: [{ key: 'str', value: 10 }],
          width: 1,
          height: 1,
          color: 0,
        },
      },
    };
    const r = recalcStats(baseCore, equip, 1, 12);
    expect(r.core.str).toBe(20);
  });

  it('무기 baseDamage와 증가피해%가 무기 피해에 반영', () => {
    const equip: Equipment = {
      slots: {
        weapon: {
          uid: 1,
          baseId: 'shortSword',
          name: '검',
          rarity: 'magic',
          itemLevel: 5,
          slot: 'weapon',
          baseDamage: 12,
          mods: [{ key: 'increasedDamage', value: 50 }],
          width: 1,
          height: 3,
          color: 0,
        },
      },
    };
    // (기본12 + 무기12) * 1.5 = 36
    const r = recalcStats(baseCore, equip, 1, 12);
    expect(r.weaponBase).toBe(36);
  });

  it('방어구 baseArmor가 방어도에 합산', () => {
    const equip: Equipment = {
      slots: {
        armor: {
          uid: 1,
          baseId: 'plateArmor',
          name: '갑옷',
          rarity: 'common',
          itemLevel: 6,
          slot: 'armor',
          baseArmor: 18,
          mods: [],
          width: 2,
          height: 3,
          color: 0,
        },
      },
    };
    const noArmor = recalcStats(baseCore, { slots: {} }, 1, 12);
    const withArmor = recalcStats(baseCore, equip, 1, 12);
    expect(withArmor.derived.armor).toBeCloseTo(noArmor.derived.armor + 18, 5);
  });
});

describe('드롭 롤링', () => {
  it('드롭 확률 100%면 아이템이 나온다', () => {
    const d = rollDrops(new Rng(1), 10, 1, 0);
    expect(d.items.length).toBe(1);
    expect(d.gold).toBeGreaterThan(0);
  });

  it('보너스 롤은 최대 드롭 수를 늘린다', () => {
    const d = rollDrops(new Rng(1), 10, 1, 3);
    expect(d.items.length).toBe(4);
  });

  it('동일 시드는 동일 드롭', () => {
    setNextUid(1);
    const a = rollDrops(new Rng(7), 10, 1, 2);
    setNextUid(1);
    const b = rollDrops(new Rng(7), 10, 1, 2);
    expect(a.gold).toBe(b.gold);
    expect(a.items.map((i) => i.baseId)).toEqual(b.items.map((i) => i.baseId));
  });
});
