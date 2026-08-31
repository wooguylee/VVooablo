/**
 * 파티클 시스템 (오브젝트 풀링, 가산 블렌딩).
 * 스킬 이펙트 발광용. 원형 파티클을 풀에서 재사용한다.
 */
import { Container, Graphics } from 'pixi.js';
import { worldToScreen } from '@/render/iso';

interface Particle {
  wx: number;
  wy: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  active: boolean;
  gfx: Graphics;
}

export class ParticleSystem {
  private pool: Particle[] = [];
  private layer: Container;
  activeCount = 0;

  constructor(parent: Container) {
    this.layer = new Container();
    this.layer.blendMode = 'add';
    parent.addChild(this.layer);
  }

  reset(): void {
    for (const p of this.pool) {
      p.active = false;
      p.gfx.visible = false;
    }
  }

  private acquire(): Particle {
    for (const p of this.pool) if (!p.active) return p;
    const gfx = new Graphics();
    this.layer.addChild(gfx);
    const p: Particle = {
      wx: 0,
      wy: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.5,
      size: 3,
      color: 0xffffff,
      active: false,
      gfx,
    };
    this.pool.push(p);
    return p;
  }

  /** 폭발형 방출 (count개 파티클을 방사) */
  burst(wx: number, wy: number, color: number, count: number, speed = 2, life = 0.5): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      const angle = (i / count) * Math.PI * 2;
      const spd = speed * (0.5 + Math.random() * 0.5);
      p.wx = wx;
      p.wy = wy;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.life = 0;
      p.maxLife = life;
      p.size = 2 + Math.random() * 3;
      p.color = color;
      p.active = true;
      p.gfx.visible = true;
    }
  }

  update(dt: number): void {
    this.activeCount = 0;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.gfx.visible = false;
        continue;
      }
      p.wx += p.vx * dt;
      p.wy += p.vy * dt;
      this.activeCount++;
    }
  }

  render(): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      const s = worldToScreen(p.wx + 0.5, p.wy + 0.5);
      p.gfx.clear();
      p.gfx.circle(0, 0, p.size * (1 - t * 0.5));
      p.gfx.fill({ color: p.color, alpha: 1 - t });
      p.gfx.position.set(Math.round(s.x), Math.round(s.y));
    }
  }
}
