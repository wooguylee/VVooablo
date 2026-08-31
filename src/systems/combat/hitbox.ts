/**
 * 히트박스 판정 유틸.
 * 밀리(부채꼴), 원형(AoE), 점(투사체) 형태를 지원한다.
 * 좌표는 월드(타일) 단위.
 */

export interface Point {
  x: number;
  y: number;
}

/** 원형 범위 안에 있는가 */
export function inCircle(px: number, py: number, cx: number, cy: number, radius: number): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * 부채꼴(원뿔) 범위 판정.
 * @param facingAngle 바라보는 각도(라디안)
 * @param halfAngle 부채꼴 반각(라디안)
 */
export function inArc(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number,
  facingAngle: number,
  halfAngle: number,
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  const distSq = dx * dx + dy * dy;
  if (distSq > radius * radius) return false;
  if (distSq < 1e-6) return true; // 중심점
  const ang = Math.atan2(dy, dx);
  let diff = Math.abs(ang - facingAngle);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  return diff <= halfAngle;
}

/** 월드 이동 벡터의 화면 기준 각도 (부채꼴 방향 계산용) */
export function worldDirToAngle(dx: number, dy: number): number {
  // 화면 좌표계로 변환한 뒤 각도
  const sx = dx - dy;
  const sy = dx + dy;
  return Math.atan2(sy, sx);
}
