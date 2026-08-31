import { describe, it, expect, beforeEach } from 'vitest';
import { Rng } from '@/core/Rng';
import { createProfile, addToInventory } from '@/entities/playerProfile';
import { generateItem, setNextUid } from '@/systems/items/generateItem';
import { equipItem } from '@/systems/items/equipSystem';
import {
  serializeProfile,
  deserializeProfile,
  buildSave,
  migrate,
  SAVE_VERSION,
} from '@/save/serialize';

beforeEach(() => setNextUid(1));

describe('세이브 직렬화', () => {
  it('프로필 왕복(직렬화→역직렬화) 보존', () => {
    const p = createProfile();
    p.level = 5;
    p.xp = 120;
    p.inventory.gold = 999;
    p.potions = 7;
    p.baseCore.str = 15;
    p.talents.w0 = 2;

    const weapon = generateItem(new Rng(1), 8, { baseId: 'shortSword', rarity: 'rare' });
    const bag = generateItem(new Rng(2), 8, { baseId: 'ironHelm', rarity: 'magic' });
    addToInventory(p.inventory, weapon);
    addToInventory(p.inventory, bag);
    equipItem(p, weapon.uid); // 무기 장착

    const s = serializeProfile(p);
    const restored = deserializeProfile(s);

    expect(restored.level).toBe(5);
    expect(restored.xp).toBe(120);
    expect(restored.inventory.gold).toBe(999);
    expect(restored.potions).toBe(7);
    expect(restored.baseCore.str).toBe(15);
    expect(restored.talents.w0).toBe(2);
    // 장비 복원
    expect(restored.equipment.slots.weapon?.uid).toBe(weapon.uid);
    // 인벤토리 복원
    expect(restored.inventory.items.has(bag.uid)).toBe(true);
  });

  it('buildSave는 현재 버전과 메타데이터 포함', () => {
    const p = createProfile();
    const save = buildSave(1, 12345, 3, p, 50);
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.slot).toBe(1);
    expect(save.baseSeed).toBe(12345);
    expect(save.depth).toBe(3);
    expect(save.nextUid).toBe(50);
    expect(save.createdAt).toBeGreaterThan(0);
  });
});

describe('세이브 마이그레이션', () => {
  it('v1 → 최신 버전 (potions/talents 기본값 주입)', () => {
    const legacy = {
      version: 1,
      slot: 0,
      baseSeed: 1,
      depth: 2,
      nextUid: 10,
      profile: {
        level: 3,
        xp: 0,
        baseCore: { str: 10, dex: 10, int: 10, vit: 10 },
        baseWeaponDamage: 12,
        equipment: {},
        inventoryItems: [],
        gold: 0,
        statPoints: 0,
        skillPoints: 0,
        // potions/talents 없음 (구버전)
      },
    };
    const migrated = migrate(legacy);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.profile.potions).toBe(2);
    expect(migrated.profile.talents).toEqual({});
  });

  it('최신 버전은 그대로 유지', () => {
    const p = createProfile();
    const save = buildSave(0, 1, 1, p, 1);
    const migrated = migrate(save);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.profile.potions).toBe(p.potions);
  });
});
