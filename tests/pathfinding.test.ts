import { describe, it, expect } from 'vitest';
import { findPath, smoothPath, lineOfSight } from '@/world/pathfinding';

/** 문자열 그리드로 walkable 함수 생성. '#'=벽, 그 외=바닥 */
function gridWalkable(rows: string[]) {
  return (x: number, y: number): boolean => {
    if (y < 0 || y >= rows.length) return false;
    const row = rows[y];
    if (x < 0 || x >= row.length) return false;
    return row[x] !== '#';
  };
}

describe('A* 경로탐색', () => {
  it('장애물 없는 직선 경로', () => {
    const w = gridWalkable(['.....', '.....', '.....']);
    const path = findPath({ x: 0, y: 0 }, { x: 4, y: 0 }, w);
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ x: 4, y: 0 });
  });

  it('시작=목표는 빈 경로', () => {
    const w = gridWalkable(['...']);
    expect(findPath({ x: 1, y: 0 }, { x: 1, y: 0 }, w)).toEqual([]);
  });

  it('도달 불가 목표는 빈 경로', () => {
    const w = gridWalkable(['.#.', '.#.', '.#.']);
    const path = findPath({ x: 0, y: 1 }, { x: 2, y: 1 }, w);
    expect(path).toEqual([]);
  });

  it('벽으로 막힌 목표 타일은 빈 경로', () => {
    const w = gridWalkable(['...', '.#.', '...']);
    expect(findPath({ x: 0, y: 0 }, { x: 1, y: 1 }, w)).toEqual([]);
  });

  it('우회 경로를 찾는다', () => {
    const w = gridWalkable([
      '......',
      '.####.',
      '.#...#',
      '.#.#.#',
      '.....#',
    ]);
    const path = findPath({ x: 0, y: 0 }, { x: 4, y: 2 }, w);
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ x: 4, y: 2 });
    // 경로상 모든 타일이 walkable
    for (const p of path) expect(w(p.x, p.y)).toBe(true);
  });

  it('코너 컷팅 방지 (대각선으로 벽 모서리 통과 불가)', () => {
    // (0,0)에서 (1,1)로 가려면 대각선이 필요하나 양옆이 벽
    const w = gridWalkable(['.#', '#.']);
    const path = findPath({ x: 0, y: 0 }, { x: 1, y: 1 }, w);
    expect(path).toEqual([]);
  });
});

describe('경로 스무딩', () => {
  it('빈 공간에서는 직선으로 병합', () => {
    const w = gridWalkable(['.....', '.....', '.....']);
    const raw = findPath({ x: 0, y: 0 }, { x: 4, y: 2 }, w);
    const smoothed = smoothPath({ x: 0, y: 0 }, raw, w);
    // 스무딩 후 목표 도달 유지
    expect(smoothed[smoothed.length - 1]).toEqual({ x: 4, y: 2 });
    // 스무딩은 노드 수를 줄인다
    expect(smoothed.length).toBeLessThanOrEqual(raw.length);
  });
});

describe('시선(line-of-sight)', () => {
  it('막힘 없는 직선은 통과', () => {
    const w = gridWalkable(['.....']);
    expect(lineOfSight({ x: 0, y: 0 }, { x: 4, y: 0 }, w)).toBe(true);
  });
  it('벽이 있으면 차단', () => {
    const w = gridWalkable(['..#..']);
    expect(lineOfSight({ x: 0, y: 0 }, { x: 4, y: 0 }, w)).toBe(false);
  });
});
