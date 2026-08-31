import { Container, Graphics } from 'pixi.js';
import { worldToScreen } from '@/render/iso';
import { Config } from '@/core/Config';
import { Rng } from '@/core/Rng';

/**
 * Phase 1 타일 그리드 렌더러.
 *
 * 정적 아이소메트릭 타일을 청크 단위 Graphics로 그린다. 청크는 컨테이너로
 * 묶어 뷰포트 컬링 대상이 된다. (RenderTexture 배칭은 Phase 3에서 도입 예정,
 * 지금은 Graphics 배치로도 성능 목표 내라 단순화)
 *
 * 타일 색상은 시드 기반으로 결정되어 재현 가능하다.
 */

const CHUNK_SIZE = 8; // 청크당 타일 수 (한 변)

interface Chunk {
  container: Container;
  cx: number;
  cy: number;
}

export class TileGridRenderer {
  private root: Container;
  private chunks: Map<string, Chunk> = new Map();
  readonly cols: number;
  readonly rows: number;
  private tileColors: number[];

  /** 컬링 통계 */
  visibleChunks = 0;
  totalChunks = 0;

  constructor(parent: Container, cols: number, rows: number, seed: number) {
    this.root = new Container();
    parent.addChild(this.root);
    this.cols = cols;
    this.rows = rows;

    // 시드 기반 타일 색상 팔레트 (체커 + 약간의 변주)
    const rng = new Rng(seed);
    this.tileColors = new Array(cols * rows);
    const base = [0x2a3d2a, 0x33482f, 0x2e4230];
    for (let i = 0; i < this.tileColors.length; i++) {
      this.tileColors[i] = rng.pick(base);
    }

    this.buildChunks();
  }

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  private buildChunks(): void {
    const chunkCols = Math.ceil(this.cols / CHUNK_SIZE);
    const chunkRows = Math.ceil(this.rows / CHUNK_SIZE);
    this.totalChunks = chunkCols * chunkRows;

    for (let cy = 0; cy < chunkRows; cy++) {
      for (let cx = 0; cx < chunkCols; cx++) {
        const container = new Container();
        const g = new Graphics();
        this.drawChunkTiles(g, cx, cy);
        container.addChild(g);
        this.root.addChild(container);
        this.chunks.set(this.key(cx, cy), { container, cx, cy });
      }
    }
  }

  private drawChunkTiles(g: Graphics, cx: number, cy: number): void {
    const hw = Config.tileWidth / 2;
    const hh = Config.tileHeight / 2;
    const startX = cx * CHUNK_SIZE;
    const startY = cy * CHUNK_SIZE;

    for (let ty = startY; ty < startY + CHUNK_SIZE && ty < this.rows; ty++) {
      for (let tx = startX; tx < startX + CHUNK_SIZE && tx < this.cols; tx++) {
        const s = worldToScreen(tx, ty);
        const color = this.tileColors[ty * this.cols + tx];
        // 다이아몬드 폴리곤
        g.poly([s.x, s.y - hh, s.x + hw, s.y, s.x, s.y + hh, s.x - hw, s.y]);
        g.fill({ color });
        g.stroke({ color: 0x1a2a1a, width: 1, alignment: 0.5 });
      }
    }
  }

  /**
   * 뷰포트 컬링. worldView는 world 컨테이너 로컬 좌표계의 가시 사각형.
   */
  cull(viewLeft: number, viewTop: number, viewRight: number, viewBottom: number): void {
    this.visibleChunks = 0;
    const hw = Config.tileWidth / 2;
    const hh = Config.tileHeight / 2;
    // 청크 대략 경계 여유 (아이소 특성상 넉넉히)
    const pad = CHUNK_SIZE * Config.tileWidth;

    for (const chunk of this.chunks.values()) {
      // 청크 중심 타일의 화면 좌표
      const midTx = chunk.cx * CHUNK_SIZE + CHUNK_SIZE / 2;
      const midTy = chunk.cy * CHUNK_SIZE + CHUNK_SIZE / 2;
      const s = worldToScreen(midTx, midTy);
      const visible =
        s.x + pad + hw >= viewLeft &&
        s.x - pad - hw <= viewRight &&
        s.y + pad + hh >= viewTop &&
        s.y - pad - hh <= viewBottom;
      chunk.container.visible = visible;
      if (visible) this.visibleChunks++;
    }
  }
}
