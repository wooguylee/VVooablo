/**
 * 몬스터 데이터 테이블.
 * 근접/원거리/돌진/소환 4종 + 보스 1종.
 * 원거리/돌진/소환 행동 파라미터를 데이터로 정의한다.
 */
import type { CoreStats } from '@/systems/combat/stats';

export type MonsterKind = 'melee' | 'ranged' | 'charger' | 'summoner' | 'boss';

export interface MonsterDef {
  id: string;
  name: string;
  kind: MonsterKind;
  color: number;
  size: number; // 렌더 스케일 배수
  core: CoreStats;
  weaponBase: number;
  aggroRange: number;
  attackRange: number;
  attackInterval: number;
  moveSpeed: number;
  xp: number;
  hpMultiplier: number; // 파생 최대체력 배수
  // 원거리
  projectileSpeed?: number;
  projectileCoeff?: number;
  // 돌진
  chargeSpeed?: number;
  chargeRange?: number;
  chargeCooldown?: number;
  // 소환
  summonId?: string;
  summonInterval?: number;
  summonMax?: number;
  // 보스
  isBoss?: boolean;
}

export const MONSTERS: Record<string, MonsterDef> = {
  grunt: {
    id: 'grunt',
    name: '해골 병사',
    kind: 'melee',
    color: 0xcc5555,
    size: 1,
    core: { str: 8, dex: 6, int: 4, vit: 8 },
    weaponBase: 6,
    aggroRange: 7,
    attackRange: 1.2,
    attackInterval: 1.2,
    moveSpeed: 2.6,
    xp: 5,
    hpMultiplier: 1,
  },
  archer: {
    id: 'archer',
    name: '해골 궁수',
    kind: 'ranged',
    color: 0x55aa66,
    size: 1,
    core: { str: 5, dex: 10, int: 4, vit: 5 },
    weaponBase: 5,
    aggroRange: 9,
    attackRange: 7,
    attackInterval: 1.6,
    moveSpeed: 2.2,
    xp: 7,
    hpMultiplier: 0.8,
    projectileSpeed: 9,
    projectileCoeff: 0.6,
  },
  brute: {
    id: 'brute',
    name: '돌격 야수',
    kind: 'charger',
    color: 0xcc8833,
    size: 1.3,
    core: { str: 12, dex: 8, int: 2, vit: 12 },
    weaponBase: 9,
    aggroRange: 8,
    attackRange: 1.4,
    attackInterval: 1.4,
    moveSpeed: 2.4,
    xp: 12,
    hpMultiplier: 1.5,
    chargeSpeed: 12,
    chargeRange: 6,
    chargeCooldown: 4,
  },
  necromancer: {
    id: 'necromancer',
    name: '강령술사',
    kind: 'summoner',
    color: 0x9955cc,
    size: 1.1,
    core: { str: 4, dex: 6, int: 12, vit: 8 },
    weaponBase: 4,
    aggroRange: 9,
    attackRange: 6,
    attackInterval: 2,
    moveSpeed: 2,
    xp: 15,
    hpMultiplier: 1.2,
    projectileSpeed: 7,
    projectileCoeff: 0.4,
    summonId: 'grunt',
    summonInterval: 5,
    summonMax: 3,
  },
  overlord: {
    id: 'overlord',
    name: '심연의 군주',
    kind: 'boss',
    color: 0xff3366,
    size: 2,
    core: { str: 18, dex: 12, int: 14, vit: 30 },
    weaponBase: 14,
    aggroRange: 14,
    attackRange: 2,
    attackInterval: 1.5,
    moveSpeed: 2.6,
    xp: 200,
    hpMultiplier: 12,
    projectileSpeed: 8,
    projectileCoeff: 0.8,
    chargeSpeed: 14,
    chargeRange: 8,
    chargeCooldown: 6,
    summonId: 'grunt',
    summonInterval: 8,
    summonMax: 4,
    isBoss: true,
  },
};
