/**
 * 고정 타임스텝 게임 루프.
 * - 로직은 60Hz 고정 스텝으로 업데이트 (결정성 보장)
 * - 렌더는 가변 프레임, 보간 계수(alpha)를 전달
 * - 나선형 지연(spiral of death) 방지를 위해 프레임당 최대 스텝 제한
 */
export interface LoopCallbacks {
  /** 고정 스텝 로직 업데이트. dt는 항상 고정값(초) */
  update: (dt: number) => void;
  /** 렌더. alpha는 [0,1) 보간 계수 */
  render: (alpha: number) => void;
}

export class GameLoop {
  readonly fixedDt: number;
  private readonly maxSteps: number;
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private rafId = 0;
  private callbacks: LoopCallbacks;

  // 디버그 통계
  fps = 0;
  private fpsAccum = 0;
  private fpsFrames = 0;

  constructor(callbacks: LoopCallbacks, hz = 60, maxSteps = 5) {
    this.callbacks = callbacks;
    this.fixedDt = 1 / hz;
    this.maxSteps = maxSteps;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    let frameTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    // 큰 프레임 스파이크 클램프 (탭 전환 등)
    if (frameTime > 0.25) frameTime = 0.25;

    this.accumulator += frameTime;

    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < this.maxSteps) {
      this.callbacks.update(this.fixedDt);
      this.accumulator -= this.fixedDt;
      steps++;
    }
    // 스텝 초과 시 누적값 버림 (지연 폭주 방지)
    if (steps >= this.maxSteps) this.accumulator = 0;

    const alpha = this.accumulator / this.fixedDt;
    this.callbacks.render(alpha);

    // FPS 계산 (0.5초 창)
    this.fpsAccum += frameTime;
    this.fpsFrames++;
    if (this.fpsAccum >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
