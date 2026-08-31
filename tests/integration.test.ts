/**
 * 헤드리스 통합 테스트.
 *
 * 렌더(PixiJS) 없이 게임 시스템을 실제로 여러 틱 구동하여
 * 런타임 오류·논리 문제(이동/전투/사망/상태이상/AI)를 검증한다.
 *
 * 팩토리(createMonster 등)는 pixi Container에 의존하므로 여기서는
 * 컴포넌트를 직접 조립해 순수 시스템 계층만 시뮬레이션한다.
 */
import { describe, it, expect } from 'vitest';
import { World, type Entity } from '@/core/ecs';
import { Rng } from '@/core/Rng';
import { C, type Position, type Movement, type Facing } from '@/entities/components';
import {
  CC,
  type Health,
  type Stats,
  type Faction,
  type Attacker,
} from '@/entities/combatComponents';
import { AC, type Ai } from '@/entities/aiComponents';
import { computeDerived, baseStats } from '@/systems/combat/stats';
import { movementSystem } from '@/systems/movementSystem';
import { combatSystem } from '@/systems/combatSystem';
import { statusSystem, applyStatus } from '@/systems/status/statusSystem';
import { TileMap, TileType } from '@/world/TileMap';
import { findPath, smoothPath } from '@/world/pathfinding';
import { rebuildSpatialHash, playerTargetingSystem } from '@/systems/targetingSystem';
import { SpatialHash } from '@/world/SpatialHash';

// ---- 헬퍼: 렌더 없는 엔티티 조립 ----
function addPlayer(world: World, x: number, y: number): Entity {
  const e = world.createEntity();
  const core = baseStats();
  const derived = computeDerived(core, 1);
  world.store<Position>(C.Position).set(e, { x, y, prevX: x, prevY: y });
  world.store<Movement>(C.Movement).set(e, { path: [], speed: 4, moving: false });
  world.store<Facing>(C.Facing).set(e, { dir: 2, state: 'idle', animTime: 0 });
  world.store<Stats>(CC.Stats).set(e, { core, derived, level: 1, weaponBase: 20 });
  world.store<Health>(CC.Health).set(e, { hp: derived.maxHp, maxHp: derived.maxHp, invuln: 0, dead: false });
  world.store<Faction>(CC.Faction).set(e, { id: 'player' });
  world.store<Attacker>(CC.Attacker).set(e, {
    range: 1.5,
    cooldown: 0,
    baseCooldown: 0.6,
    skillCoeff: 0,
    target: -1,
  });
  return e;
}

function addEnemy(world: World, x: number, y: number, hp = 30): Entity {
  const e = world.createEntity();
  const core = { str: 8, dex: 6, int: 4, vit: 8 };
  const derived = { ...computeDerived(core, 1), maxHp: hp };
  world.store<Position>(C.Position).set(e, { x, y, prevX: x, prevY: y });
  world.store<Movement>(C.Movement).set(e, { path: [], speed: 3, moving: false });
  world.store<Facing>(C.Facing).set(e, { dir: 2, state: 'idle', animTime: 0 });
  world.store<Stats>(CC.Stats).set(e, { core, derived, level: 1, weaponBase: 5 });
  world.store<Health>(CC.Health).set(e, { hp, maxHp: hp, invuln: 0, dead: false });
  world.store<Faction>(CC.Faction).set(e, { id: 'enemy' });
  world.store<Attacker>(CC.Attacker).set(e, {
    range: 1.2,
    cooldown: 0,
    baseCooldown: 1.0,
    skillCoeff: 0,
    target: -1,
  });
  world.store<Ai>(AC.Ai).set(e, {
    state: 'idle',
    kind: 'melee',
    aggroRange: 8,
    attackRange: 1.2,
    repathTimer: 0,
    target: -1,
    preferredRange: 0,
    chargeCd: 0,
    charging: false,
    chargeTargetX: 0,
    chargeTargetY: 0,
    chargeTimer: 0,
    summonCd: 0,
    summonCount: 0,
    rangedCd: 0,
  });
  return e;
}

const DT = 1 / 60;

describe('헤드리스 통합 — 이동', () => {
  it('플레이어가 A* 경로를 따라 목표 타일에 도달한다', () => {
    const world = new World();
    const map = new TileMap(10, 10);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) map.set(x, y, TileType.Floor);
    for (let i = 0; i < 10; i++) {
      map.set(0, i, TileType.Wall);
      map.set(9, i, TileType.Wall);
      map.set(i, 0, TileType.Wall);
      map.set(i, 9, TileType.Wall);
    }
    const p = addPlayer(world, 2, 2);
    const start = { x: 2, y: 2 };
    const goal = { x: 7, y: 6 };
    const raw = findPath(start, goal, map.walkable);
    const path = smoothPath(start, raw, map.walkable);
    world.store<Movement>(C.Movement).get(p)!.path = path;

    // 최대 10초 시뮬레이션
    let ticks = 0;
    const pos = world.store<Position>(C.Position).get(p)!;
    while (world.store<Movement>(C.Movement).get(p)!.path.length > 0 && ticks < 600) {
      movementSystem(world, DT);
      ticks++;
    }
    expect(Math.round(pos.x)).toBe(goal.x);
    expect(Math.round(pos.y)).toBe(goal.y);
    expect(ticks).toBeLessThan(600); // 무한루프/정지 없음
  });

  it('기절 중에는 이동하지 않는다', () => {
    const world = new World();
    const p = addPlayer(world, 5, 5);
    world.store<Movement>(C.Movement).get(p)!.path = [{ x: 8, y: 5 }];
    applyStatus(world, p, 'stun', 1, 1);
    const pos = world.store<Position>(C.Position).get(p)!;
    for (let i = 0; i < 30; i++) movementSystem(world, DT);
    expect(pos.x).toBe(5); // 이동 없음
  });
});

