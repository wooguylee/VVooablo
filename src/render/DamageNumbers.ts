/**
 * 데미지 숫자 표시 (오브젝트 풀링).
 * 피격 시 화면에 뜨는 숫자를 풀에서 재사용해 프레임당 할당을 줄인다.
 */
import { Container, Text, TextStyle } from 'pixi.js';
import { worldToScreen } from '@/render/iso';
import type { DamageType } from '@/systems/combat/damage';

interface FloatingNumber {
  text: Text;
  active: boolean;
  life: number;
  maxLife: number;
  wx: number;
  wy: number;
  vy: number;
}

const TYPE_COLOR: Record<DamageType, number> = {
  physical: 0xffffff,
  fire: 0xff6633,
  cold: 0x66ccff,
  lightning: 0xffee66,
};

export class DamageNumbers {
  private layer: Container;
  private pool: FloatingNumber[] = [];

  constructor(parent: Container) {
    this.layer = new Container();
    parent.addChild(this.layer);
  }

  private acquire(): FloatingNumber {
    for (const n of this.pool) {
      if (!n.active) return n;
    }
    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 2 },
    });
    const text = new Text({ text: '', style });
    text.anchor.set(0.5);
    text.visible = false;
    this.layer.addChild(text);
    const n: FloatingNumber = {
      text,
      active: false,
      life: 0,
      maxLife: 0.8,
      wx: 0,
      wy: 0,
      vy: 0,
    };
    this.pool.push(n);
    return n;
  }

  /** wx,wy: 월드(타일) 좌표 */
  spawn(wx: number, wy: number, amount: number, type: DamageType, isCrit: boolean): void {
    const n = this.acquire();
    n.active = true;
    n.life = 0;
    n.maxLife = isCrit ? 1.0 : 0.75;
    n.wx = wx;
    n.wy = wy;
    n.vy = -20;
    n.text.text = isCrit ? `${amount}!` : `${amount}`;
    n.text.style.fill = TYPE_COLOR[type];
    n.text.style.fontSize = isCrit ? 14 : 10;
    n.text.visible = true;
    n.text.alpha = 1;
  }

  /** 고정 스텝 업데이트 */
  update(dt: number): void {
    for (const n of this.pool) {
      if (!n.active) continue;
      n.life += dt;
      if (n.life >= n.maxLife) {
        n.active = false;
        n.text.visible = false;
        continue;
      }
      n.wy -= dt * 1.2; // 위로 떠오름 (타일 단위)
    }
  }

  /** 렌더 시 화면 좌표 반영 */
  render(): void {
    for (const n of this.pool) {
      if (!n.active) continue;
      const s = worldToScreen(n.wx + 0.5, n.wy + 0.5);
      n.text.position.set(Math.round(s.x), Math.round(s.y - 14));
      n.text.alpha = 1 - n.life / n.maxLife;
    }
  }
}
