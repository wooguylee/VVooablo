/**
 * 몬스터 AI 시스템 (FSM + 행동별 로직).
 *
 * 공통: Idle → Chase → Attack (+ Reposition for 원거리)
 * 근접: 접근 후 근접 자동공격(combatSystem)
 * 원거리: preferredRange 유지, 사거리 내 투사체 발사, 너무 가까우면 후퇴
 * 돌진: 쿨다운마다 직선 돌진(고속 이동 + 충돌 피해)
 * 소환: 주기적으로 하수인 소환 + 원거리 견제
 * 보스: 2페이즈, 패턴 텔레그래프(slam/nova/charge)
 *
 * + 군집 회피(가벼운 separation)로 겹침 완화.
 */
import type { World, Entity } from '@/core/ecs';
import type { Rng } from '@/core/Rng';
import { C, type Position, type Movement } from '@/entities/components';
import { CC, type Health, type Stats, type Attacker } from '@/entities/combatComponents';
import { AC, type Ai, type Boss } from '@/entities/aiComponents';
import { findPath, smoothPath } from '@/world/pathfinding';
import type { TileMap } from '@/world/TileMap';
import { hasStatus } from '@/systems/status/statusSystem';
import { inCircle } from '@/systems/combat/hitbox';
import type { ProjectileSystem } from '@/systems/ProjectileSystem';

const REPATH_INTERVAL = 0.4;
const SEPARATION_RADIUS = 0.9;
const SEPARATION_FORCE = 1.2;

export interface AiContext {
  world: World;
  map: TileMap;
  player: Entity;
  rng: Rng;
  projectiles: ProjectileSystem;
  /** 소환 요청 (강령술사/보스) */
  requestSummon: (x: number, y: number, monsterId: string, level: number) => void;
  /** 보스 텔레그래프 시각화 */
  onTelegraph: (x: number, y: number, radius: number, type: string) => void;
  /** 보스 nova/slam 광역 피해 */
  dealAoe: (x: number, y: number, radius: number, coeff: number, level: number, weaponBase: number) => void;
  /** 피해 숫자 표시 */
  onHit: (x: number, y: number, amount: number, type: 'physical' | 'fire') => void;
  /** 사망 처리 */
  onKill: (e: Entity) => void;
}

export function aiSystem(ctx: AiContext, dt: number): void {
  const { world } = ctx;
  const positions = world.store<Position>(C.Position);
  const movements = world.store<Movement>(C.Movement);
  const healths = world.store<Health>(CC.Health);
  const attackers = world.store<Attacker>(CC.Attacker);
  const stats = world.store<Stats>(CC.Stats);
  const ais = world.store<Ai>(AC.Ai);

  const playerPos = positions.get(ctx.player);
  const playerHealth = healths.get(ctx.player);
  const playerAlive = !!(playerPos && playerHealth && !playerHealth.dead);

  for (const [entity, ai] of ais.entries()) {
    const pos = positions.get(entity);
    const mv = movements.get(entity);
    const health = healths.get(entity);
    const atk = attackers.get(entity);
    const st = stats.get(entity);
    if (!pos || !mv || !health || !st) continue;

    if (health.dead) {
      ai.state = 'death';
      mv.path.length = 0;
      ai.charging = false;
      if (atk) atk.target = -1;
      continue;
    }

    // 타이머 감소
    if (ai.repathTimer > 0) ai.repathTimer -= dt;
    if (ai.chargeCd > 0) ai.chargeCd -= dt;
    if (ai.rangedCd > 0) ai.rangedCd -= dt;
    if (ai.summonCd > 0) ai.summonCd -= dt;

    if (hasStatus(world, entity, 'stun')) {
      mv.path.length = 0;
      ai.charging = false;
      if (atk) atk.target = -1;
      continue;
    }

    // 돌진 진행 중 처리 (경로 무시 직선 이동)
    if (ai.charging) {
      updateCharge(ctx, ai, pos, mv, st, dt);
      continue;
    }

    if (!playerAlive || !playerPos) {
      ai.state = 'idle';
      mv.path.length = 0;
      if (atk) atk.target = -1;
      applySeparation(ctx, entity, pos, dt);
      continue;
    }

    ai.target = ctx.player;
    const dist = Math.hypot(playerPos.x - pos.x, playerPos.y - pos.y);

    // 보스 페이즈/패턴
    const boss = world.store<Boss>(AC.Boss).get(entity);
    if (boss) {
      updateBoss(ctx, entity, ai, boss, pos, playerPos, st, health, dt);
    }

    switch (ai.kind) {
      case 'melee':
        behaveMelee(ctx, entity, ai, atk, pos, playerPos, dist);
        break;
      case 'ranged':
        behaveRanged(ctx, entity, ai, atk, pos, playerPos, st, dist);
        break;
      case 'charger':
        behaveCharger(ctx, entity, ai, atk, pos, playerPos, dist);
        break;
      case 'summoner':
        behaveSummoner(ctx, entity, ai, atk, pos, playerPos, st, dist);
        break;
      case 'boss':
        behaveMelee(ctx, entity, ai, atk, pos, playerPos, dist);
        break;
    }

    applySeparation(ctx, entity, pos, dt);
  }
}