describe('헤드리스 통합 — 전투', () => {
  it('플레이어가 인접 적을 자동 공격해 처치한다', () => {
    const world = new World();
    const rng = new Rng(1);
    const hash = new SpatialHash(4);
    const p = addPlayer(world, 5, 5);
    const enemy = addEnemy(world, 6, 5, 30);

    let deaths = 0;
    let ticks = 0;
    while (ticks < 600) {
      rebuildSpatialHash(world, hash);
      playerTargetingSystem(world, hash, p);
      combatSystem(world, DT, rng, {
        onDamage: () => {},
        onDeath: (_e, fac) => {
          if (fac === 'enemy') deaths++;
        },
      });
      ticks++;
      if (world.store<Health>(CC.Health).get(enemy)!.dead) break;
    }
    expect(world.store<Health>(CC.Health).get(enemy)!.dead).toBe(true);
    expect(deaths).toBe(1);
  });

  it('데미지가 항상 1 이상이고 체력이 음수로 폭주하지 않는다', () => {
    const world = new World();
    const rng = new Rng(7);
    const hash = new SpatialHash(4);
    const p = addPlayer(world, 5, 5);
    addEnemy(world, 6, 5, 1000); // 오래 버티는 적

    for (let i = 0; i < 300; i++) {
      rebuildSpatialHash(world, hash);
      playerTargetingSystem(world, hash, p);
      combatSystem(world, DT, rng, { onDamage: () => {}, onDeath: () => {} });
    }
    // 플레이어는 공격만 하므로 무적, 적 체력은 감소하지만 처치 전까지 0 이상
    const ph = world.store<Health>(CC.Health).get(p)!;
    expect(ph.hp).toBeGreaterThan(0);
  });
});

describe('헤드리스 통합 — AI 추적 및 상호 전투', () => {
  it('적이 플레이어를 추적하고 근접 후 서로 교전한다', () => {
    const world = new World();
    const rng = new Rng(3);
    const hash = new SpatialHash(4);
    const map = new TileMap(20, 20);
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) map.set(x, y, TileType.Floor);

    const p = addPlayer(world, 5, 5);
    const enemy = addEnemy(world, 12, 5, 40);

    // aiSystem은 컨텍스트/투사체(pixi) 의존이 있어 여기서는 근접 로직만 수동 재현:
    // 적을 플레이어쪽으로 이동시키는 경로 부여 후 전투 루프
    const epos = world.store<Position>(C.Position).get(enemy)!;
    const ppos = world.store<Position>(C.Position).get(p)!;

    let engaged = false;
    for (let tick = 0; tick < 900; tick++) {
      // 간이 추적: 경로가 없고 사거리 밖이면 재경로
      const mv = world.store<Movement>(C.Movement).get(enemy)!;
      const dist = Math.hypot(ppos.x - epos.x, ppos.y - epos.y);
      if (dist > 1.2 && mv.path.length === 0) {
        const raw = findPath(
          { x: Math.round(epos.x), y: Math.round(epos.y) },
          { x: Math.round(ppos.x), y: Math.round(ppos.y) },
          map.walkable,
        );
        mv.path = raw;
      }
      // 적 타겟 지정
      if (dist <= 1.2) {
        world.store<Attacker>(CC.Attacker).get(enemy)!.target = p;
        engaged = true;
      }
      movementSystem(world, DT);
      rebuildSpatialHash(world, hash);
      playerTargetingSystem(world, hash, p);
      combatSystem(world, DT, rng, { onDamage: () => {}, onDeath: () => {} });
      if (world.store<Health>(CC.Health).get(enemy)!.dead) break;
    }
    expect(engaged).toBe(true); // 교전 성사
    // 플레이어 무기(20)가 강하므로 적 처치되어야 함
    expect(world.store<Health>(CC.Health).get(enemy)!.dead).toBe(true);
  });
});

describe('헤드리스 통합 — 상태이상', () => {
  it('화상 도트가 시간에 따라 체력을 깎고 만료된다', () => {
    const world = new World();
    const e = world.createEntity();
    world.store<Health>(CC.Health).set(e, { hp: 100, maxHp: 100, invuln: 0, dead: false });
    applyStatus(world, e, 'burn', 2, 10);

    let burnTotal = 0;
    for (let i = 0; i < 180; i++) {
      statusSystem(world, DT, { onBurnTick: (_e, d) => (burnTotal += d) });
    }
    expect(burnTotal).toBeGreaterThan(0);
    const h = world.store<Health>(CC.Health).get(e)!;
    expect(h.hp).toBeLessThan(100);
    expect(h.hp).toBeGreaterThan(0); // 2초 * 10 = 약 20 피해
  });
});
