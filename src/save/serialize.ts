/**
 * 세이브 데이터 직렬화/역직렬화 + 버전 마이그레이션.
 *
 * PlayerProfile은 Map(inventory.items)을 포함하므로 순수 JSON 형태로 변환한다.
 * 저장 스키마는 SAVE_VERSION으로 관리하고, 구버전은 migrate로 업그레이드한다.
 */
import type { PlayerProfile } from '@/entities/playerProfile';
import { createProfile } from '@/entities/playerProfile';
import type { ItemInstance } from '@/data/itemTypes';
import { setNextUid } from '@/systems/items/generateItem';

export const SAVE_VERSION = 2;

export interface SaveData {
  version: number;
  slot: number;
  createdAt: number;
  updatedAt: number;
  baseSeed: number;
  depth: number;
  profile: SerializedProfile;
  nextUid: number;
}

interface SerializedProfile {
  level: number;
  xp: number;
  baseCore: PlayerProfile['baseCore'];
  baseWeaponDamage: number;
  equipment: Record<string, ItemInstance>;
  inventoryItems: ItemInstance[];
  gold: number;
  statPoints: number;
  skillPoints: number;
  talents: Record<string, number>;
  potions: number;
}

/** 프로필 → 직렬화 */
export function serializeProfile(profile: PlayerProfile): SerializedProfile {
  const equipment: Record<string, ItemInstance> = {};
  for (const [slot, item] of Object.entries(profile.equipment.slots)) {
    if (item) equipment[slot] = item;
  }
  return {
    level: profile.level,
    xp: profile.xp,
    baseCore: { ...profile.baseCore },
    baseWeaponDamage: profile.baseWeaponDamage,
    equipment,
    inventoryItems: [...profile.inventory.items.values()].map((e) => e.item),
    gold: profile.inventory.gold,
    statPoints: profile.statPoints,
    skillPoints: profile.skillPoints,
    talents: { ...profile.talents },
    potions: profile.potions,
  };
}

/** 직렬화 → 프로필 */
export function deserializeProfile(s: SerializedProfile): PlayerProfile {
  const profile = createProfile();
  profile.level = s.level;
  profile.xp = s.xp;
  profile.baseCore = { ...s.baseCore };
  profile.baseWeaponDamage = s.baseWeaponDamage;
  profile.statPoints = s.statPoints;
  profile.skillPoints = s.skillPoints;
  profile.talents = { ...s.talents };
  profile.potions = s.potions;
  profile.inventory.gold = s.gold;

  // 장비 복원
  for (const [slot, item] of Object.entries(s.equipment)) {
    profile.equipment.slots[slot as keyof typeof profile.equipment.slots] = item;
  }
  // 인벤토리 복원
  let maxUid = 0;
  for (const item of s.inventoryItems) {
    profile.inventory.items.set(item.uid, { item, x: 0, y: 0 });
    maxUid = Math.max(maxUid, item.uid);
  }
  for (const item of Object.values(s.equipment)) {
    maxUid = Math.max(maxUid, item.uid);
  }
  setNextUid(maxUid + 1);
  return profile;
}

export function buildSave(
  slot: number,
  baseSeed: number,
  depth: number,
  profile: PlayerProfile,
  nextUid: number,
  createdAt?: number,
): SaveData {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    slot,
    createdAt: createdAt ?? now,
    updatedAt: now,
    baseSeed,
    depth,
    profile: serializeProfile(profile),
    nextUid,
  };
}

/**
 * 버전 마이그레이션.
 * v1 → v2: potions 필드 도입(없으면 기본값), talents 기본화.
 */
export function migrate(raw: unknown): SaveData {
  const data = raw as Partial<SaveData> & { version?: number };
  let version = data.version ?? 1;
  const prof = data.profile as Partial<SerializedProfile> | undefined;

  if (version < 2 && prof) {
    if (prof.potions === undefined) prof.potions = 2;
    if (!prof.talents) prof.talents = {};
    version = 2;
  }

  return {
    version: SAVE_VERSION,
    slot: data.slot ?? 0,
    createdAt: data.createdAt ?? Date.now(),
    updatedAt: data.updatedAt ?? Date.now(),
    baseSeed: data.baseSeed ?? 0,
    depth: data.depth ?? 0,
    profile: prof as SerializedProfile,
    nextUid: data.nextUid ?? 1,
  };
}
