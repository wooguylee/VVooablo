/**
 * 몬스터 엔티티 팩토리.
 * 위치/이동/방향/스프라이트 + 전투(Health/Stats/Faction/Attacker) + AI 컴포넌트 구성.
 */
import type { Container } from 'pixi.js';
import type { World, Entity } from '@/core/ecs';
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
import { AC, type Ai } from '@/entities/aiComponents';
import { createPlaceholderSprite } from '@/render/Animator';
import { computeDerived } from '@/systems/combat/stats';
import type { MonsterDef } from '@/data/monsters';

export function createMonster(
  world: World,
  layer: Container,
  def: MonsterDef,
  x: number,
  y: number,
  level: number,
): Entity {
  const e = world.createEntity();

  world.store<Position>(C.Position).set(e, { x, y, prevX: x, prevY: y });
  world.store<Movement>(C.Movement).set(e, { path: [], speed: def.moveSpeed, moving: false });
  world.store<Facing>(C.Facing).set(e, { dir: 2, state: 'idle', animTime: 0 });

  const container = createPlaceholderSprite(def.color);
  layer.addChild(container);
  world.store<SpriteRef>(C.Sprite).set(e, { container, color: def.color });

  const derived = computeDerived(def.core, level);
  world.store<Stats>(CC.Stats).set(e, {
    core: def.core,
    derived,
    level,
    weaponBase: def.weaponBase,
  });
  world.store<Health>(CC.Health).set(e, {
    hp: derived.maxHp,
    maxHp: derived.maxHp,
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
    aggroRange: def.aggroRange,
    attackRange: def.attackRange,
    repathTimer: 0,
    target: -1,
  });

  return e;
}
