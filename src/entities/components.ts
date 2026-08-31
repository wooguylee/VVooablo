/**
 * 컴포넌트 정의 및 스토어 키.
 * Phase 2: 위치, 이동, 방향/애니메이션, 렌더 참조.
 * 이후 Phase에서 전투/스탯/AI 컴포넌트가 추가된다.
 */
import type { Container } from 'pixi.js';

/** 컴포넌트 스토어 이름 상수 (문자열 키 오타 방지) */
export const C = {
  Position: 'Position',
  Movement: 'Movement',
  Facing: 'Facing',
  Sprite: 'Sprite',
  PlayerControlled: 'PlayerControlled',
} as const;

/** 월드(타일) 좌표. 부동소수 허용. */
export interface Position {
  x: number;
  y: number;
  /** 렌더 보간을 위한 직전 위치 */
  prevX: number;
  prevY: number;
}

/** 이동 상태: A* 경로를 따라 이동. */
export interface Movement {
  /** 남은 경로 (타일 중심 좌표 목록). 마지막이 최종 목표. */
  path: Array<{ x: number; y: number }>;
  /** 초당 타일 이동 속도 */
  speed: number;
  /** 현재 이동 중인지 */
  moving: boolean;
}

/** 8방향 및 현재 애니메이션 상태. */
export type AnimState = 'idle' | 'walk' | 'attack' | 'cast' | 'hit' | 'death';

export interface Facing {
  /** 0=E,1=SE,2=S,3=SW,4=W,5=NW,6=N,7=NE (화면 기준 8방향) */
  dir: number;
  state: AnimState;
  /** 애니메이션 경과 시간(초) */
  animTime: number;
}

/** 렌더용 Pixi 컨테이너 참조. */
export interface SpriteRef {
  container: Container;
  /** 플레이스홀더 색상 */
  color: number;
}
