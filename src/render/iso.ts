import { Config } from '@/core/Config';

/**
 * 아이소메트릭 좌표 변환.
 *
 * 월드 좌표(wx, wy)는 타일 격자 단위(부동소수 허용).
 * 화면 좌표(sx, sy)는 내부 렌더 픽셀 단위.
 *
 * 2:1 다이아몬드 투영:
 *   sx = (wx - wy) * (tileWidth / 2)
 *   sy = (wx + wy) * (tileHeight / 2)
 *
 * 역변환은 위 선형계를 역산한다:
 *   wx = (sx / (tw/2) + sy / (th/2)) / 2
 *   wy = (sy / (th/2) - sx / (tw/2)) / 2
 */

export interface Vec2 {
  x: number;
  y: number;
}

const HALF_W = Config.tileWidth / 2;
const HALF_H = Config.tileHeight / 2;

/** 월드(타일) → 화면(픽셀) */
export function worldToScreen(wx: number, wy: number): Vec2 {
  return {
    x: (wx - wy) * HALF_W,
    y: (wx + wy) * HALF_H,
  };
}

/** 화면(픽셀) → 월드(타일, 부동소수) */
export function screenToWorld(sx: number, sy: number): Vec2 {
  const a = sx / HALF_W; // = wx - wy
  const b = sy / HALF_H; // = wx + wy
  return {
    x: (a + b) / 2,
    y: (b - a) / 2,
  };
}

/** 화면 좌표를 포함하는 타일 격자 좌표(정수) */
export function screenToTile(sx: number, sy: number): Vec2 {
  const w = screenToWorld(sx, sy);
  return { x: Math.floor(w.x), y: Math.floor(w.y) };
}

/** 깊이 정렬 키. (x+y)가 클수록 앞(아래)에 그려진다. */
export function depthKey(wx: number, wy: number, layer = 0): number {
  return (wx + wy) * 16 + layer;
}