// ---- 공통 이동 헬퍼 ----
function repathTo(ctx: AiContext, ai: Ai, mv: Movement, pos: Position, tx: number, ty: number): void {
  if (ai.repathTimer > 0) return;
  ai.repathTimer = REPATH_INTERVAL;
  const start = { x: Math.round(pos.x), y: Math.round(pos.y) };
  const goal = { x: Math.round(tx), y: Math.round(ty) };
  if (!ctx.map.isWalkable(goal.x, goal.y)) return;
  const raw = findPath(start, goal, ctx.map.walkable, 1500);
  if (raw.length > 0) mv.path = smoothPath(start, raw, ctx.map.walkable);
}

// ---- 근접 ----
function behaveMelee(
  ctx: AiContext,
  _e: Entity,
  ai: Ai,
  atk: Attacker | undefined,
  pos: Position,
  playerPos: Position,
  dist: number,
): void {
  const mv = ctx.world.store<Movement>(C.Movement).get(_e)!;
  if (dist <= ai.attackRange) {
    ai.state = 'attack';
    mv.path.length = 0;
    if (atk) atk.target = ctx.player;
  } else if (dist <= ai.aggroRange * 1.5) {
    ai.state = 'chase';
    if (atk) atk.target = -1;
    repathTo(ctx, ai, mv, pos, playerPos.x, playerPos.y);
  } else {
    ai.state = 'idle';
    mv.path.length = 0;
  }
}

// ---- 원거리 ----
function behaveRanged(
  ctx: AiContext,
  e: Entity,
  ai: Ai,
  atk: Attacker | undefined,
  pos: Position,
  playerPos: Position,
  st: Stats,
  dist: number,
): void {
  const mv = ctx.world.store<Movement>(C.Movement).get(e)!;
  if (atk) atk.target = -1; // 원거리는 근접 자동공격 안 함
  if (dist > ai.aggroRange * 1.5) {
    ai.state = 'idle';
    mv.path.length = 0;
    return;
  }
  if (dist < ai.preferredRange * 0.6) {
    // 너무 가까움 → 후퇴 (반대 방향 타일)
    ai.state = 'reposition';
    const away = fleePoint(ctx, pos, playerPos);
    repathTo(ctx, ai, mv, pos, away.x, away.y);
  } else if (dist > ai.attackRange) {
    ai.state = 'chase';
    repathTo(ctx, ai, mv, pos, playerPos.x, playerPos.y);
  } else {
    ai.state = 'attack';
    mv.path.length = 0;
  }
  // 발사
  if (dist <= ai.attackRange && ai.rangedCd <= 0) {
    fireProjectile(ctx, pos, playerPos, st);
    ai.rangedCd = ctx.world.store<Attacker>(CC.Attacker).get(e)!.baseCooldown;
  }
}

