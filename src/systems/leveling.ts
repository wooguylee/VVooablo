/**
 * 레벨링 시스템.
 * 경험치 곡선, 레벨업 시 스탯/스킬 포인트 지급, 파생 스탯 갱신.
 */
import type { PlayerProfile } from '@/entities/playerProfile';

/** 레벨 L → L+1 에 필요한 누적 경험치 임계 */
export function xpForLevel(level: number): number {
  // 완만한 지수 곡선
  return Math.floor(50 * Math.pow(level, 1.5) + 50 * level);
}

export interface LevelUpResult {
  leveledUp: boolean;
  newLevels: number;
  statPointsGained: number;
  skillPointsGained: number;
}

const STAT_POINTS_PER_LEVEL = 3;
const SKILL_POINTS_PER_LEVEL = 1;

/** 경험치 획득 → 레벨업 처리 (여러 레벨 동시 상승 가능) */
export function gainXp(profile: PlayerProfile, amount: number): LevelUpResult {
  profile.xp += amount;
  let newLevels = 0;
  while (profile.xp >= xpForLevel(profile.level)) {
    profile.xp -= xpForLevel(profile.level);
    profile.level++;
    newLevels++;
    profile.statPoints += STAT_POINTS_PER_LEVEL;
    profile.skillPoints += SKILL_POINTS_PER_LEVEL;
  }
  return {
    leveledUp: newLevels > 0,
    newLevels,
    statPointsGained: newLevels * STAT_POINTS_PER_LEVEL,
    skillPointsGained: newLevels * SKILL_POINTS_PER_LEVEL,
  };
}

/** 스탯 포인트 투자 */
export function spendStatPoint(profile: PlayerProfile, stat: 'str' | 'dex' | 'int' | 'vit'): boolean {
  if (profile.statPoints <= 0) return false;
  profile.baseCore[stat] += 1;
  profile.statPoints -= 1;
  return true;
}

/** 다음 레벨까지 진행률 [0,1] */
export function xpProgress(profile: PlayerProfile): number {
  const need = xpForLevel(profile.level);
  return need > 0 ? Math.min(1, profile.xp / need) : 0;
}
