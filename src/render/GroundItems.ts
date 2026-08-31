/**
 * 지면 아이템 관리 + 렌더.
 * 드롭된 아이템/골드를 월드에 표시하고, 플레이어가 근처에 오면 자동 획득.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { worldToScreen, depthKey } from '@/render/iso';
import type { ItemInstance } from '@/data/itemTypes';
import { RARITY_NAME } from '@/data/itemTypes';

interface GroundItem {
  item: ItemInstance | null;
  gold: number;
  x: number;
  y: number;
  gfx: Graphics;
  label: Text;
}

const PICKUP_RANGE = 1.2;

export class GroundItems {
  private layer: Container;
  private items: GroundItem[] = [];

  constructor(parent: Container) {
    this.layer = new Container();
    this.layer.sortableChildren = true;
    parent.addChild(this.layer);
  }

  clear(): void {
    for (const g of this.items) {
      g.gfx.destroy();
      g.label.destroy();
    }
    this.items.length = 0;
  }

  dropItem(item: ItemInstance, x: number, y: number): void {
    const gfx = new Graphics();
    const s = worldToScreen(x + 0.5, y + 0.5);
    gfx.circle(0, 0, 4);
    gfx.fill({ color: item.color });
    gfx.stroke({ color: 0x000000, width: 1 });
    gfx.position.set(Math.round(s.x), Math.round(s.y));
    gfx.zIndex = depthKey(x, y, 0);
    this.layer.addChild(gfx);

    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 9,
      fill: item.color,
      stroke: { color: 0x000000, width: 2 },
    });
    const label = new Text({ text: item.name, style });
    label.anchor.set(0.5, 1);
    label.position.set(Math.round(s.x), Math.round(s.y) - 6);
    label.zIndex = depthKey(x, y, 2);
    this.layer.addChild(label);

    this.items.push({ item, gold: 0, x, y, gfx, label });
  }

  dropGold(amount: number, x: number, y: number): void {
    const gfx = new Graphics();
    const s = worldToScreen(x + 0.5, y + 0.5);
    gfx.circle(0, 0, 3);
    gfx.fill({ color: 0xffd700 });
    gfx.position.set(Math.round(s.x), Math.round(s.y));
    gfx.zIndex = depthKey(x, y, 0);
    this.layer.addChild(gfx);

    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 8,
      fill: 0xffd700,
      stroke: { color: 0x000000, width: 2 },
    });
    const label = new Text({ text: `${amount} G`, style });
    label.anchor.set(0.5, 1);
    label.position.set(Math.round(s.x), Math.round(s.y) - 5);
    this.layer.addChild(label);

    this.items.push({ item: null, gold: amount, x, y, gfx, label });
  }

  /**
   * 플레이어 근처 아이템 자동 획득.
   * @returns 획득한 아이템/골드
   */
  tryPickup(px: number, py: number): { items: ItemInstance[]; gold: number } {
    const picked: ItemInstance[] = [];
    let gold = 0;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const g = this.items[i];
      const d = Math.hypot(g.x - px, g.y - py);
      if (d <= PICKUP_RANGE) {
        if (g.item) picked.push(g.item);
        gold += g.gold;
        g.gfx.destroy();
        g.label.destroy();
        this.items.splice(i, 1);
      }
    }
    return { items: picked, gold };
  }

  get count(): number {
    return this.items.length;
  }
}

/** 등급 표시 헬퍼 (툴팁 등에서 재사용) */
export function rarityLabel(item: ItemInstance): string {
  return RARITY_NAME[item.rarity];
}
