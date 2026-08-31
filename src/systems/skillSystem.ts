/**
 * 스킬 시스템: 쿨다운/마나/시전 관리 + 스킬 실행.
 *
 * castSkill로 시전 요청 → 마나/쿨다운 검사 → 시전시간 후 execute.
 * 즉시 시전(castTime=0)은 바로 실행. 이동 중 시전 캔슬 규칙은 데이터로 확장 가능.
 */
import type { World, Entity } from '@/core/ecs';
import type { Rng } from '@/core/Rng';
import { C, type Position, type Facing, type Movement } from '@/entities/components';
import { CC, type Stats, type Health, type Faction } from '@/entities/combatComponents';
import { SC, type SkillUser } from '@/entities/skillComponents';
import { SKILLS, type SkillDef } from '@/data/skills';
import { computeDamage, type DamageResult } from '@/systems/combat/damage';
import { inArc, inCircle, worldDirToAngle } from '@/systems/combat/hitbox';
import { applyStatus, hasStatus, vulnerabilityMultiplier } from '@/systems/status/statusSystem';
import type { ProjectileSystem } from '@/systems/ProjectileSystem';
import type { ParticleSystem } from '@/render/ParticleSystem';

export interface SkillContext {
  world: World;
  rng: Rng;
  projectiles: ProjectileSystem;
  particles: ParticleSystem;
  onHit: (x: number, y: number, r: DamageResult) => void;
  onKill: (e: Entity) => void;
  onSummon: (x: number, y: number, def: SkillDef, ownerLevel: number) => void;
}

/** 시전 요청. 성공 시 true. */
export function castSkill(
  ctx: SkillContext,
  caster: Entity,
  skillId: string,
  targetX: number,
  targetY: number,
): boolean {
  const world = ctx.world;
  const su = world.store<SkillUser>(SC.SkillUser).get(caster);
  const health = world.store<Health>(CC.Health).get(caster);
  if (!su || !health || health.dead) return false;
  if (hasStatus(world, caster, 'stun')) return false;
  if (su.casting) return false;

  const def = SKILLS[skillId];
  if (!def) return false;
  if ((su.cooldowns[skillId] ?? 0) > 0) return false;
  if (su.mana < def.manaCost) return false;

  su.mana -= def.manaCost;
  su.cooldowns[skillId] = def.cooldown;

  if (def.castTime <= 0) {
    executeSkill(ctx, caster, def, targetX, targetY);
  } else {
    su.casting = { skillId, timeLeft: def.castTime, targetX, targetY };
    const face = world.store<Facing>(C.Facing).get(caster);
    if (face) {
      face.state = 'cast';
      face.animTime = 0;
    }
  }
  return true;
}

/** 매 스텝: 쿨다운/마나 회복/시전 진행 */
export function skillSystem(ctx: SkillContext, dt: number): void {
  const users = ctx.world.store<SkillUser>(SC.SkillUser);
  for (const [caster, su] of users.entries()) {
    // 쿨다운
    for (const k of Object.keys(su.cooldowns)) {
      if (su.cooldowns[k] > 0) su.cooldowns[k] = Math.max(0, su.cooldowns[k] - dt);
    }
    // 마나 회복
    su.mana = Math.min(su.maxMana, su.mana + su.manaRegen * dt);

    // 시전 진행
    if (su.casting) {
      // 기절 시 캔슬
      if (hasStatus(ctx.world, caster, 'stun')) {
        su.casting = null;
        continue;
      }
      su.casting.timeLeft -= dt;
      if (su.casting.timeLeft <= 0) {
        const def = SKILLS[su.casting.skillId];
        const { targetX, targetY } = su.casting;
        su.casting = null;
        if (def) executeSkill(ctx, caster, def, targetX, targetY);
      }
    }
  }
}

function executeSkill(
  ctx: SkillContext,
  caster: Entity,
  def: SkillDef,
  targetX: number,
  targetY: number,
): void {
  const world = ctx.world;
  const pos = world.store<Position>(C.Position).get(caster);
  const stats = world.store<Stats>(CC.Stats).get(caster);
  const fac = world.store<Faction>(CC.Faction).get(caster);
  if (!pos || !stats || !fac) return;

  const dx = targetX - pos.x;
  const dy = targetY - pos.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  switch (def.shape) {
    case 'arc':
      execArc(ctx, caster, def, pos, stats, fac, dx, dy);
      break;
    case 'aoe':
      execAoe(ctx, caster, def, stats, fac, targetX, targetY);
      break;
    case 'dash':
      execDash(ctx, caster, def, pos, nx, ny);
      break;
    case 'projectile':
      execProjectile(ctx, def, pos, stats, fac, nx, ny);
      break;
    case 'summon':
      ctx.onSummon(Math.round(pos.x + nx * 2), Math.round(pos.y + ny * 2), def, stats.level);
      ctx.particles.burst(pos.x + nx * 2, pos.y + ny * 2, def.color, 12, 2, 0.5);
      break;
  }
}

