import { Config } from '@/core/Config';
import { Rng } from '@/core/Rng';
import { GameLoop } from '@/core/GameLoop';
import { Game } from '@/core/Game';
import { PixiApp } from '@/render/PixiApp';
import { Camera } from '@/render/Camera';
import { DebugOverlay } from '@/ui/DebugOverlay';
import { FloorHud } from '@/ui/FloorHud';
import { PlayerHud } from '@/ui/PlayerHud';
import { SkillBar } from '@/ui/SkillBar';
import { BossHud } from '@/ui/BossHud';
import { InventoryPanel } from '@/ui/InventoryPanel';
import { CharacterPanel } from '@/ui/CharacterPanel';
import { ShopPanel } from '@/ui/ShopPanel';
import { OptionsPanel } from '@/ui/OptionsPanel';
import { xpProgress } from '@/systems/leveling';
import { loadOptions, saveOptions } from '@/save/options';
import { SoundSystem } from '@/audio/SoundSystem';
import { saveGame, loadGame } from '@/save/storage';

/**
 * Phase 9 부트스트랩.
 * 저장/로드(IndexedDB) + 옵션 + 사운드까지 통합된 진입점.
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

  // 옵션 + 사운드
  const options = loadOptions();
  camera.setZoomIndex(options.defaultZoomIndex);
  const sound = new SoundSystem(options);
  game.sound = sound;
  // 자동 저장 연결
  game.onAutosave = (data) => void saveGame(data);

  // 첫 사용자 상호작용 시 오디오 컨텍스트 초기화 (브라우저 정책)
  const initAudio = () => {
    sound.init();
    sound.resume();
    window.removeEventListener('pointerdown', initAudio);
    window.removeEventListener('keydown', initAudio);
  };
  window.addEventListener('pointerdown', initAudio);
  window.addEventListener('keydown', initAudio);

  // 저장 슬롯 0 자동 로드
  try {
    const existing = await loadGame(0);
    if (existing) game.applySave(existing);
  } catch {
    // 무시 (첫 실행 등)
  }

  const overlay = new DebugOverlay(mount);
  const hud = new FloorHud(mount, {
    onReseed: (s) => game.reseed(s),
    onDescend: () => game.descend(),
    onAscend: () => game.ascend(),
  });
  const playerHud = new PlayerHud(mount, {
    onRespawn: () => game.respawn(),
  });
  const skillBar = new SkillBar(mount);
  const bossHud = new BossHud(mount);
  const inventoryPanel = new InventoryPanel(mount, {
    onEquip: (uid) => game.equip(uid),
    onUnequip: (slot) => game.unequip(slot),
  });
  const characterPanel = new CharacterPanel(mount, {
    onSpendStat: (stat) => game.spendStat(stat),
    onAllocTalent: (id) => game.allocTalent(id),
    onResetTalents: () => game.resetTalents(),
  });
  const shopPanel = new ShopPanel(mount, {
    onBuy: (item) => game.buy(item),
    onSell: (uid) => game.sell(uid),
    onBuyPotion: () => game.buyPotion(),
  });
  const optionsPanel = new OptionsPanel(mount, options, {
    onChange: (opts) => {
      saveOptions(opts);
      sound.setOptions(opts);
    },
    onSave: () => void saveGame(game.buildSaveData(0)),
    onLoad: () =>
      void loadGame(0).then((data) => {
        if (data) game.applySave(data);
      }),
  });
  void optionsPanel; // ESC로 자체 토글, 프레임 갱신 불필요

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
        if (ph)
          playerHud.update(ph.hp, ph.maxHp, game.playerDead, {
            level: game.profile.level,
            xpRatio: xpProgress(game.profile),
            potions: game.profile.potions,
          });
        skillBar.update(game.playerSkills());
        bossHud.update(game.bossInfo());
        inventoryPanel.update(game.inventory, game.equipment);
        characterPanel.update(game.profile);
        shopPanel.setVisible(game.nearMerchant());
        shopPanel.update(game.profile, game.shopStock);
      },
    },
    Config.fixedHz,
  );

  loop.start();
  // eslint-disable-next-line no-console
  console.log(`[VVooablo] Phase 9 시작. baseSeed=${seed}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
});
