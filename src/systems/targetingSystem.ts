/**
 * 타겟팅 시스템.
 * 공간 해시를 매 스텝 재구축하고, 플레이어의 근접 자동공격 대상을 갱신한다.
 * (Phase 5+에서 스킬 타겟팅도 이 해시를 활용)
 */
import type { World, Entity } from '@/core/ecs';
import { C, type Position } from '@/entities/components';
import { CC, type Health, type Faction, type Attacker } from '@/entities/combatComponents';
import { SpatialHash } from '@/world/SpatialHash';

export function rebuildSpatialHash(world: World, hash: SpatialHash): void {
  hash.clear();
  const positions = world.store<Position>(C.Position);
  const healths = world.store<Health>(CC.Health);
  for (const [entity, pos] of positions.entries()) {
    const h = healths.get(entity);
    if (h && h.dead) continue;
    hash.insert(entity, pos.x, pos.y);
  }
}

/** 플레이어의 근접 자동공격 대상을 사거리 내 최근접 적으로 지정 */
export function playerTargetingSystem(
  world: World,
  hash: SpatialHash,
  player: Entity,
): void {
  const positions = world.store<Position>(C.Position);
  const healths = world.store<Health>(CC.Health);
  const factions = world.store<Faction>(CC.Faction);
  const attackers = world.store<Attacker>(CC.Attacker);

  const atk = attackers.get(player);
  const pos = positions.get(player);
  const ph = healths.get(player);
  if (!atk || !pos || !ph || ph.dead) return;

  const searchR = atk.range + 0.5;
  const candidates = hash.query(pos.x, pos.y, searchR);
  let best = -1;
  let bestDist = Infinity;
  for (const e of candidates) {
    if (e === player) continue;
    const fac = factions.get(e);
    if (!fac || fac.id === 'player') continue;
    const h = healths.get(e);
    if (!h || h.dead) continue;
    const ep = positions.get(e);
    if (!ep) continue;
    const d = Math.hypot(ep.x - pos.x, ep.y - pos.y);
    if (d <= atk.range && d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  atk.target = best;
}

/** 플레이어 진영의 소환물(토템 등)이 근접/사거리 내 적을 타겟팅 */
export function allyTargetingSystem(world: World, hash: SpatialHash, player: Entity): void {
  const positions = world.store<Position>(C.Position);
  const healths = world.store<Health>(CC.Health);
  const factions = world.store<Faction>(CC.Faction);
  const attackers = world.store<Attacker>(CC.Attacker);

  for (const [entity, atk] of attackers.entries()) {
    if (entity === player) continue;
    const fac = factions.get(entity);
    if (!fac || fac.id !== 'player') continue;
    const pos = positions.get(entity);
    if (!pos) continue;

    const candidates = hash.query(pos.x, pos.y, atk.range + 0.5);
    let best = -1;
    let bestDist = Infinity;
    for (const t of candidates) {
      const tf = factions.get(t);
      if (!tf || tf.id === 'player') continue;
      const th = healths.get(t);
      if (!th || th.dead) continue;
      const tp = positions.get(t);
      if (!tp) continue;
      const d = Math.hypot(tp.x - pos.x, tp.y - pos.y);
      if (d <= atk.range && d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    atk.target = best;
  }
}