function damageTargets(
  ctx: SkillContext,
  caster: Entity,
  def: SkillDef,
  weaponBase: number,
  level: number,
  fac: Faction,
  predicate: (px: number, py: number) => boolean,
): void {
  const world = ctx.world;
  const positions = world.store<Position>(C.Position);
  const healths = world.store<Health>(CC.Health);
  const stats = world.store<Stats>(CC.Stats);
  const factions = world.store<Faction>(CC.Faction);
  const casterStats = stats.get(caster);

  for (const [entity, pos] of positions.entries()) {
    if (entity === caster) continue;
    const f = factions.get(entity);
    if (!f || f.id === fac.id) continue;
    const h = healths.get(entity);
    if (!h || h.dead) continue;
    if (!predicate(pos.x, pos.y)) continue;

    const tStats = stats.get(entity);
    const result = computeDamage(
      {
        weaponBase,
        skillCoeff: def.skillCoeff,
        increasedDamage: 0,
        critChance: casterStats?.derived.critChance ?? 0.05,
        critDamage: casterStats?.derived.critDamage ?? 1.5,
        attackerLevel: level,
        type: def.damageType,
      },
      { armor: tStats?.derived.armor ?? 0, resistance: tStats?.derived.resistance ?? 0 },
      ctx.rng,
    );
    const vuln = vulnerabilityMultiplier(world, entity);
    result.amount = Math.max(1, Math.round(result.amount * vuln));
    h.hp -= result.amount;
    ctx.onHit(pos.x, pos.y, result);
    if (def.applyStatus) {
      applyStatus(world, entity, def.applyStatus.type, def.applyStatus.duration, def.applyStatus.magnitude);
    }
    if (h.hp <= 0 && !h.dead) {
      h.hp = 0;
      h.dead = true;
      ctx.onKill(entity);
    }
  }
}

function execArc(
  ctx: SkillContext,
  caster: Entity,
  def: SkillDef,
  pos: Position,
  stats: Stats,
  fac: Faction,
  dx: number,
  dy: number,
): void {
  const facingAngle = worldDirToAngle(dx, dy);
  const half = def.arcHalfAngle ?? Math.PI / 3;
  damageTargets(ctx, caster, def, stats.weaponBase, stats.level, fac, (px, py) =>
    inArc(px, py, pos.x, pos.y, def.range, facingAngle, half),
  );
  ctx.particles.burst(pos.x + dx * 0.3, pos.y + dy * 0.3, def.color, 10, 3, 0.35);
}

function execAoe(
  ctx: SkillContext,
  caster: Entity,
  def: SkillDef,
  stats: Stats,
  fac: Faction,
  tx: number,
  ty: number,
): void {
  damageTargets(ctx, caster, def, stats.weaponBase, stats.level, fac, (px, py) =>
    inCircle(px, py, tx, ty, def.range),
  );
  ctx.particles.burst(tx, ty, def.color, 24, def.range * 1.2, 0.6);
}

function execDash(
  ctx: SkillContext,
  caster: Entity,
  def: SkillDef,
  pos: Position,
  nx: number,
  ny: number,
): void {
  // 즉시 이동 (경로 무시, 사거리만큼) + 경유 피해
  const world = ctx.world;
  const mv = world.store<Movement>(C.Movement).get(caster);
  const stats = world.store<Stats>(CC.Stats).get(caster);
  const fac = world.store<Faction>(CC.Faction).get(caster);
  const destX = pos.x + nx * def.range;
  const destY = pos.y + ny * def.range;
  if (mv) mv.path.length = 0;
  pos.prevX = pos.x;
  pos.prevY = pos.y;
  pos.x = destX;
  pos.y = destY;
  if (stats && fac) {
    damageTargets(ctx, caster, def, stats.weaponBase, stats.level, fac, (px, py) =>
      inCircle(px, py, destX, destY, 1.5),
    );
  }
  ctx.particles.burst(destX, destY, def.color, 12, 2, 0.4);
}

function execProjectile(
  ctx: SkillContext,
  def: SkillDef,
  pos: Position,
  stats: Stats,
  fac: Faction,
  nx: number,
  ny: number,
): void {
  const count = def.projectileCount ?? 1;
  const speed = def.projectileSpeed ?? 10;
  const baseAngle = Math.atan2(ny, nx);
  const spread = 0.15;
  for (let i = 0; i < count; i++) {
    const off = count > 1 ? (i - (count - 1) / 2) * spread : 0;
    const a = baseAngle + off;
    ctx.projectiles.spawn({
      x: pos.x,
      y: pos.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      rangeLeft: def.range,
      radius: 0.5,
      skillCoeff: def.skillCoeff,
      damageType: def.damageType,
      ownerLevel: stats.level,
      weaponBase: stats.weaponBase,
      faction: fac.id,
      color: def.color,
      ...(def.applyStatus ? { applyStatus: def.applyStatus } : {}),
    });
  }
}
