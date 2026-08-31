import { describe, it, expect } from 'vitest';
import { createProfile } from '@/entities/playerProfile';
import { gainXp, xpForLevel, spendStatPoint, xpProgress } from '@/systems/leveling';
import {
  allocateTalent,
  canAllocate,
  resetTalents,
  talentTotals,
} from '@/systems/talentSystem';
import { Rng } from '@/core/Rng';
import { generateItem, setNextUid } from '@/systems/items/generateItem';
import {
  buyItem,
  sellItem,
  buyPrice,
  sellPrice,
  buyPotion,
  generateShopStock,
} from '@/systems/shopSystem';
import { addToInventory } from '@/entities/playerProfile';

describe('레벨링', () => {
  it('경험치 임계는 레벨에 따라 증가', () => {
    expect(xpForLevel(1)).toBeLessThan(xpForLevel(10));
  });

  it('충분한 경험치로 레벨업하고 포인트 지급', () => {
    const p = createProfile();
    const need = xpForLevel(1);
    const r = gainXp(p, need);
    expect(r.leveledUp).toBe(true);
    expect(p.level).toBe(2);
    expect(p.statPoints).toBeGreaterThan(0);
    expect(p.skillPoints).toBeGreaterThan(0);
  });

  it('대량 경험치로 여러 레벨 동시 상승', () => {
    const p = createProfile();
    const r = gainXp(p, 100000);
    expect(r.newLevels).toBeGreaterThan(1);
    expect(p.level).toBeGreaterThan(2);
  });

  it('스탯 포인트 투자로 코어 스탯 증가', () => {
    const p = createProfile();
    p.statPoints = 1;
    const before = p.baseCore.str;
    expect(spendStatPoint(p, 'str')).toBe(true);
    expect(p.baseCore.str).toBe(before + 1);
    expect(spendStatPoint(p, 'str')).toBe(false); // 포인트 소진
  });

  it('xpProgress는 0~1', () => {
    const p = createProfile();
    p.xp = Math.floor(xpForLevel(1) / 2);
    const prog = xpProgress(p);
    expect(prog).toBeGreaterThan(0);
    expect(prog).toBeLessThanOrEqual(1);
  });
});

describe('특성 트리', () => {
  it('선행 조건 없이 tier0은 배분 가능', () => {
    const p = createProfile();
    p.skillPoints = 1;
    expect(canAllocate(p, 'w0')).toBe(true);
    expect(allocateTalent(p, 'w0')).toBe(true);
    expect(p.talents.w0).toBe(1);
  });

  it('선행 노드 없이 상위 tier는 배분 불가', () => {
    const p = createProfile();
    p.skillPoints = 5;
    expect(canAllocate(p, 'w2')).toBe(false); // w0/w1 미배분
  });

  it('최대 랭크 초과 불가', () => {
    const p = createProfile();
    p.skillPoints = 10;
    allocateTalent(p, 'w0');
    allocateTalent(p, 'w0');
    allocateTalent(p, 'w0');
    expect(canAllocate(p, 'w0')).toBe(false); // maxRank 3
  });

  it('특성 modifier가 집계된다', () => {
    const p = createProfile();
    p.skillPoints = 3;
    allocateTalent(p, 'w0'); // maxHp +20
    const totals = talentTotals(p);
    expect(totals.maxHp).toBe(20);
  });

  it('초기화 시 포인트 환급', () => {
    const p = createProfile();
    p.skillPoints = 3;
    allocateTalent(p, 'w0');
    allocateTalent(p, 'w0');
    resetTalents(p);
    expect(Object.keys(p.talents).length).toBe(0);
    expect(p.skillPoints).toBe(3);
  });
});

describe('상점', () => {
  it('구매가 > 판매가', () => {
    setNextUid(1);
    const item = generateItem(new Rng(1), 10, { rarity: 'rare' });
    expect(buyPrice(item)).toBeGreaterThan(sellPrice(item));
  });

  it('골드 부족 시 구매 실패', () => {
    setNextUid(1);
    const p = createProfile();
    p.inventory.gold = 0;
    const item = generateItem(new Rng(1), 10, { rarity: 'legendary' });
    expect(buyItem(p, item)).toBe(false);
  });

  it('구매 성공 시 골드 차감 + 인벤 추가', () => {
    setNextUid(1);
    const p = createProfile();
    const item = generateItem(new Rng(1), 5, { rarity: 'common' });
    p.inventory.gold = buyPrice(item) + 10;
    const before = p.inventory.gold;
    expect(buyItem(p, item)).toBe(true);
    expect(p.inventory.gold).toBe(before - buyPrice(item));
    expect(p.inventory.items.has(item.uid)).toBe(true);
  });

  it('판매 시 골드 증가 + 인벤 제거', () => {
    setNextUid(1);
    const p = createProfile();
    const item = generateItem(new Rng(1), 5, { rarity: 'common' });
    addToInventory(p.inventory, item);
    const before = p.inventory.gold;
    expect(sellItem(p, item.uid)).toBe(true);
    expect(p.inventory.gold).toBeGreaterThan(before);
    expect(p.inventory.items.has(item.uid)).toBe(false);
  });

  it('포션 구매', () => {
    const p = createProfile();
    p.inventory.gold = 100;
    const before = p.potions;
    expect(buyPotion(p)).toBe(true);
    expect(p.potions).toBe(before + 1);
  });

  it('상점 재고는 시드로 재현', () => {
    setNextUid(1);
    const a = generateShopStock(new Rng(9), 10, 5).map((i) => i.baseId);
    setNextUid(1);
    const b = generateShopStock(new Rng(9), 10, 5).map((i) => i.baseId);
    expect(a).toEqual(b);
  });
});
