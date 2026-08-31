/**
 * 스킬 사용자 컴포넌트 (자원/쿨다운/시전 상태).
 */
export const SC = {
  SkillUser: 'SkillUser',
} as const;

export interface SkillUser {
  mana: number;
  maxMana: number;
  manaRegen: number; // 초당
  /** 슬롯별 스킬 id (Q/W/E/R/우클릭) */
  slots: string[];
  /** 스킬별 남은 쿨다운(초) */
  cooldowns: Record<string, number>;
  /** 현재 시전 중인 스킬 (없으면 null) */
  casting: { skillId: string; timeLeft: number; targetX: number; targetY: number } | null;
}

export function createSkillUser(slots: string[]): SkillUser {
  return {
    mana: 100,
    maxMana: 100,
    manaRegen: 8,
    slots,
    cooldowns: {},
    casting: null,
  };
}
