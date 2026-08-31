/**
 * 플레이어 엔티티 팩토리.
 * Phase 2: 위치/이동/방향/스프라이트 컴포넌트만.
 * 이후 Phase에서 스탯/전투 컴포넌트가 추가된다.
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
import { createPlaceholderSprite } from '@/render/Animator';
import {
  CC,
  type Health,
  type Stats,
  type Faction,
  type Attacker,
} from '@/entities/combatComponents';
import { SC, createSkillUser } from '@/entities/skillComponents';
import { DEFAULT_SKILL_SLOTS } from '@/data/skills';
import { IC } from '@/systems/items/equipment';
import { recalcStats } from '@/systems/items/equipment';
import type { PlayerProfile } from '@/entities/playerProfile';

export interface PlayerConfig {
  x: number;
  y: number;
  speed?: number;
  color?: number;
  /** 영속 프로필 (스탯/장비/인벤). 없으면 기본값. */
  profile?: PlayerProfile;
  /** 생명력 유지 비율 (부활/전환 시). 미지정 시 풀피 */
  hpRatio?: number;
}

export function createPlayer(world: World, layer: Container, cfg: PlayerConfig): Entity {
  const entity = world.createEntity();
  const color = cfg.color ?? 0x66ccff;

  world.store<Position>(C.Position).set(entity, {
    x: cfg.x,
    y: cfg.y,
    prevX: cfg.x,
    prevY: cfg.y,
  });
  world.store<Movement>(C.Movement).set(entity, {
    path: [],
    speed: cfg.speed ?? 4,
    moving: false,
  });
  world.store<Facing>(C.Facing).set(entity, {
    dir: 2,
    state: 'idle',
    animTime: 0,
  });

  const container = createPlaceholderSprite(color);
  layer.addChild(container);
  world.store<SpriteRef>(C.Sprite).set(entity, { container, color });
  world.store<boolean>(C.PlayerControlled).set(entity, true);

  // 프로필 기반 스탯 재계산
  const profile = cfg.profile;
  const level = profile?.level ?? 1;
  const baseCore = profile?.baseCore ?? { str: 10, dex: 10, int: 10, vit: 10 };
  const baseWeaponDamage = profile?.baseWeaponDamage ?? 12;
  const equipment = profile?.equipment ?? { slots: {} };

  const recalc = recalcStats(baseCore, equipment, level, baseWeaponDamage);
  world.store<Stats>(CC.Stats).set(entity, {
    core: recalc.core,
    derived: recalc.derived,
    level,
    weaponBase: recalc.weaponBase,
    baseCore,
    baseWeaponDamage,
  });
  const hpRatio = cfg.hpRatio ?? 1;
  world.store<Health>(CC.Health).set(entity, {
    hp: recalc.derived.maxHp * hpRatio,
    maxHp: recalc.derived.maxHp,
    invuln: 0,
    dead: false,
  });
  world.store<Faction>(CC.Faction).set(entity, { id: 'player' });
  world.store<Attacker>(CC.Attacker).set(entity, {
    range: 1.4,
    cooldown: 0,
    baseCooldown: 0.6,
    skillCoeff: 0,
    target: -1,
  });

  world.store(SC.SkillUser).set(entity, createSkillUser([...DEFAULT_SKILL_SLOTS]));

  // 장비/인벤토리 컴포넌트 (프로필 참조 공유)
  if (profile) {
    world.store(IC.Equipment).set(entity, profile.equipment);
    world.store(IC.Inventory).set(entity, profile.inventory);
  }

  return entity;
}
