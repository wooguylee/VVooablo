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

export interface PlayerConfig {
  x: number;
  y: number;
  speed?: number;
  color?: number;
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

  return entity;
}
