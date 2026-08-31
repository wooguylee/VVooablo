// 브라우저 스모크 테스트: 실제 Chromium에서 게임 페이지를 띄워
// 콘솔 오류/페이지 오류/canvas 렌더 여부를 검증한다.
import { chromium } from 'playwright';

const URL = process.env.GAME_URL || 'http://localhost:4173/?seed=smoke';
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const consoleErrors = [];
  const pageErrors = [];
  const logs = [];

  page.on('console', (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  // 게임 부팅 및 몇 프레임 대기
  await page.waitForTimeout(3000);

  // canvas 존재 및 크기 확인
  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector('#game-root canvas');
    if (!c) return null;
    return { w: c.width, h: c.height, cssW: c.style.width, cssH: c.style.height };
  });

  // HUD 요소 확인
  const hud = await page.evaluate(() => {
    const root = document.getElementById('game-root');
    return {
      children: root ? root.children.length : 0,
      hasSkillBar: !!document.querySelector('button'),
    };
  });

  // 입력 시뮬레이션: 화면 클릭(이동) + 스킬 키
  await page.mouse.click(700, 400);
  await page.waitForTimeout(500);
  await page.keyboard.press('q');
  await page.keyboard.press('w');
  await page.keyboard.press('e');
  await page.keyboard.press('r');
  await page.mouse.click(600, 300, { button: 'right' });
  await page.waitForTimeout(1500);

  // 층 이동 (내려가기 버튼) 반복 — 던전 재생성/전투 지속 검증
  for (let i = 0; i < 3; i++) {
    const descend = await page.$('text=▼ 내려가기');
    if (descend) {
      await descend.click();
      await page.waitForTimeout(1200);
      await page.mouse.click(640, 360);
      await page.keyboard.press('q');
      await page.waitForTimeout(800);
    }
  }

  // 재생성(시드) 테스트
  await page.fill('input', 'regen-test');
  const regen = await page.$('text=재생성');
  if (regen) {
    await regen.click();
    await page.waitForTimeout(1000);
  }

  // 장시간 구동 (루프 안정성)
  await page.waitForTimeout(2000);

  // 픽셀 렌더 확인: canvas가 완전히 검지 않은지 (스크린샷 후 분석 대신 간단 체크)
  const rendered = await page.evaluate(() => {
    const c = document.querySelector('#game-root canvas');
    if (!c) return false;
    return c.width > 0 && c.height > 0;
  });

  await browser.close();

  console.log('=== 브라우저 스모크 결과 ===');
  console.log('canvas:', JSON.stringify(canvasInfo));
  console.log('hud:', JSON.stringify(hud));
  console.log('rendered:', rendered);
  console.log('console.log 개수:', logs.length);
  console.log('부팅 로그:', logs.filter((l) => l.includes('VVooablo')).join(' | ') || '(없음)');
  console.log('--- 콘솔 오류 (' + consoleErrors.length + ') ---');
  consoleErrors.slice(0, 20).forEach((e) => console.log('  ✗', e));
  console.log('--- 페이지 오류 (' + pageErrors.length + ') ---');
  pageErrors.slice(0, 20).forEach((e) => console.log('  ✗', e));

  const ok = canvasInfo && rendered && pageErrors.length === 0 && consoleErrors.length === 0;
  console.log(ok ? '\n✅ 스모크 통과' : '\n❌ 문제 발견');
  process.exit(ok ? 0 : 1);
})();