// ---- 돌진 ----
function behaveCharger(
  ctx: AiContext,
  e: Entity,
  ai: Ai,
  atk: Attacker | undefined,
  pos: Position,
  playerPos: Position,
  dist: number,
): void {
  const mv = ctx.world.store<Movement>(C.Movement).get(e)!;
  const def = ctx.world.store<Stats>(CC.Stats).get(e);
  void def;
  // 돌진 조건: 쿨다운 완료 + 일정 거리
  if (ai.chargeCd <= 0 && dist > 2.5 && dist < 7) {
    startCharge(ai, pos, playerPos);
    mv.path.length = 0;
    return;
  }
  behaveMelee(ctx, e, ai, atk, pos, playerPos, dist);
}

// ---- 소환 ----
function behaveSummoner(
  ctx: AiContext,
  e: Entity,
  ai: Ai,
  atk: Attacker | undefined,
  pos: Position,
  playerPos: Position,
  st: Stats,
  dist: number,
): void {
  if (atk) atk.target = -1;
  // 소환
  const maxCount = 3;
  if (ai.summonCd <= 0 && ai.summonCount < maxCount && dist <= ai.aggroRange) {
    ctx.requestSummon(Math.round(pos.x), Math.round(pos.y), 'grunt', st.level);
    ai.summonCount++;
    ai.summonCd = 5;
  }
  behaveRanged(ctx, e, ai, atk, pos, playerPos, st, dist);
}

// ---- 돌진 실행 ----
function startCharge(ai: Ai, pos: Position, playerPos: Position): void {
  ai.charging = true;
  ai.state = 'attack';
  ai.chargeTargetX = playerPos.x;
  ai.chargeTargetY = playerPos.y;
  ai.chargeTimer = 0.8; // 최대 지속
  void pos;
}

function updateCharge(
  ctx: AiContext,
  ai: Ai,
  pos: Position,
  mv: Movement,
  st: Stats,
  dt: number,
): void {
  ai.chargeTimer -= dt;
  const dx = ai.chargeTargetX - pos.x;
  const dy = ai.chargeTargetY - pos.y;
  const d = Math.hypot(dx, dy);
  const speed = 12;
  if (d < 0.3 || ai.chargeTimer <= 0) {
    ai.charging = false;
    ai.chargeCd = 4;
    return;
  }
  const nx = dx / d;
  const ny = dy / d;
  const nextX = pos.x + nx * speed * dt;
  const nextY = pos.y + ny * speed * dt;
  if (!ctx.map.isWalkable(Math.round(nextX), Math.round(nextY))) {
    ai.charging = false;
    ai.chargeCd = 4;
    return;
  }
  pos.prevX = pos.x;
  pos.prevY = pos.y;
  pos.x = nextX;
  pos.y = nextY;
  mv.path.length = 0;

  // 플레이어와 충돌 시 피해
  const playerPos = ctx.world.store<Position>(C.Position).get(ctx.player);
  const playerHealth = ctx.world.store<Health>(CC.Health).get(ctx.player);
  if (playerPos && playerHealth && !playerHealth.dead) {
    if (inCircle(playerPos.x, playerPos.y, pos.x, pos.y, 1.0) && playerHealth.invuln <= 0) {
      const dmg = Math.max(1, Math.round(st.weaponBase * 1.5));
      playerHealth.hp -= dmg;
      playerHealth.invuln = 0.3;
      ctx.onHit(playerPos.x, playerPos.y, dmg, 'physical');
      if (playerHealth.hp <= 0 && !playerHealth.dead) {
        playerHealth.hp = 0;
        playerHealth.dead = true;
        ctx.onKill(ctx.player);
      }
      ai.charging = false;
      ai.chargeCd = 4;
    }
  }
}

