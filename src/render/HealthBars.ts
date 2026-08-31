/**
 * 엔티티 체력바 렌더러.
 * 살아있고 피해를 입은 엔티티 위에 작은 바를 그린다.
 */
import { Container, Graphics } from 'pixi.js';
import type { World, Entity } from '@/core/ecs';
import { C, type Position } from '@/entities/components';
import { CC, type Health, type Faction } from '@/entities/combatComponents';
import { worldToScreen } from '@/render/iso';

export class HealthBars {
  private gfx: Graphics;

  constructor(parent: Container) {
    this.gfx = new Graphics();
    parent.addChild(this.gfx);
  }

  render(world: World, player: Entity): void {
    const g = this.gfx;
    g.clear();
    const positions = world.store<Position>(C.Position);
    const healths = world.store<Health>(CC.Health);
    const factions = world.store<Faction>(CC.Faction);

    for (const [entity, h] of healths.entries()) {
      if (h.dead) continue;
      if (h.hp >= h.maxHp && entity !== player) continue; // 만피 적은 숨김
      const pos = positions.get(entity);
      if (!pos) continue;
      const fac = factions.get(entity);
      const s = worldToScreen(pos.x + 0.5, pos.y + 0.5);
      const w = 16;
      const x = Math.round(s.x - w / 2);
      const y = Math.round(s.y - 22);
      const ratio = Math.max(0, h.hp / h.maxHp);
      // 배경
      g.rect(x, y, w, 3);
      g.fill({ color: 0x000000, alpha: 0.7 });
      // 채움
      const color = fac?.id === 'player' ? 0x33cc55 : 0xcc3333;
      g.rect(x, y, Math.round(w * ratio), 3);
      g.fill({ color });
    }
  }
}
