/**
 * 특성 트리 배분/재설정 로직 + 특성 modifier 집계.
 */
import type { PlayerProfile } from '@/entities/playerProfile';
import { TALENTS, talentById, type TalentNode } from '@/data/talents';
import type { ModTotals } from '@/systems/items/equipment';
import { emptyTotals } from '@/systems/items/equipment';

/** 노드를 찍을 수 있는가 (포인트 보유 + 최대랭크 미만 + 선행 조건) */
export function canAllocate(profile: PlayerProfile, nodeId: string): boolean {
  const node = talentById(nodeId);
  if (!node) return false;
  if (profile.skillPoints <= 0) return false;
  const rank = profile.talents[nodeId] ?? 0;
  if (rank >= node.maxRank) return false;
  // 선행: 같은 분기의 tier-1 노드가 최소 1랭크
  if (node.tier > 0) {
    const prev = TALENTS.find((t) => t.branch === node.branch && t.tier === node.tier - 1);
    if (prev && (profile.talents[prev.id] ?? 0) === 0) return false;
  }
  return true;
}

export function allocateTalent(profile: PlayerProfile, nodeId: string): boolean {
  if (!canAllocate(profile, nodeId)) return false;
  profile.talents[nodeId] = (profile.talents[nodeId] ?? 0) + 1;
  profile.skillPoints -= 1;
  return true;
}

/** 특성 전체 재설정 (포인트 환급) */
export function resetTalents(profile: PlayerProfile): void {
  let refunded = 0;
  for (const rank of Object.values(profile.talents)) refunded += rank;
  profile.talents = {};
  profile.skillPoints += refunded;
}

/** 특성 modifier를 ModTotals로 집계 (스탯 재계산에 합산) */
export function talentTotals(profile: PlayerProfile): ModTotals {
  const totals = emptyTotals();
  for (const [id, rank] of Object.entries(profile.talents)) {
    if (rank <= 0) continue;
    const node: TalentNode | undefined = talentById(id);
    if (!node) continue;
    totals[node.key] += node.valuePerRank * rank;
  }
  return totals;
}
