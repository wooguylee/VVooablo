/**
 * 8방향 계산 유틸.
 * 화면(스크린) 기준 방향 인덱스: 0=E,1=SE,2=S,3=SW,4=W,5=NW,6=N,7=NE.
 *
 * 월드(타일) 이동 벡터를 화면 벡터로 변환한 뒤 각도로 방향을 구한다.
 * 아이소 투영에서 screenX=(wx-wy), screenY=(wx+wy) 비례.
 */

/** 월드 이동 벡터 → 8방향 인덱스 */
export function dirFromWorldDelta(dx: number, dy: number): number {
  if (dx === 0 && dy === 0) return 2; // 기본 남향
  // 월드 → 화면 벡터 (스케일 무관, 부호/비율만 필요)
  const sx = dx - dy;
  const sy = dx + dy;
  // atan2: 화면 y는 아래로 증가
  let angle = Math.atan2(sy, sx); // -PI..PI
  if (angle < 0) angle += Math.PI * 2; // 0..2PI
  // 0=E(0), 1=SE(45), ... 시계방향 45도 간격
  const idx = Math.round(angle / (Math.PI / 4)) % 8;
  return idx;
}

/** 8방향 인덱스 → 대표 색상 (플레이스홀더 렌더용) */
export const DIR_TINT = [
  0xff6666, // E
  0xffaa66, // SE
  0xffff66, // S
  0xaaff66, // SW
  0x66ff66, // W
  0x66ffaa, // NW
  0x66aaff, // N
  0xaa66ff, // NE
];

export const DIR_COUNT = 8;
