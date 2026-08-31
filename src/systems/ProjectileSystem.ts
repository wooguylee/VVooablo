/**
 * 투사체 시스템 (오브젝트 풀링).
 *
 * 투사체는 ECS 밖의 전용 풀에서 관리해 프레임당 할당을 없앤다.
 * 이동/사거리 소진/충돌 판정 후 데미지를 적용한다.
 */
import { Container, Graphics } from 'pixi.js';
import type { World } from '@/core/ecs';
import type { Rng } from '@/core/Rng';
import { worldToScreen } from '@/render/iso';
import { C, type Position } from '@/entities/components';
import { CC, type Health, type Stats, type Faction } from '@/entities/combatComponents';
import type { Projectile } from '@/entities/projectileComponents';
import { computeDamage, type DamageResult } from '@/systems/combat/damage';
import { applyDamageToEntity } from '@/systems/combat/applyDamage';
import { applyStatus, vulnerabilityMultiplier } from '@/systems/status/statusSystem';

export interface ProjectileHitCallbacks {
  onHit: (x: number, y: number, r: DamageResult) => void;
  onKill: (entity: number) => void;
}

export class ProjectileSystem {
  private pool: Projectile[] = [];
  private gfxPool: Graphics[] = [];
  private layer: Container;
  activeCount = 0;

  constructor(parent: Container) {
    this.layer = new Container();
    parent.addChild(this.layer);
  }

  reset(): void {
    for (const p of this.pool) p.alive = false;
    for (const g of this.gfxPool) g.visible = false;
    this.activeCount = 0;
  }

  spawn(init: Omit<Projectile, 'prevX' | 'prevY' | 'alive'>): void {
    let p = this.pool.find((x) => !x.alive);
    if (!p) {
      p = { ...init, prevX: init.x, prevY: init.y, alive: true } as Projectile;
      this.pool.push(p);
    } else {
      Object.assign(p, init, { prevX: init.x, prevY: init.y, alive: true });
    }
  }

  update(
    world: World,
    dt: number,
    rng: Rng,
    cb: ProjectileHitCallbacks,
  ): void {
    const positions = world.store<Position>(C.Position);
    const healths = world.store<Health>(CC.Health);
    const stats = world.store<Stats>(CC.Stats);
    const factions = world.store<Faction>(CC.Faction);

    this.activeCount = 0;
    for (const p of this.pool) {
      if (!p.alive) continue;
      this.activeCount++;

      p.prevX = p.x;
      p.prevY = p.y;
      const step = Math.hypot(p.vx, p.vy) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rangeLeft -= step;
      if (p.rangeLeft <= 0) {
        p.alive = false;
        continue;
      }

      // 충돌 판정 (반대 진영 대상)
      for (const [entity, pos] of positions.entries()) {
        const fac = factions.get(entity);
        if (!fac || fac.id === p.faction) continue;
        const h = healths.get(entity);
        if (!h || h.dead) continue;
        const dx = pos.x - p.x;
        const dy = pos.y - p.y;
        if (dx * dx + dy * dy > p.radius * p.radius) continue;

        // 명중
        const tStats = stats.get(entity);
        const armor = tStats?.derived.armor ?? 0;
        const resistance = tStats?.derived.resistance ?? 0;
        const result = computeDamage(
          {
            weaponBase: p.weaponBase,
            skillCoeff: p.skillCoeff,
            increasedDamage: 0,
            critChance: 0.05,
            critDamage: 1.5,
            attackerLevel: p.ownerLevel,
            type: p.damageType,
          },
          { armor, resistance },
          rng,
        );
        const vuln = vulnerabilityMultiplier(world, entity);
        result.amount = Math.max(1, Math.round(result.amount * vuln));
        applyDamageToEntity(world, entity, result.amount);
        cb.onHit(pos.x, pos.y, result);
        if (p.applyStatus) {
          applyStatus(world, entity, p.applyStatus.type, p.applyStatus.duration, p.applyStatus.magnitude);
        }
        if (h.hp <= 0 && !h.dead) {
          h.hp = 0;
          h.dead = true;
          cb.onKill(entity);
        }
        p.alive = false;
        break;
      }
    }
  }

  render(alpha: number): void {
    let gi = 0;
    for (const p of this.pool) {
      if (!p.alive) continue;
      let g = this.gfxPool[gi];
      if (!g) {
        g = new Graphics();
        this.layer.addChild(g);
        this.gfxPool[gi] = g;
      }
      const ix = p.prevX + (p.x - p.prevX) * alpha;
      const iy = p.prevY + (p.y - p.prevY) * alpha;
      const s = worldToScreen(ix + 0.5, iy + 0.5);
      g.clear();
      g.circle(0, 0, 3);
      g.fill({ color: p.color });
      g.circle(0, 0, 5);
      g.stroke({ color: p.color, width: 1, alpha: 0.4 });
      g.position.set(Math.round(s.x), Math.round(s.y));
      g.visible = true;
      gi++;
    }
    // 남은 그래픽 숨김
    for (; gi < this.gfxPool.length; gi++) this.gfxPool[gi].visible = false;
  }
}
