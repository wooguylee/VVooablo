import { Graphics } from 'pixi.js';
import { Config } from '@/core/Config';
import { Rng } from '@/core/Rng';
import { GameLoop } from '@/core/GameLoop';
import { PixiApp } from '@/render/PixiApp';
import { Camera } from '@/render/Camera';
import { TileGridRenderer } from '@/render/TileGridRenderer';
import { screenToTile, worldToScreen } from '@/render/iso';
import { DebugOverlay } from '@/ui/DebugOverlay';

/**
 * Phase 1 부트스트랩.
 * 아이소메트릭 타일 그리드 렌더 + 카메라/줌 + 디버그 오버레이 데모.
 * 방향키/WASD로 카메라 이동, 마우스 휠로 정수 배율 줌, F1로 디버그.
 */
async function main(): Promise<void> {
  const mount = document.getElementById('game-root');
  if (!mount) throw new Error('game-root 엘리먼트를 찾을 수 없습니다');

  // 시드: URL ?seed= 지원 (재현 가능)
  const params = new URLSearchParams(location.search);
  const seedParam = params.get('seed');
  const seed = seedParam
    ? Number.isNaN(Number(seedParam))
      ? Rng.seedFromString(seedParam)
      : Number(seedParam) >>> 0
    : (Math.random() * 0xffffffff) >>> 0;

  const pixi = await PixiApp.create(mount);
  const camera = new Camera(pixi.stageRoot, pixi.world);
  const grid = new TileGridRenderer(pixi.world, 48, 48, seed);
  const overlay = new DebugOverlay(mount);

  // 데모 커서: 마우스가 가리키는 타일 하이라이트
  const cursor = new Graphics();
  pixi.world.addChild(cursor);

  // 카메라를 맵 중앙으로
  const center = worldToScreen(24, 24);
  camera.snapTo(center.x, center.y);

  // ---- 입력 상태 ----
  const keys = new Set<string>();
  window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  const canvas = pixi.app.canvas as HTMLCanvasElement;
  let mouseTile = { x: 0, y: 0 };
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * Config.internalWidth;
    const py = ((e.clientY - rect.top) / rect.height) * Config.internalHeight;
    const local = camera.screenToWorldLocal(px, py);
    mouseTile = screenToTile(local.x, local.y);
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camera.cycleZoom(-e.deltaY);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  // 데모: 좌클릭 시 화면 흔들림
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) camera.shake(6, 0.3);
  });

  const CAM_SPEED = 200; // 화면 px/초

  const loop = new GameLoop(
    {
      update: (dt) => {
        // 카메라 수동 이동
        let dx = 0;
        let dy = 0;
        if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
        if (keys.has('arrowright') || keys.has('d')) dx += 1;
        if (keys.has('arrowup') || keys.has('w')) dy -= 1;
        if (keys.has('arrowdown') || keys.has('s')) dy += 1;
        if (dx || dy) {
          const c = camera.getCenter();
          camera.snapTo(c.x + dx * CAM_SPEED * dt, c.y + dy * CAM_SPEED * dt);
        }
        camera.update(dt);
      },
      render: () => {
        camera.apply();

        // 뷰포트 컬링
        const z = camera.zoom;
        const wpos = pixi.world.position;
        const viewLeft = -wpos.x;
        const viewTop = -wpos.y;
        const viewRight = viewLeft + Config.internalWidth / z;
        const viewBottom = viewTop + Config.internalHeight / z;
        grid.cull(viewLeft, viewTop, viewRight, viewBottom);

        // 커서 타일 하이라이트
        cursor.clear();
        if (
          mouseTile.x >= 0 &&
          mouseTile.y >= 0 &&
          mouseTile.x < grid.cols &&
          mouseTile.y < grid.rows
        ) {
          const s = worldToScreen(mouseTile.x + 0.5, mouseTile.y + 0.5);
          const hw = Config.tileWidth / 2;
          const hh = Config.tileHeight / 2;
          const cx = s.x - hw;
          const cy = s.y - hh;
          cursor.poly([cx, cy - hh, cx + hw, cy, cx, cy + hh, cx - hw, cy]);
          cursor.stroke({ color: 0xffff66, width: 1 });
        }

        overlay.update({
          fps: loop.fps,
          entities: 0,
          drawCalls: grid.visibleChunks + 1, // 근사치 (Phase 1)
          seed,
          zoom: camera.zoom,
          visibleChunks: grid.visibleChunks,
          totalChunks: grid.totalChunks,
          mouseTile,
        });
      },
    },
    Config.fixedHz,
  );

  loop.start();

  // eslint-disable-next-line no-console
  console.log(`[VVooablo] Phase 1 시작. seed=${seed}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
});
