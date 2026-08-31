/**
 * 스킬 데이터 테이블.
 *
 * 각 스킬은 쿨다운/자원(마나)/시전시간/애니메이션과 효과 파라미터를 데이터로 정의한다.
 * 5종: 근접 휘두르기(부채꼴), 돌진, 투사체 연사, 원형 폭발 장판, 소환(토템).
 */
import type { DamageType } from '@/systems/combat/damage';
import type { StatusType } from '@/systems/status/statusTypes';

export type SkillShape = 'arc' | 'dash' | 'projectile' | 'aoe' | 'summon';

export interface SkillDef {
  id: string;
  name: string;
  shape: SkillShape;
  /** 쿨다운(초) */
  cooldown: number;
  /** 마나 소모 */
  manaCost: number;
  /** 시전 시간(초). 0이면 즉시 */
  castTime: number;
  /** 스킬 계수 (데미지 공식) */
  skillCoeff: number;
  damageType: DamageType;
  /** 사거리/반경 (타일) */
  range: number;
  /** 부채꼴 반각(라디안), arc 전용 */
  arcHalfAngle?: number;
  /** 투사체 속도(타일/초), projectile 전용 */
  projectileSpeed?: number;
  /** 연사 횟수, projectile 전용 */
  projectileCount?: number;
  /** 돌진 속도(타일/초), dash 전용 */
  dashSpeed?: number;
  /** 부여 상태이상 */
  applyStatus?: { type: StatusType; duration: number; magnitude: number };
  /** 소환물 지속시간(초), summon 전용 */
  summonDuration?: number;
  color: number;
}

export const SKILLS: Record<string, SkillDef> = {
  cleave: {
    id: 'cleave',
    name: '휘두르기',
    shape: 'arc',
    cooldown: 0.8,
    manaCost: 5,
    castTime: 0.15,
    skillCoeff: 0.8,
    damageType: 'physical',
    range: 2.2,
    arcHalfAngle: Math.PI / 3, // 120도 부채꼴
    color: 0xffcc44,
  },
  dash: {
    id: 'dash',
    name: '돌진',
    shape: 'dash',
    cooldown: 3,
    manaCost: 10,
    castTime: 0,
    skillCoeff: 0.5,
    damageType: 'physical',
    range: 5,
    dashSpeed: 18,
    applyStatus: { type: 'stun', duration: 0.6, magnitude: 1 },
    color: 0x66ccff,
  },
  barrage: {
    id: 'barrage',
    name: '투사체 연사',
    shape: 'projectile',
    cooldown: 1.5,
    manaCost: 8,
    castTime: 0.1,
    skillCoeff: 0.4,
    damageType: 'physical',
    range: 9,
    projectileSpeed: 12,
    projectileCount: 3,
    color: 0xffee66,
  },
  novaBlast: {
    id: 'novaBlast',
    name: '원형 폭발',
    shape: 'aoe',
    cooldown: 5,
    manaCost: 20,
    castTime: 0.4,
    skillCoeff: 1.4,
    damageType: 'fire',
    range: 3.5,
    applyStatus: { type: 'burn', duration: 3, magnitude: 4 },
    color: 0xff5533,
  },
  totem: {
    id: 'totem',
    name: '번개 토템',
    shape: 'summon',
    cooldown: 8,
    manaCost: 25,
    castTime: 0.5,
    skillCoeff: 0.6,
    damageType: 'lightning',
    range: 6,
    summonDuration: 10,
    color: 0xaa66ff,
  },
};

/** Q/W/E/R + 우클릭 슬롯 기본 배치 */
export const DEFAULT_SKILL_SLOTS = ['cleave', 'dash', 'barrage', 'novaBlast', 'totem'] as const;
