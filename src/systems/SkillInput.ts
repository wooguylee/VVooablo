/**
 * 스킬 입력 컨트롤러.
 * Q/W/E/R = 슬롯 0~3, 우클릭 = 슬롯 4(보조 스킬).
 * 마우스 위치를 타깃으로 시전 요청을 큐에 넣는다.
 */
import type { Camera } from '@/render/Camera';
import { screenToWorld } from '@/render/iso';
import { Config } from '@/core/Config';

export interface SkillCastRequest {
  slot: number;
  targetX: number;
  targetY: number;
}

export class SkillInput {
  private camera: Camera;
  private canvas: HTMLCanvasElement;
  private queue: SkillCastRequest[] = [];
  private mouseWorld = { x: 0, y: 0 };

  constructor(camera: Camera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;
    this.attach();
  }

  private worldAt(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * Config.internalWidth;
    const py = ((clientY - rect.top) / rect.height) * Config.internalHeight;
    const local = this.camera.screenToWorldLocal(px, py);
    return screenToWorld(local.x, local.y);
  }

  private attach(): void {
    this.canvas.addEventListener('pointermove', (e) => {
      this.mouseWorld = this.worldAt(e.clientX, e.clientY);
    });
    // 우클릭 = 보조 스킬 (슬롯 4)
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 2) {
        this.queue.push({ slot: 4, targetX: this.mouseWorld.x, targetY: this.mouseWorld.y });
      }
    });
    window.addEventListener('keydown', (e) => {
      const map: Record<string, number> = { q: 0, w: 1, e: 2, r: 3 };
      const slot = map[e.key.toLowerCase()];
      if (slot !== undefined) {
        this.queue.push({ slot, targetX: this.mouseWorld.x, targetY: this.mouseWorld.y });
      }
    });
  }

  /** 큐를 비우며 반환 (매 스텝) */
  drain(): SkillCastRequest[] {
    if (this.queue.length === 0) return [];
    const out = this.queue.slice();
    this.queue.length = 0;
    return out;
  }
}
