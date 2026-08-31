/**
 * 전투 시스템: 근접 자동 공격 처리.
 *
 * - Attacker 컴포넌트를 가진 엔티티가 사거리 내 적대 대상을 공격
 * - 쿨다운은 공속에 비례
 * - 데미지는 격리된 computeDamage로 계산, RNG 주입(결정성)
 * - 사망 처리 및 데미지 숫자 이벤트 발생
 */
import type { World, Entity } from '@/core/ecs';
import type { Rng } from '@/core/Rng';
import { C, type Position, type Facing } from '@/entities/components';
import {
  CC,
  type Health,
  type Stats,
  type Faction,
  type Attacker,
} from '@/entities/combatComponents';
import { computeDamage, type DamageResult } from '@/systems/combat/damage';
import { applyDamageToEntity } from '@/systems/combat/applyDamage';
import { vulnerabilityMultiplier } from '@/systems/status/statusSystem';

export interface CombatCallbacks {
  onDamage: (targetEntity: Entity, x: number, y: number, result: DamageResult) => void;
  onDeath: (entity: Entity, faction: Faction['id']) => void;
}

export function combatSystem(
  world: World,
  dt: number,
  rng: Rng,
  cb: CombatCallbacks,
): void {
  const positions = world.store<Position>(C.Position);
  const facings = world.store<Facing>(C.Facing);
  const healths = world.store<Health>(CC.Health);
  const stats = world.store<Stats>(CC.Stats);
  const factions = world.store<Faction>(CC.Faction);
  const attackers = world.store<Attacker>(CC.Attacker);

  // 무적 타이머 감소
  for (const h of healths.values()) {
    if (h.invuln > 0) h.invuln = Math.max(0, h.invuln - dt);
  }

  for (const [entity, atk] of attackers.entries()) {
    const pos = positions.get(entity);
    const st = stats.get(entity);
    const fac = factions.get(entity);
    const myHealth = healths.get(entity);
    if (!pos || !st || !fac || !myHealth || myHealth.dead) continue;

    if (atk.cooldown > 0) {
      atk.cooldown = Math.max(0, atk.cooldown - dt);
      continue;
    }

    // 대상 유효성 검사
    const target = atk.target;
    if (target < 0 || !world.isAlive(target)) continue;
    const tPos = positions.get(target);
    const tHealth = healths.get(target);
    const tStats = stats.get(target);
    const tFac = factions.get(target);
    if (!tPos || !tHealth || !tStats || !tFac || tHealth.dead) continue;
    if (tFac.id === fac.id) continue; // 아군 공격 안 함

    // 사거리 검사
    const dist = Math.hypot(tPos.x - pos.x, tPos.y - pos.y);
    if (dist > atk.range) continue;

    // 공격 실행
    const face = facings.get(entity);
    if (face && face.state !== 'attack') {
      face.state = 'attack';
      face.animTime = 0;
    }

    const result = computeDamage(
      {
        weaponBase: st.weaponBase,
        skillCoeff: atk.skillCoeff,
        increasedDamage: 0,
        critChance: st.derived.critChance,
        critDamage: st.derived.critDamage,
        attackerLevel: st.level,
        type: 'physical',
      },
      { armor: tStats.derived.armor, resistance: tStats.derived.resistance },
      rng,
    );

    if (tHealth.invuln <= 0) {
      const vuln = vulnerabilityMultiplier(world, target);
      result.amount = Math.max(1, Math.round(result.amount * vuln));
      applyDamageToEntity(world, target, result.amount);
      tHealth.invuln = 0.05;
      cb.onDamage(target, tPos.x, tPos.y, result);

      // 피격 반응
      const tFace = facings.get(target);
      if (tFace && tFace.state !== 'death') {
        tFace.state = 'hit';
        tFace.animTime = 0;
      }

      if (tHealth.hp <= 0 && !tHealth.dead) {
        tHealth.hp = 0;
        tHealth.dead = true;
        if (tFace) {
          tFace.state = 'death';
          tFace.animTime = 0;
        }
        cb.onDeath(target, tFac.id);
      }
    }

    // 쿨다운 = 기본간격 / 공속
    atk.cooldown = atk.baseCooldown / st.derived.attackSpeed;
  }
}
