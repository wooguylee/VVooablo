/**
 * 특수 지점(계단/보물/보스) 마커 렌더러.
 * 타일 위에 색상 마름모/아이콘을 그린다.
 */
import { Container, Graphics } from 'pixi.js';
import { worldToScreen } from '@/render/iso';
import { Config } from '@/core/Config';
import type { DungeonFeatures } from '@/world/dungeon/common';

export class FeatureMarkers {
  private gfx: Graphics;

  constructor(parent: Container) {
    this.gfx = new Graphics();
    parent.addChild(this.gfx);
  }

  draw(features: DungeonFeatures): void {
    const g = this.gfx;
    g.clear();
    this.marker(features.entrance.x, features.entrance.y, 0x33cc66); // 입구 초록
    this.marker(features.exit.x, features.exit.y, 0xcc3333); // 출구 빨강
    if (features.treasureRoom) this.marker(features.treasureRoom.x, features.treasureRoom.y, 0xffcc33);
  }

  private marker(tx: number, ty: number, color: number): void {
    const s = worldToScreen(tx + 0.5, ty + 0.5);
    const hw = Config.tileWidth / 2 - 2;
    const hh = Config.tileHeight / 2 - 2;
    this.gfx.poly([s.x, s.y - hh, s.x + hw, s.y, s.x, s.y + hh, s.x - hw, s.y]);
    this.gfx.fill({ color, alpha: 0.5 });
    this.gfx.stroke({ color, width: 1 });
  }
}
