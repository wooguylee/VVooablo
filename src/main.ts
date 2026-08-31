import { Config } from '@/core/Config';
import { Rng } from '@/core/Rng';
import { GameLoop } from '@/core/GameLoop';
import { Game } from '@/core/Game';
import { PixiApp } from '@/render/PixiApp';
import { Camera } from '@/render/Camera';
import { DebugOverlay } from '@/ui/DebugOverlay';
import { FloorHud } from '@/ui/FloorHud';
import { PlayerHud } from '@/ui/PlayerHud';

/**
 * Phase 3 부트스트랩.
 * 절차적 던전 생성 2종(방+복도 / 동굴) + 층 이동 + 시드 재현 + 충돌/컬링.
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
  const canvas = pixi.app.canvas as HTMLCanvasElement;

  const game = new Game(pixi.world, camera, canvas, seed);
  const overlay = new DebugOverlay(mount);
  const hud = new FloorHud(mount, {
    onReseed: (s) => game.reseed(s),
    onDescend: () => game.descend(),
    onAscend: () => game.ascend(),
  });
  const playerHud = new PlayerHud(mount, {
    onRespawn: () => game.respawn(),
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camera.cycleZoom(-e.deltaY);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const loop = new GameLoop(
    {
      update: (dt) => game.update(dt),
      render: (alpha) => {
        game.render(alpha);
        overlay.update({
          fps: loop.fps,
          entities: game.world.entityCount,
          drawCalls: game.visibleChunks + game.world.entityCount,
          seed: game.baseSeed,
          zoom: camera.zoom,
          visibleChunks: game.visibleChunks,
          totalChunks: game.totalChunks,
          mouseTile: game.hoverTile,
        });
        hud.update(game.depth, game.floor.dungeon.seed, game.floor.dungeon.kind, game.floor.monsterLevel);
        const ph = game.playerHealth();
        if (ph) playerHud.update(ph.hp, ph.maxHp, game.playerDead);
      },
    },
    Config.fixedHz,
  );

  loop.start();
  // eslint-disable-next-line no-console
  console.log(`[VVooablo] Phase 3 시작. baseSeed=${seed}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
});
