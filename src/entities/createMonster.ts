/**
 * 몬스터 엔티티 팩토리.
 * 근접/원거리/돌진/소환/보스 + 엘리트 접사 지원.
 */
import type { Container } from 'pixi.js';
import type { World, Entity } from '@/core/ecs';
import type { Rng } from '@/core/Rng';
import {
  C,
  type Position,
  type Movement,
  type Facing,
  type SpriteRef,
} from '@/entities/components';
import {
  CC,
  type Health,
  type Stats,
  type Faction,
  type Attacker,
} from '@/entities/combatComponents';
import { AC, type Ai, type Elite, type Boss, type Shield } from '@/entities/aiComponents';
import { createPlaceholderSprite } from '@/render/Animator';
import { computeDerived } from '@/systems/combat/stats';
import type { MonsterDef } from '@/data/monsters';
import { ELITE_AFFIXES, type EliteAffixId } from '@/data/eliteAffixes';
import { rollElite } from '@/entities/eliteRoll';

export interface SpawnOptions {
  elite?: boolean;
  rng?: Rng;
}

export function createMonster(
  world: World,
  layer: Container,
  def: MonsterDef,
  x: number,
  y: number,
  level: number,
  opts: SpawnOptions = {},
): Entity {
  const e = world.createEntity();

  const derived = computeDerived(def.core, level);
  let maxHp = derived.maxHp * def.hpMultiplier;

  // 엘리트 접사 선택
  const affixes: EliteAffixId[] = [];
  let speedMult = 1;
  if (opts.elite && opts.rng) {
    const roll = rollElite(opts.rng);
    affixes.push(...roll.affixes);
    speedMult = roll.speedMult;
    maxHp *= roll.hpMult;
  }

  const moveSpeed = def.moveSpeed * speedMult;
  const color = opts.elite && affixes.length ? ELITE_AFFIXES[affixes[0]].color : def.color;

  world.store<Position>(C.Position).set(e, { x, y, prevX: x, prevY: y });
  world.store<Movement>(C.Movement).set(e, { path: [], speed: moveSpeed, moving: false });
  world.store<Facing>(C.Facing).set(e, { dir: 2, state: 'idle', animTime: 0 });

  const container = createPlaceholderSprite(color);
  container.scale.set(def.size);
  layer.addChild(container);
  world.store<SpriteRef>(C.Sprite).set(e, { container, color });

  world.store<Stats>(CC.Stats).set(e, {
    core: def.core,
    derived: { ...derived, attackSpeed: derived.attackSpeed * speedMult },
    level,
    weaponBase: def.weaponBase,
  });
  world.store<Health>(CC.Health).set(e, {
    hp: maxHp,
    maxHp,
    invuln: 0,
    dead: false,
  });
  world.store<Faction>(CC.Faction).set(e, { id: 'enemy' });
  world.store<Attacker>(CC.Attacker).set(e, {
    range: def.attackRange,
    cooldown: 0,
    baseCooldown: def.attackInterval,
    skillCoeff: 0,
    target: -1,
  });
  world.store<Ai>(AC.Ai).set(e, {
    state: 'idle',
    kind: def.kind,
    aggroRange: def.aggroRange,
    attackRange: def.attackRange,
    repathTimer: 0,
    target: -1,
    preferredRange: def.kind === 'ranged' || def.kind === 'summoner' ? def.attackRange * 0.8 : 0,
    chargeCd: 0,
    charging: false,
    chargeTargetX: 0,
    chargeTargetY: 0,
    chargeTimer: 0,
    summonCd: def.summonInterval ?? 0,
    summonCount: 0,
    rangedCd: 0,
  });

  if (opts.elite && affixes.length) {
    world.store<Elite>(AC.Elite).set(e, { affixes });
    const shieldAffix = affixes.find((a) => ELITE_AFFIXES[a].shieldRatio);
    if (shieldAffix) {
      const ratio = ELITE_AFFIXES[shieldAffix].shieldRatio!;
      const amt = maxHp * ratio;
      world.store<Shield>(AC.Shield).set(e, { amount: amt, max: amt });
    }
  }

  if (def.isBoss) {
    world.store<Boss>(AC.Boss).set(e, {
      phase: 1,
      telegraphTimer: 0,
      telegraphType: 'none',
      patternCd: 3,
    });
  }

  // 경험치 보상 (엘리트/보스 가중)
  const xpMult = def.isBoss ? 1 : opts.elite ? 2.5 : 1;
  world.store<number>(CC.XpReward).set(e, Math.round(def.xp * xpMult));

  return e;
}
