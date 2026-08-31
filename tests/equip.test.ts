import { describe, it, expect, beforeEach } from 'vitest';
import { Rng } from '@/core/Rng';
import { createProfile, addToInventory } from '@/entities/playerProfile';
import { equipItem, unequipItem } from '@/systems/items/equipSystem';
import { generateItem, setNextUid } from '@/systems/items/generateItem';

beforeEach(() => setNextUid(1));

describe('장착/해제', () => {
  it('인벤토리 아이템을 장착하면 슬롯에 들어가고 인벤에서 제거', () => {
    const p = createProfile();
    const item = generateItem(new Rng(1), 5, { baseId: 'shortSword', rarity: 'common' });
    addToInventory(p.inventory, item);
    expect(p.inventory.items.has(item.uid)).toBe(true);

    equipItem(p, item.uid);
    expect(p.equipment.slots.weapon?.uid).toBe(item.uid);
    expect(p.inventory.items.has(item.uid)).toBe(false);
  });

  it('같은 슬롯 재장착 시 기존 아이템이 인벤토리로 반환', () => {
    const p = createProfile();
    const a = generateItem(new Rng(1), 5, { baseId: 'shortSword', rarity: 'common' });
    const b = generateItem(new Rng(2), 5, { baseId: 'battleAxe', rarity: 'common' });
    addToInventory(p.inventory, a);
    addToInventory(p.inventory, b);
    equipItem(p, a.uid);
    equipItem(p, b.uid);
    expect(p.equipment.slots.weapon?.uid).toBe(b.uid);
    expect(p.inventory.items.has(a.uid)).toBe(true); // a는 인벤으로
  });

  it('반지는 ring1이 비어있으면 ring1, 아니면 ring2', () => {
    const p = createProfile();
    const r1 = generateItem(new Rng(1), 5, { baseId: 'ring', rarity: 'common' });
    const r2 = generateItem(new Rng(2), 5, { baseId: 'ring', rarity: 'common' });
    addToInventory(p.inventory, r1);
    addToInventory(p.inventory, r2);
    equipItem(p, r1.uid);
    equipItem(p, r2.uid);
    expect(p.equipment.slots.ring1?.uid).toBe(r1.uid);
    expect(p.equipment.slots.ring2?.uid).toBe(r2.uid);
  });

  it('해제하면 인벤토리로 돌아온다', () => {
    const p = createProfile();
    const item = generateItem(new Rng(1), 5, { baseId: 'ironHelm', rarity: 'common' });
    addToInventory(p.inventory, item);
    equipItem(p, item.uid);
    unequipItem(p, 'helmet');
    expect(p.equipment.slots.helmet).toBeUndefined();
    expect(p.inventory.items.has(item.uid)).toBe(true);
  });
});
