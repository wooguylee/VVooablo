import { Application, Container } from 'pixi.js';
import { Config } from '@/core/Config';

/**
 * 픽셀 퍼펙트 PixiJS v8 애플리케이션 래퍼.
 * - WebGPU 우선, WebGL 폴백 (preference 'webgpu')
 * - nearest 스케일, roundPixels, antialias off
 * - 내부 해상도 1x(고정 캔버스 크기) → CSS로 정수 배율 업스케일
 */
export class PixiApp {
  readonly app: Application;
  /** 카메라가 이동시키는 월드 컨테이너 */
  readonly world: Container;
  /** 정수 배율 줌 컨테이너 (world를 감싼다) */
  readonly stageRoot: Container;

  private constructor(app: Application) {
    this.app = app;
    this.stageRoot = new Container();
    this.world = new Container();
    this.stageRoot.addChild(this.world);
    app.stage.addChild(this.stageRoot);
  }

  static async create(mount: HTMLElement): Promise<PixiApp> {
    const app = new Application();
    await app.init({
      width: Config.internalWidth,
      height: Config.internalHeight,
      backgroundColor: 0x0a0a0f,
      antialias: false,
      roundPixels: true,
      preference: 'webgpu',
      powerPreference: 'high-performance',
      autoDensity: false,
      resolution: 1,
    });

    // 픽셀 퍼펙트 업스케일: 캔버스는 내부 해상도, CSS로 화면을 채운다
    const canvas = app.canvas as HTMLCanvasElement;
    canvas.style.imageRendering = 'pixelated';
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    mount.appendChild(canvas);

    const instance = new PixiApp(app);
    instance.resize(mount);
    window.addEventListener('resize', () => instance.resize(mount));
    return instance;
  }

  /** CSS 크기를 화면에 맞춰 늘린다 (내부 해상도는 고정). */
  private resize(mount: HTMLElement): void {
    const canvas = this.app.canvas as HTMLCanvasElement;
    const scaleX = mount.clientWidth / Config.internalWidth;
    const scaleY = mount.clientHeight / Config.internalHeight;
    const scale = Math.max(scaleX, scaleY);
    canvas.style.width = `${Config.internalWidth * scale}px`;
    canvas.style.height = `${Config.internalHeight * scale}px`;
    // 중앙 정렬 (오버플로 잘림)
    canvas.style.left = `${(mount.clientWidth - Config.internalWidth * scale) / 2}px`;
    canvas.style.top = `${(mount.clientHeight - Config.internalHeight * scale) / 2}px`;
  }
}
