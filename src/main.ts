import { Container, Graphics } from 'pixi.js';
import { Config } from '@/core/Config';
import { Rng } from '@/core/Rng';
import { GameLoop } from '@/core/GameLoop';
import { World } from '@/core/ecs';
import { PixiApp } from '@/render/PixiApp';
import { Camera } from '@/render/Camera';
import { TileGridRenderer } from '@/render/TileGridRenderer';
import { worldToScreen } from '@/render/iso';
import { TileMap } from '@/world/TileMap';
import { createPlayer } from '@/entities/createPlayer';
import { C, type Position } from '@/entities/components';
import { InputController } from '@/systems/InputController';
import { movementSystem } from '@/systems/movementSystem';
import { animationTickSystem, renderSyncSystem } from '@/systems/renderSyncSystem';
import { DebugOverlay } from '@/ui/DebugOverlay';

/**
 * Phase 2 부트스트랩.
 * ECS + 고정 타임스텝 루프 + 플레이어 클릭 이동 + A* + 8방향 애니메이션(플레이스홀더).
 */
async function main(): Promise<void> {
  const mount = document.getElementById('game-root');
  if (!mount) throw new Error('game-root 엘리먼트를 찾을 수 없습니다');

  const params = new URLSearchParams(location.search);
  const seedParam = params.get('seed');
  const seed = seedParam
    ? Number.isNaN(Number(seedParam))
      ? Rng.seedFromString(seedParam)
      : Number(seedParam) >>> 0
    : (Math.random() * 0xffffffff) >>> 0;

  const pixi = await PixiApp.create(mount);
  const camera = new Camera(pixi.stageRoot, pixi.world);

  // 월드 & 맵
  const world = new World();
  const map = TileMap.demo(48, 48, seed);
  const grid = new TileGridRenderer(pixi.world, map, seed);

  // 엔티티 렌더 레이어 (y-sort)
  const entityLayer = new Container();
  entityLayer.sortableChildren = true;
  pixi.world.addChild(entityLayer);

  // 플레이어 (맵 중앙)
  const spawn = { x: Math.floor(map.cols / 2), y: Math.floor(map.rows / 2) };
  const player = createPlayer(world, entityLayer, { x: spawn.x, y: spawn.y });

  // 카메라 스폰 위치로
  const spawnScreen = worldToScreen(spawn.x + 0.5, spawn.y + 0.5);
  camera.snapTo(spawnScreen.x, spawnScreen.y);

  const overlay = new DebugOverlay(mount);
  const canvas = pixi.app.canvas as HTMLCanvasElement;
  const input = new InputController(world, map, camera, canvas, player);

  // 줌 / 컨텍스트메뉴
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camera.cycleZoom(-e.deltaY);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // 디버그: 경로/호버 시각화
  const debugGfx = new Graphics();
  pixi.world.addChild(debugGfx);

  const positions = world.store<Position>(C.Position);

  const loop = new GameLoop(
    {
      update: (dt) => {
        input.update();
        movementSystem(world, dt);
        animationTickSystem(world, dt);

        // 카메라가 플레이어 추적
        const pos = positions.get(player);
        if (pos) {
          const s = worldToScreen(pos.x + 0.5, pos.y + 0.5);
          camera.follow(s.x, s.y);
        }
        camera.update(dt);
      },
      render: (alpha) => {
        camera.apply();
        renderSyncSystem(world, alpha);

        // 컬링
        const z = camera.zoom;
        const wpos = pixi.world.position;
        grid.cull(
          -wpos.x,
          -wpos.y,
          -wpos.x + Config.internalWidth / z,
          -wpos.y + Config.internalHeight / z,
        );

        drawDebug(debugGfx, input);

        overlay.update({
          fps: loop.fps,
          entities: world.entityCount,
          drawCalls: grid.visibleChunks + world.entityCount,
          seed,
          zoom: camera.zoom,
          visibleChunks: grid.visibleChunks,
          totalChunks: grid.totalChunks,
          mouseTile: input.hoverTile,
        });
      },
    },
    Config.fixedHz,
  );

  loop.start();
  // eslint-disable-next-line no-console
  console.log(`[VVooablo] Phase 2 시작. seed=${seed}`);
}

function drawDebug(g: Graphics, input: InputController): void {
  g.clear();
  // 호버 타일
  const hw = Config.tileWidth / 2;
  const hh = Config.tileHeight / 2;
  const h = input.hoverTile;
  const s = worldToScreen(h.x + 0.5, h.y + 0.5);
  const cx = s.x - hw;
  const cy = s.y - hh;
  g.poly([cx, cy - hh, cx + hw, cy, cx, cy + hh, cx - hw, cy]);
  g.stroke({ color: 0xffff66, width: 1 });

  // 경로
  if (input.lastPath.length > 0) {
    for (const p of input.lastPath) {
      const ps = worldToScreen(p.x + 0.5, p.y + 0.5);
      g.circle(ps.x, ps.y, 2);
      g.fill({ color: 0x66ccff, alpha: 0.8 });
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
});
