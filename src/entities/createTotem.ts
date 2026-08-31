/**
 * 소환물(토템) 팩토리.
 * 고정 위치에서 주변 적을 자동 공격하는 아군 엔티티.
 * 지속시간이 지나면 Corpse로 제거된다.
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
  type Corpse,
} from '@/entities/combatComponents';
import { createPlaceholderSprite } from '@/render/Animator';
import { computeDerived, baseStats } from '@/systems/combat/stats';
import type { SkillDef } from '@/data/skills';

export function createTotem(
  world: World,
  layer: Container,
  def: SkillDef,
  x: number,
  y: number,
  ownerLevel: number,
): Entity {
  const e = world.createEntity();
  world.store<Position>(C.Position).set(e, { x, y, prevX: x, prevY: y });
  // 이동 없음(고정) — path 비움
  world.store<Movement>(C.Movement).set(e, { path: [], speed: 0, moving: false });
  world.store<Facing>(C.Facing).set(e, { dir: 2, state: 'idle', animTime: 0 });

  const container = createPlaceholderSprite(def.color);
  layer.addChild(container);
  world.store<SpriteRef>(C.Sprite).set(e, { container, color: def.color });

  const core = baseStats();
  const derived = computeDerived(core, ownerLevel);
  world.store<Stats>(CC.Stats).set(e, { core, derived, level: ownerLevel, weaponBase: 8 });
  world.store<Health>(CC.Health).set(e, { hp: 1, maxHp: 1, invuln: 9999, dead: false });
  world.store<Faction>(CC.Faction).set(e, { id: 'player' });
  world.store<Attacker>(CC.Attacker).set(e, {
    range: def.range,
    cooldown: 0,
    baseCooldown: 0.7,
    skillCoeff: def.skillCoeff,
    target: -1,
  });
  // 지속시간 후 제거
  world.store<Corpse>(CC.Corpse).set(e, { timer: def.summonDuration ?? 8 });
  return e;
}
