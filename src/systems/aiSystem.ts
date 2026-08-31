/**
 * 근접 몬스터 AI 시스템 (FSM).
 *
 * Idle: 대상이 aggro 범위에 들어오면 Chase
 * Chase: A*로 대상에게 접근, attackRange 안이면 Attack
 * Attack: 대상 지정(Attacker.target), 범위 벗어나면 Chase
 *
 * 경로 재계산은 repathTimer로 제한해 성능을 보호한다.
 */
import type { World } from '@/core/ecs';
import { C, type Position, type Movement } from '@/entities/components';
import { CC, type Health, type Attacker } from '@/entities/combatComponents';
import { AC, type Ai } from '@/entities/aiComponents';
import { findPath, smoothPath } from '@/world/pathfinding';
import type { TileMap } from '@/world/TileMap';

const REPATH_INTERVAL = 0.4;

export function aiSystem(world: World, dt: number, map: TileMap, playerEntity: number): void {
  const positions = world.store<Position>(C.Position);
  const movements = world.store<Movement>(C.Movement);
  const healths = world.store<Health>(CC.Health);
  const attackers = world.store<Attacker>(CC.Attacker);
  const ais = world.store<Ai>(AC.Ai);

  const playerPos = positions.get(playerEntity);
  const playerHealth = healths.get(playerEntity);
  const playerAlive = playerPos && playerHealth && !playerHealth.dead;

  for (const [entity, ai] of ais.entries()) {
    const pos = positions.get(entity);
    const mv = movements.get(entity);
    const health = healths.get(entity);
    const atk = attackers.get(entity);
    if (!pos || !mv || !health) continue;

    if (health.dead) {
      ai.state = 'death';
      mv.path.length = 0;
      if (atk) atk.target = -1;
      continue;
    }

    if (ai.repathTimer > 0) ai.repathTimer -= dt;

    if (!playerAlive || !playerPos) {
      ai.state = 'idle';
      mv.path.length = 0;
      if (atk) atk.target = -1;
      continue;
    }

    ai.target = playerEntity;
    const dist = Math.hypot(playerPos.x - pos.x, playerPos.y - pos.y);

    switch (ai.state) {
      case 'idle':
      case 'patrol':
        if (dist <= ai.aggroRange) ai.state = 'chase';
        break;

      case 'chase': {
        if (dist <= ai.attackRange) {
          ai.state = 'attack';
          mv.path.length = 0;
          break;
        }
        if (dist > ai.aggroRange * 1.5) {
          ai.state = 'idle';
          mv.path.length = 0;
          break;
        }
        // 경로 재계산
        if (ai.repathTimer <= 0) {
          ai.repathTimer = REPATH_INTERVAL;
          const start = { x: Math.round(pos.x), y: Math.round(pos.y) };
          const goal = { x: Math.round(playerPos.x), y: Math.round(playerPos.y) };
          if (map.isWalkable(goal.x, goal.y)) {
            const raw = findPath(start, goal, map.walkable, 1500);
            if (raw.length > 0) {
              mv.path = smoothPath(start, raw, map.walkable);
            }
          }
        }
        break;
      }

      case 'attack':
        if (dist > ai.attackRange * 1.2) {
          ai.state = 'chase';
        }
        if (atk) atk.target = playerEntity;
        break;

      default:
        ai.state = 'idle';
        break;
    }
  }
}
