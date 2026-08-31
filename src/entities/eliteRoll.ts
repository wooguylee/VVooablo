/**
 * 엘리트 접사 롤링 (순수 함수, 렌더 비의존).
 * createMonster와 테스트에서 공유한다.
 */
import type { Rng } from '@/core/Rng';
import { ELITE_AFFIXES, ELITE_AFFIX_IDS, type EliteAffixId } from '@/data/eliteAffixes';

export interface EliteRoll {
  affixes: EliteAffixId[];
  speedMult: number;
  hpMult: number;
}

export function rollElite(rng: Rng): EliteRoll {
  const affixes: EliteAffixId[] = [];
  const pool = [...ELITE_AFFIX_IDS];
  const n = rng.int(1, 2);
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = rng.int(0, pool.length - 1);
    affixes.push(pool.splice(idx, 1)[0]);
  }
  let speedMult = 1;
  for (const a of affixes) {
    const affix = ELITE_AFFIXES[a];
    if (affix.speedMult) speedMult *= affix.speedMult;
  }
  return { affixes, speedMult, hpMult: 2.2 };
}