// ---- 투사체 발사 ----
function fireProjectile(
  ctx: AiContext,
  pos: Position,
  playerPos: Position,
  st: Stats,
): void {
  const dx = playerPos.x - pos.x;
  const dy = playerPos.y - pos.y;
  const d = Math.hypot(dx, dy) || 1;
  ctx.projectiles.spawn({
    x: pos.x,
    y: pos.y,
    vx: (dx / d) * 8,
    vy: (dy / d) * 8,
    rangeLeft: 10,
    radius: 0.5,
    skillCoeff: 0.4,
    damageType: 'physical',
    ownerLevel: st.level,
    weaponBase: st.weaponBase,
    faction: 'enemy',
    color: 0xff8844,
  });
}

// ---- 후퇴 지점 ----
function fleePoint(ctx: AiContext, pos: Position, playerPos: Position): Position {
  const dx = pos.x - playerPos.x;
  const dy = pos.y - playerPos.y;
  const d = Math.hypot(dx, dy) || 1;
  for (let dist = 4; dist >= 1; dist--) {
    const tx = Math.round(pos.x + (dx / d) * dist);
    const ty = Math.round(pos.y + (dy / d) * dist);
    if (ctx.map.isWalkable(tx, ty)) return { x: tx, y: ty, prevX: tx, prevY: ty };
  }
  return pos;
}

// ---- 보스 ----
function updateBoss(
  ctx: AiContext,
  e: Entity,
  ai: Ai,
  boss: Boss,
  pos: Position,
  playerPos: Position,
  st: Stats,
  health: Health,
  dt: number,
): void {
  // 페이즈 전환
  if (boss.phase === 1 && health.hp <= health.maxHp * 0.5) {
    boss.phase = 2;
    boss.patternCd = 1;
    // 페이즈 2: 하수인 소환
    for (let i = 0; i < 3; i++) {
      ctx.requestSummon(Math.round(pos.x + (i - 1)), Math.round(pos.y + 1), 'grunt', st.level);
    }
  }

  if (boss.patternCd > 0) boss.patternCd -= dt;

  // 텔레그래프 진행
  if (boss.telegraphTimer > 0) {
    boss.telegraphTimer -= dt;
    const radius = boss.telegraphType === 'nova' ? 4 : 2.5;
    ctx.onTelegraph(playerPos.x, playerPos.y, radius, boss.telegraphType);
    if (boss.telegraphTimer <= 0) {
      // 패턴 발동
      const coeff = boss.phase === 2 ? 1.8 : 1.2;
      ctx.dealAoe(playerPos.x, playerPos.y, radius, coeff, st.level, st.weaponBase);
      boss.telegraphType = 'none';
    }
    return;
  }

  // 새 패턴 시작
  if (boss.patternCd <= 0) {
    const patterns: Array<Boss['telegraphType']> = boss.phase === 2 ? ['slam', 'nova', 'nova'] : ['slam'];
    boss.telegraphType = ctx.rng.pick(patterns);
    boss.telegraphTimer = 1.0; // 1초 예고
    boss.patternCd = boss.phase === 2 ? 3 : 5;
  }
  void e;
  void ai;
}

// ---- 군집 회피 (separation) ----
function applySeparation(ctx: AiContext, e: Entity, pos: Position, dt: number): void {
  const positions = ctx.world.store<Position>(C.Position);
  const ais = ctx.world.store<Ai>(AC.Ai);
  let fx = 0;
  let fy = 0;
  let count = 0;
  for (const [other, opos] of positions.entries()) {
    if (other === e) continue;
    if (!ais.has(other)) continue; // 적끼리만
    const dx = pos.x - opos.x;
    const dy = pos.y - opos.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > SEPARATION_RADIUS * SEPARATION_RADIUS || d2 < 1e-6) continue;
    const d = Math.sqrt(d2);
    fx += (dx / d) * (SEPARATION_RADIUS - d);
    fy += (dy / d) * (SEPARATION_RADIUS - d);
    count++;
  }
  if (count === 0) return;
  const nx = pos.x + fx * SEPARATION_FORCE * dt;
  const ny = pos.y + fy * SEPARATION_FORCE * dt;
  if (ctx.map.isWalkable(Math.round(nx), Math.round(ny))) {
    pos.x = nx;
    pos.y = ny;
  }
}
