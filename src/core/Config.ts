/**
 * 전역 게임 설정. 픽셀 퍼펙트/아이소메트릭 파라미터의 단일 출처.
 */
export const Config = {
  /** 내부 렌더 해상도 (1x). CSS로 정수 배율 업스케일된다. */
  internalWidth: 1280,
  internalHeight: 720,

  /** 아이소메트릭 타일 크기 (2:1 다이아몬드) */
  tileWidth: 32,
  tileHeight: 16,

  /** 로직 고정 스텝 주파수 */
  fixedHz: 60,

  /** 허용 줌 배율 (정수만) */
  zoomLevels: [1, 2, 3] as const,
  defaultZoomIndex: 1, // 2x

  /** 카메라 데드존 (내부 픽셀) */
  cameraDeadzone: { w: 80, h: 48 },
  cameraLerp: 0.15,
} as const;

export type ZoomLevel = (typeof Config.zoomLevels)[number];
