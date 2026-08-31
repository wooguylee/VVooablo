import { describe, it, expect } from 'vitest';
import { worldToScreen, screenToWorld, screenToTile, depthKey } from '@/render/iso';

describe('iso 좌표 변환', () => {
  it('worldToScreen 원점은 (0,0)', () => {
    const s = worldToScreen(0, 0);
    expect(s.x).toBe(0);
    expect(s.y).toBe(0);
  });

  it('왕복 변환 정확성 (world → screen → world)', () => {
    const cases = [
      [0, 0],
      [1, 0],
      [0, 1],
      [5, 3],
      [12.5, 7.25],
      [-4, -9],
      [100, 100],
    ];
    for (const [wx, wy] of cases) {
      const s = worldToScreen(wx, wy);
      const w = screenToWorld(s.x, s.y);
      expect(w.x).toBeCloseTo(wx, 6);
      expect(w.y).toBeCloseTo(wy, 6);
    }
  });

  it('왕복 변환 정확성 (screen → world → screen)', () => {
    const cases = [
      [0, 0],
      [16, 8],
      [-32, 40],
      [123, -77],
    ];
    for (const [sx, sy] of cases) {
      const w = screenToWorld(sx, sy);
      const s = worldToScreen(w.x, w.y);
      expect(s.x).toBeCloseTo(sx, 6);
      expect(s.y).toBeCloseTo(sy, 6);
    }
  });

  it('screenToTile 은 타일 중심에서 올바른 격자 반환', () => {
    // 타일 (3,2) 중심의 화면 좌표
    const s = worldToScreen(3.5, 2.5);
    const t = screenToTile(s.x, s.y);
    expect(t).toEqual({ x: 3, y: 2 });
  });

  it('depthKey 는 (x+y)가 클수록 커진다', () => {
    expect(depthKey(1, 1)).toBeLessThan(depthKey(2, 2));
    expect(depthKey(0, 0, 1)).toBeGreaterThan(depthKey(0, 0, 0));
  });
});
