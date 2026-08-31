/**
 * 이동 시스템: A* 경로를 따라 엔티티를 타일 단위로 이동시킨다.
 * 고정 타임스텝에서 호출된다. 방향/애니메이션 상태도 갱신.
 */
import type { World, Entity, ComponentStore } from '@/core/ecs';
import { C, type Position, type Movement, type Facing } from '@/entities/components';
import { dirFromWorldDelta } from '@/systems/direction';

export function movementSystem(world: World, dt: number): void {
  const positions = world.store<Position>(C.Position);
  const movements = world.store<Movement>(C.Movement);
  const facings = world.store<Facing>(C.Facing);

  for (const [entity, mv] of movements.entries()) {
    const pos = positions.get(entity);
    if (!pos) continue;

    // 렌더 보간용 직전 위치 저장
    pos.prevX = pos.x;
    pos.prevY = pos.y;

    if (mv.path.length === 0) {
      if (mv.moving) {
        mv.moving = false;
        setState(facings, entity, 'idle');
      }
      continue;
    }

    mv.moving = true;
    setState(facings, entity, 'walk');

    let remaining = mv.speed * dt;
    while (remaining > 0 && mv.path.length > 0) {
      const target = mv.path[0];
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const dist = Math.hypot(dx, dy);

      // 방향 갱신
      const facing = facings.get(entity);
      if (facing && dist > 1e-4) {
        facing.dir = dirFromWorldDelta(dx, dy);
      }

      if (dist <= remaining) {
        // 웨이포인트 도달
        pos.x = target.x;
        pos.y = target.y;
        remaining -= dist;
        mv.path.shift();
      } else {
        pos.x += (dx / dist) * remaining;
        pos.y += (dy / dist) * remaining;
        remaining = 0;
      }
    }

    if (mv.path.length === 0) {
      mv.moving = false;
      setState(facings, entity, 'idle');
    }
  }
}

function setState(
  facings: ComponentStore<Facing>,
  entity: Entity,
  state: Facing['state'],
): void {
  const f = facings.get(entity);
  if (f && f.state !== state) {
    f.state = state;
    f.animTime = 0;
  }
}
