/**
 * 8방향 애니메이터 (플레이스홀더).
 *
 * 스프라이트 아틀라스가 없을 때 방향별 색상 도형으로 대체 렌더한다.
 * - 몸통: 색상 원/사각형
 * - 방향 표시: 바라보는 방향으로 튀어나온 삼각형(부리)
 * - walk 상태: 상하 바운스
 * - attack/cast/hit: 색 점멸 / 스케일 펄스
 *
 * 프레임 데이터는 이후 JSON 아틀라스로 교체 가능하도록 상태/방향/시간만 입력받는다.
 */
import { Container, Graphics } from 'pixi.js';
import type { Facing } from '@/entities/components';

const BODY_R = 5;

export function createPlaceholderSprite(color: number): Container {
  const c = new Container();
  const body = new Graphics();
  body.label = 'body';
  c.addChild(body);
  const beak = new Graphics();
  beak.label = 'beak';
  c.addChild(beak);
  // 초기 그리기
  redrawBody(body, color);
  return c;
}

function redrawBody(body: Graphics, color: number): void {
  body.clear();
  // 그림자
  body.ellipse(0, 2, BODY_R + 1, 3);
  body.fill({ color: 0x000000, alpha: 0.3 });
  // 몸통 (위로 올림: 발이 타일 중심에 오도록)
  body.circle(0, -BODY_R, BODY_R);
  body.fill({ color });
  body.stroke({ color: 0x000000, width: 1, alpha: 0.5 });
}

/** 방향 인덱스 → 화면상 부리 방향 단위 벡터 */
const DIR_VEC: Array<[number, number]> = [
  [1, 0], // E
  [0.7, 0.5], // SE
  [0, 1], // S
  [-0.7, 0.5], // SW
  [-1, 0], // W
  [-0.7, -0.5], // NW
  [0, -1], // N
  [0.7, -0.5], // NE
];

/**
 * 애니메이션 상태를 스프라이트에 반영.
 * @param sprite 플레이스홀더 컨테이너
 * @param facing 방향/상태/경과시간
 * @param color 기본 색
 */
export function applyAnimation(sprite: Container, facing: Facing, color: number): void {
  const body = sprite.getChildByLabel('body') as Graphics | null;
  const beak = sprite.getChildByLabel('beak') as Graphics | null;
  if (!body || !beak) return;

  const t = facing.animTime;

  // 방향 부리
  const [vx, vy] = DIR_VEC[facing.dir] ?? DIR_VEC[2];
  beak.clear();
  const bx = vx * (BODY_R + 2);
  const by = vy * (BODY_R + 2) - BODY_R;
  beak.circle(bx, by, 2);
  beak.fill({ color: 0xffffff });

  // 상태별 효과
  let bounce = 0;
  let scale = 1;
  let tint = color;
  switch (facing.state) {
    case 'walk': {
      bounce = Math.abs(Math.sin(t * 12)) * -2;
      break;
    }
    case 'attack':
    case 'cast': {
      scale = 1 + Math.sin(Math.min(t * 20, Math.PI)) * 0.3;
      tint = facing.state === 'cast' ? 0x66ccff : 0xffcc33;
      break;
    }
    case 'hit': {
      tint = t % 0.1 < 0.05 ? 0xffffff : 0xff3333;
      break;
    }
    case 'death': {
      sprite.alpha = Math.max(0, 1 - t * 1.5);
      scale = 1 + t * 0.5;
      break;
    }
    case 'idle':
    default:
      bounce = Math.sin(t * 3) * 0.5;
      break;
  }

  redrawBody(body, tint);
  sprite.position.y = bounce;
  sprite.scale.set(scale);
}
