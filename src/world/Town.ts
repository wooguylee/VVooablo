/**
 * 마을 허브 생성.
 * 안전 지대(몬스터 없음): 상인/포탈/스탯리셋 지점을 가진 개방형 방.
 * 던전(depth>=1)으로 가는 포탈이 출구 역할을 한다.
 */
import { TileMap, TileType } from '@/world/TileMap';
import type { Dungeon } from '@/world/dungeon/common';

export interface TownFeatures {
  spawn: { x: number; y: number };
  merchant: { x: number; y: number };
  statReset: { x: number; y: number };
  portal: { x: number; y: number };
}

export interface Town {
  dungeon: Dungeon;
  features: TownFeatures;
}

export function generateTown(seed: number, cols = 24, rows = 24): Town {
  const map = new TileMap(cols, rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const border = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
      map.set(x, y, border ? TileType.Wall : TileType.Floor);
    }
  }
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);

  const features: TownFeatures = {
    spawn: { x: cx, y: cy },
    merchant: { x: cx - 5, y: cy - 3 },
    statReset: { x: cx + 5, y: cy - 3 },
    portal: { x: cx, y: cy + 5 },
  };

  const dungeon: Dungeon = {
    map,
    seed,
    kind: 'rooms',
    features: {
      entrance: features.spawn,
      exit: features.portal,
      bossRoom: features.portal,
      treasureRoom: features.merchant,
    },
  };
  return { dungeon, features };
}
