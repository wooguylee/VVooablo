import { describe, it, expect } from 'vitest';
import { World } from '@/core/ecs';

describe('ECS World', () => {
  it('엔티티 생성/파괴 및 ID 재사용', () => {
    const w = new World();
    const a = w.createEntity();
    const b = w.createEntity();
    expect(a).not.toBe(b);
    expect(w.entityCount).toBe(2);
    w.destroyEntity(a);
    expect(w.entityCount).toBe(1);
    expect(w.isAlive(a)).toBe(false);
    const c = w.createEntity(); // free list에서 재사용
    expect(c).toBe(a);
  });

  it('컴포넌트 스토어 set/get/remove', () => {
    const w = new World();
    const e = w.createEntity();
    const store = w.store<{ hp: number }>('Health');
    store.set(e, { hp: 100 });
    expect(store.get(e)?.hp).toBe(100);
    expect(store.has(e)).toBe(true);
    store.remove(e);
    expect(store.has(e)).toBe(false);
  });

  it('엔티티 파괴 시 모든 컴포넌트 제거', () => {
    const w = new World();
    const e = w.createEntity();
    w.store<number>('A').set(e, 1);
    w.store<string>('B').set(e, 'x');
    w.destroyEntity(e);
    expect(w.store<number>('A').has(e)).toBe(false);
    expect(w.store<string>('B').has(e)).toBe(false);
  });
});
