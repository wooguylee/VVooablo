import { Container } from 'pixi.js';
import { Config, type ZoomLevel } from '@/core/Config';

/**
 * 카메라: 스무스 팔로우 + 데드존 + 정수 배율 줌 + 화면 흔들림.
 *
 * 월드 컨테이너를 이동/스케일하여 카메라 효과를 낸다.
 * 위치는 "월드가 바라보는 화면 픽셀 중심"을 추적한다.
 */
export class Camera {
  private stageRoot: Container;
  private world: Container;

  /** 카메라가 바라보는 화면 픽셀 좌표 (world 공간, 스케일 전) */
  private x = 0;
  private y = 0;
  private targetX = 0;
  private targetY = 0;

  private zoomIndex: number;

  // 화면 흔들림 상태
  private shakeTime = 0;
  private shakeDuration = 0;
  private shakeMagnitude = 0;
  private shakeOffX = 0;
  private shakeOffY = 0;

  constructor(stageRoot: Container, world: Container) {
    this.stageRoot = stageRoot;
    this.world = world;
    this.zoomIndex = Config.defaultZoomIndex;
  }

  get zoom(): ZoomLevel {
    return Config.zoomLevels[this.zoomIndex];
  }

  /** 즉시 지정 위치로 스냅 */
  snapTo(sx: number, sy: number): void {
    this.x = this.targetX = sx;
    this.y = this.targetY = sy;
  }

  /** 팔로우 타깃(화면 픽셀 좌표) 지정. 데드존 밖일 때만 목표 갱신. */
  follow(sx: number, sy: number): void {
    const dz = Config.cameraDeadzone;
    const dx = sx - this.targetX;
    const dy = sy - this.targetY;
    if (Math.abs(dx) > dz.w / 2) {
      this.targetX += dx - Math.sign(dx) * (dz.w / 2);
    }
    if (Math.abs(dy) > dz.h / 2) {
      this.targetY += dy - Math.sign(dy) * (dz.h / 2);
    }
  }

  cycleZoom(dir: number): void {
    this.zoomIndex = Math.min(
      Config.zoomLevels.length - 1,
      Math.max(0, this.zoomIndex + Math.sign(dir)),
    );
  }

  setZoomIndex(i: number): void {
    this.zoomIndex = Math.min(Config.zoomLevels.length - 1, Math.max(0, i));
  }

  shake(magnitude: number, duration: number): void {
    // 기존 흔들림보다 강할 때만 갱신
    if (magnitude >= this.shakeMagnitude) {
      this.shakeMagnitude = magnitude;
      this.shakeDuration = duration;
      this.shakeTime = 0;
    }
  }

  /** 고정 스텝 업데이트: 스무스 이동 + 흔들림 감쇠 */
  update(dt: number): void {
    this.x += (this.targetX - this.x) * Config.cameraLerp;
    this.y += (this.targetY - this.y) * Config.cameraLerp;

    if (this.shakeDuration > 0) {
      this.shakeTime += dt;
      const t = this.shakeTime / this.shakeDuration;
      if (t >= 1) {
        this.shakeDuration = 0;
        this.shakeMagnitude = 0;
        this.shakeOffX = 0;
        this.shakeOffY = 0;
      } else {
        const decay = 1 - t;
        const mag = this.shakeMagnitude * decay;
        this.shakeOffX = (Math.random() * 2 - 1) * mag;
        this.shakeOffY = (Math.random() * 2 - 1) * mag;
      }
    }
  }

  /** 렌더 시 world 컨테이너에 변환 적용 (픽셀 스냅) */
  apply(): void {
    const z = this.zoom;
    this.stageRoot.scale.set(z);
    // 카메라 중심을 화면 중앙에 배치, 정수 픽셀로 스냅
    const cx = Math.round(this.x + this.shakeOffX);
    const cy = Math.round(this.y + this.shakeOffY);
    this.world.position.set(
      Math.round(Config.internalWidth / 2 / z - cx),
      Math.round(Config.internalHeight / 2 / z - cy),
    );
  }

  /** 화면(캔버스 내부 px) → world 컨테이너 로컬 좌표 */
  screenToWorldLocal(px: number, py: number): { x: number; y: number } {
    const z = this.zoom;
    return {
      x: px / z - this.world.position.x,
      y: py / z - this.world.position.y,
    };
  }

  getCenter(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
