import { Config } from '@/core/Config';

/**
 * F1 토글 디버그 오버레이 (HTML 레이어).
 * FPS, 엔티티 수, 드로우콜, 시드, 마우스 타일 좌표 등을 표시.
 */
export interface DebugStats {
  fps: number;
  entities: number;
  drawCalls: number;
  seed: number;
  zoom: number;
  visibleChunks: number;
  totalChunks: number;
  mouseTile: { x: number; y: number };
}

export class DebugOverlay {
  private el: HTMLDivElement;
  visible = true;

  constructor(mount: HTMLElement) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      left: '8px',
      top: '8px',
      padding: '8px 10px',
      background: 'rgba(0,0,0,0.6)',
      color: '#8f8',
      font: '12px/1.5 monospace',
      whiteSpace: 'pre',
      pointerEvents: 'none',
      zIndex: '100',
      borderRadius: '4px',
    } satisfies Partial<CSSStyleDeclaration>);
    mount.appendChild(this.el);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
  }

  update(s: DebugStats): void {
    if (!this.visible) return;
    this.el.textContent = [
      `VVooablo — Phase 8  [F1 토글]`,
      `FPS       : ${s.fps}`,
      `엔티티     : ${s.entities}`,
      `드로우콜   : ${s.drawCalls}`,
      `시드       : ${s.seed}`,
      `줌         : ${s.zoom}x`,
      `청크       : ${s.visibleChunks}/${s.totalChunks}`,
      `해상도     : ${Config.internalWidth}x${Config.internalHeight}`,
      `마우스타일 : (${s.mouseTile.x}, ${s.mouseTile.y})`,
    ].join('\n');
  }
}
