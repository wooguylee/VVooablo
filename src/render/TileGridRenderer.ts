import { Container, Graphics } from 'pixi.js';
import { worldToScreen } from '@/render/iso';
import { Config } from '@/core/Config';
import { Rng } from '@/core/Rng';
import { TileMap, TileType } from '@/world/TileMap';

/**
 * 아이소메트릭 타일 그리드 렌더러.
 *
 * TileMap을 받아 바닥(다이아몬드) + 벽(입체 블록)을 청크 단위로 그린다.
 * 청크는 컨테이너로 묶여 뷰포트 컬링 대상이 된다.
 * 타일 색상은 시드 기반으로 결정되어 재현 가능하다.
 *
 * (RenderTexture 배칭은 Phase 10 최적화에서 도입 예정)
 */

const CHUNK_SIZE = 8;
const WALL_HEIGHT = 14;

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
  private floorColors: number[];
  private map: TileMap;

  visibleChunks = 0;
  totalChunks = 0;

  constructor(parent: Container, map: TileMap, seed: number) {
    this.root = new Container();
    this.root.sortableChildren = false;
    parent.addChild(this.root);
    this.map = map;
    this.cols = map.cols;
    this.rows = map.rows;

    const rng = new Rng(seed);
    this.floorColors = new Array(this.cols * this.rows);
    const base = [0x2a3d2a, 0x33482f, 0x2e4230];
    for (let i = 0; i < this.floorColors.length; i++) {
      this.floorColors[i] = rng.pick(base);
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

    // 바닥 → 벽 순서로 (뒤에서 앞으로: y-sort 유지 위해 타일 순서대로)
    for (let ty = startY; ty < startY + CHUNK_SIZE && ty < this.rows; ty++) {
      for (let tx = startX; tx < startX + CHUNK_SIZE && tx < this.cols; tx++) {
        const s = worldToScreen(tx, ty);
        if (this.map.get(tx, ty) === TileType.Wall) {
          this.drawWall(g, s.x, s.y, hw, hh);
        } else {
          const color = this.floorColors[ty * this.cols + tx];
          g.poly([s.x, s.y - hh, s.x + hw, s.y, s.x, s.y + hh, s.x - hw, s.y]);
          g.fill({ color });
          g.stroke({ color: 0x1a2a1a, width: 1, alignment: 0.5 });
        }
      }
    }
  }

  private drawWall(g: Graphics, x: number, y: number, hw: number, hh: number): void {
    const h = WALL_HEIGHT;
    // 좌측면
    g.poly([x - hw, y, x, y + hh, x, y + hh - h, x - hw, y - h]);
    g.fill({ color: 0x3a3a48 });
    // 우측면
    g.poly([x + hw, y, x, y + hh, x, y + hh - h, x + hw, y - h]);
    g.fill({ color: 0x2c2c38 });
    // 윗면
    g.poly([x, y - hh - h, x + hw, y - h, x, y + hh - h, x - hw, y - h]);
    g.fill({ color: 0x50506a });
    g.stroke({ color: 0x1a1a22, width: 1 });
  }

  cull(viewLeft: number, viewTop: number, viewRight: number, viewBottom: number): void {
    this.visibleChunks = 0;
    const hw = Config.tileWidth / 2;
    const hh = Config.tileHeight / 2;
    const pad = CHUNK_SIZE * Config.tileWidth;

    for (const chunk of this.chunks.values()) {
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
