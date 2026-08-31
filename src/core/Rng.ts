/**
 * 시드 기반 결정론적 PRNG (mulberry32).
 * 리플레이/디버깅을 위해 모든 무작위성은 이 클래스를 통과한다.
 */
export class Rng {
  private state: number;
  private readonly initialSeed: number;

  constructor(seed: number) {
    // 32비트 부호 없는 정수로 정규화
    this.initialSeed = seed >>> 0;
    this.state = this.initialSeed;
  }

  /** 문자열 시드를 32비트 정수로 해시 (xfnv1a) */
  static seedFromString(str: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    }
    return h >>> 0;
  }

  /** [0, 1) 부동소수 난수 */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [min, max) 부동소수 */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** [min, max] 정수 (양끝 포함) */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** 확률 p로 true */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** 배열에서 무작위 원소 선택 */
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  /** 현재 상태 스냅샷 (저장용) */
  getState(): number {
    return this.state >>> 0;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }

  get seed(): number {
    return this.initialSeed;
  }
}
