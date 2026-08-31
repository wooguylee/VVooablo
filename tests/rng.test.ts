import { describe, it, expect } from 'vitest';
import { Rng } from '@/core/Rng';

describe('Rng (mulberry32)', () => {
  it('같은 시드는 같은 수열을 낸다 (결정성)', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('다른 시드는 다른 수열을 낸다', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('next 는 [0,1) 범위', () => {
    const r = new Rng(999);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int 는 양끝 포함 정수', () => {
    const r = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 8);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(8);
    }
  });

  it('getState/setState 로 상태 복원 가능', () => {
    const r = new Rng(42);
    for (let i = 0; i < 10; i++) r.next();
    const state = r.getState();
    const before = r.next();
    r.setState(state);
    expect(r.next()).toBe(before);
  });

  it('seedFromString 은 결정적', () => {
    expect(Rng.seedFromString('hello')).toBe(Rng.seedFromString('hello'));
    expect(Rng.seedFromString('a')).not.toBe(Rng.seedFromString('b'));
  });
});
