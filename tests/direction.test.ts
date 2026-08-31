import { describe, it, expect } from 'vitest';
import { dirFromWorldDelta } from '@/systems/direction';

describe('8방향 계산', () => {
  it('정지는 기본 남향(2)', () => {
    expect(dirFromWorldDelta(0, 0)).toBe(2);
  });

  it('월드 +x 이동은 화면상 남동(SE) 방향', () => {
    // 월드 +x → 화면 (dx-dy, dx+dy) = (1,1) → 남동
    const d = dirFromWorldDelta(1, 0);
    expect(d).toBe(1); // SE
  });

  it('월드 +y 이동은 화면상 남서(SW) 방향', () => {
    // (dx-dy, dx+dy) = (-1, 1) → 남서
    expect(dirFromWorldDelta(0, 1)).toBe(3); // SW
  });

  it('월드 +x+y 이동은 화면상 남(S) 방향', () => {
    // (0, 2) → 남
    expect(dirFromWorldDelta(1, 1)).toBe(2); // S
  });

  it('월드 -x-y 이동은 화면상 북(N) 방향', () => {
    expect(dirFromWorldDelta(-1, -1)).toBe(6); // N
  });

  it('반환값은 항상 0..7 범위', () => {
    for (let a = 0; a < 360; a += 7) {
      const r = (a * Math.PI) / 180;
      const d = dirFromWorldDelta(Math.cos(r), Math.sin(r));
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThan(8);
    }
  });
});
