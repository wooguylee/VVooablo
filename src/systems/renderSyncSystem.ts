/**
 * 렌더 동기화 시스템.
 * ECS 위치를 화면 좌표로 변환하여 Pixi 스프라이트에 반영.
 * - 렌더 보간(alpha)으로 부드러운 이동
 * - (x+y) 기반 y-sort (zIndex)
 * - 애니메이션 갱신
 */
import type { World } from '@/core/ecs';
import { C, type Position, type Facing, type SpriteRef } from '@/entities/components';
import { worldToScreen, depthKey } from '@/render/iso';
import { applyAnimation } from '@/render/Animator';

/** 애니메이션 시간 누적 (고정 스텝) */
export function animationTickSystem(world: World, dt: number): void {
  const facings = world.store<Facing>(C.Facing);
  for (const f of facings.values()) {
    f.animTime += dt;
  }
}

/** 렌더 시(가변 프레임) 호출. alpha는 보간 계수 [0,1). */
export function renderSyncSystem(world: World, alpha: number): void {
  const positions = world.store<Position>(C.Position);
  const facings = world.store<Facing>(C.Facing);
  const sprites = world.store<SpriteRef>(C.Sprite);

  for (const [entity, spr] of sprites.entries()) {
    const pos = positions.get(entity);
    if (!pos) continue;

    // 위치 보간
    const ix = pos.prevX + (pos.x - pos.prevX) * alpha;
    const iy = pos.prevY + (pos.y - pos.prevY) * alpha;
    const s = worldToScreen(ix + 0.5, iy + 0.5);
    // 타일 중심 정렬 + 픽셀 스냅
    const wrapper = spr.container;
    wrapper.position.set(Math.round(s.x), Math.round(s.y));
    wrapper.zIndex = depthKey(ix, iy, 1);

    const facing = facings.get(entity);
    if (facing) {
      applyAnimation(wrapper, facing, spr.color);
    }
  }
}
