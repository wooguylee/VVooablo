/**
 * 상태이상 타입 정의.
 * stun(기절), slow(둔화), burn(화상/도트), vulnerable(취약).
 */
export type StatusType = 'stun' | 'slow' | 'burn' | 'vulnerable';

export interface StatusInstance {
  type: StatusType;
  /** 남은 지속시간(초) */
  duration: number;
  /** 강도: slow=이동감소율, burn=초당피해, vulnerable=피해증가율 */
  magnitude: number;
  /** 도트 누적 타이머 */
  tickAccum: number;
}

export const STATUS = {
  Status: 'Status',
} as const;

/** 엔티티가 가진 상태이상 목록 (스택/중첩) */
export interface StatusBag {
  effects: StatusInstance[];
}
