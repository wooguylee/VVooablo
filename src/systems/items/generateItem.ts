/**
 * 아이템 생성(롤링) 로직.
 *
 * 아이템 레벨 + 등급 → 베이스 선택 → 접사 개수만큼 prefix/suffix 롤링.
 * 접사 값은 itemLevel 이하 최고 tier에서 시드 RNG로 결정.
 * 모든 무작위성은 주입된 Rng로 처리해 재현 가능.
 */
import type { Rng } from '@/core/Rng';
import {
  type ItemInstance,
  type ItemRarity,
  type Modifier,
  RARITY_AFFIX_COUNT,
  RARITY_NAME,
  RARITY_COLOR,
} from '@/data/itemTypes';
import { ITEM_BASES, SLOT_GRID_SIZE } from '@/data/items';
import { AFFIXES, type AffixDef, type AffixKind } from '@/data/affixes';

let uidCounter = 1;

/** 다음 아이템 UID (저장 복원 시 setNextUid로 조정) */
export function nextUid(): number {
  return uidCounter++;
}
export function setNextUid(v: number): void {
  uidCounter = Math.max(uidCounter, v);
}

/** 등급 롤링 (아이템 레벨 높을수록 상위 등급 확률↑) */
export function rollRarity(rng: Rng, itemLevel: number): ItemRarity {
  const legendaryChance = Math.min(0.05, 0.005 + itemLevel * 0.002);
  const rareChance = Math.min(0.25, 0.05 + itemLevel * 0.01);
  const magicChance = 0.45;
  const r = rng.next();
  if (r < legendaryChance) return 'legendary';
  if (r < legendaryChance + rareChance) return 'rare';
  if (r < legendaryChance + rareChance + magicChance) return 'magic';
  return 'common';
}

/** 접사 tier 선택: itemLevel 이하 중 가장 높은 tier */
function pickTier(affix: AffixDef, itemLevel: number) {
  let chosen = null;
  for (const t of affix.tiers) {
    if (t.minItemLevel <= itemLevel) {
      if (!chosen || t.minItemLevel > chosen.minItemLevel) chosen = t;
    }
  }
  return chosen;
}

/** 슬롯/아이템레벨에 유효한 접사 필터 */
function eligibleAffixes(kind: AffixKind, slot: string, itemLevel: number): AffixDef[] {
  return AFFIXES.filter((a) => {
    if (a.kind !== kind) return false;
    if (a.slots && !a.slots.includes(slot)) return false;
    return pickTier(a, itemLevel) !== null;
  });
}

/** 접사 롤링 (중복 방지) */
function rollAffixes(
  rng: Rng,
  slot: string,
  itemLevel: number,
  count: number,
): Modifier[] {
  const mods: Modifier[] = [];
  // prefix/suffix 균형 있게 배분
  let prefixLeft = Math.ceil(count / 2);
  let suffixLeft = Math.floor(count / 2);
  const usedPrefix = new Set<string>();
  const usedSuffix = new Set<string>();

  const rollOne = (kind: AffixKind, used: Set<string>): boolean => {
    const pool = eligibleAffixes(kind, slot, itemLevel).filter((a) => !used.has(a.id));
    if (pool.length === 0) return false;
    const affix = rng.pick(pool);
    used.add(affix.id);
    const tier = pickTier(affix, itemLevel)!;
    const value = rng.int(tier.min, tier.max);
    mods.push({ key: affix.key, value });
    return true;
  };

  // 남은 접사를 번갈아 롤링
  while (prefixLeft > 0 || suffixLeft > 0) {
    let progressed = false;
    if (prefixLeft > 0) {
      if (rollOne('prefix', usedPrefix)) progressed = true;
      prefixLeft--;
    }
    if (suffixLeft > 0) {
      if (rollOne('suffix', usedSuffix)) progressed = true;
      suffixLeft--;
    }
    if (!progressed && prefixLeft <= 0 && suffixLeft <= 0) break;
    if (!progressed) break;
  }
  return mods;
}

/** 아이템 생성 */
export function generateItem(
  rng: Rng,
  itemLevel: number,
  opts: { baseId?: string; rarity?: ItemRarity } = {},
): ItemInstance {
  // 베이스 선택 (itemLevel 이하 요구치)
  let baseId = opts.baseId;
  if (!baseId) {
    const pool = Object.values(ITEM_BASES).filter((b) => b.minItemLevel <= itemLevel);
    baseId = rng.pick(pool.length ? pool : Object.values(ITEM_BASES)).id;
  }
  const base = ITEM_BASES[baseId];
  const rarity = opts.rarity ?? rollRarity(rng, itemLevel);
  const affixCount = RARITY_AFFIX_COUNT[rarity];
  const mods = affixCount > 0 ? rollAffixes(rng, base.slot, itemLevel, affixCount) : [];

  // 이름: 등급 + 베이스
  const name = rarity === 'common' ? base.name : `${RARITY_NAME[rarity]} ${base.name}`;
  const grid = SLOT_GRID_SIZE[base.slot] ?? { w: 1, h: 1 };

  const item: ItemInstance = {
    uid: nextUid(),
    baseId,
    name,
    rarity,
    itemLevel,
    slot: base.slot,
    mods,
    width: grid.w,
    height: grid.h,
    color: RARITY_COLOR[rarity],
  };
  if (base.baseDamage !== undefined) item.baseDamage = base.baseDamage;
  if (base.baseArmor !== undefined) item.baseArmor = base.baseArmor;
  return item;
}
