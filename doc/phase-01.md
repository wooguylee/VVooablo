# Phase 1 — 프로젝트 셋업 + Pixi 픽셀아트 파이프라인 + 아이소메트릭 타일 그리드

작업일: 2026-08-31
상태: **완료** (build/test/lint 통과)

## 착수 전 요약 (권장안 결정)

**(a) 라이브러리 버전**
- PixiJS `v8.6.x` (WebGPU 우선, WebGL 폴백)
- Vite `v5.4.x`, TypeScript `v5.7.x` (strict)
- Vitest `v2.1.x`, ESLint 8 + Prettier 3, idb `v8`, @types/node 20

**(b) 폴더 구조**
명세의 `src/{core,render,world,entities,systems,data,ui,save,assets}` + `tests/` + `doc/` 채택.
Phase 1은 `core`, `render`, `ui`만 실제 사용.

**(c) 아이소메트릭 좌표 변환**
2:1 다이아몬드(32x16px). `screenX=(wx-wy)*16`, `screenY=(wx+wy)*8`.
역변환은 `a=sx/16=wx-wy`, `b=sy/8=wx+wy` → `wx=(a+b)/2, wy=(b-a)/2`. 왕복 정확성 테스트로 검증.

**(d) 픽셀 퍼펙트 업스케일**
내부 해상도 1280x720 고정 캔버스로 렌더(`nearest`, `roundPixels`, `antialias:false`),
CSS `image-rendering: pixelated` + 정수 배율로 화면 확대. 줌은 1/2/3x 정수만.

## 구현 산출물

### core/
- `Config.ts` — 타일 크기, 내부 해상도, 줌 레벨, 카메라 파라미터 단일 출처
- `Rng.ts` — mulberry32 시드 PRNG. `next/range/int/chance/pick`, 상태 저장/복원, 문자열 시드 해시
- `EventBus.ts` — 타입 안전 이벤트 버스 (on/off/emit)
- `GameLoop.ts` — 고정 타임스텝 60Hz + 렌더 보간(alpha) + FPS 계측, 나선형 지연 방지

### render/
- `iso.ts` — `worldToScreen`/`screenToWorld`/`screenToTile`/`depthKey`
- `PixiApp.ts` — Pixi v8 초기화(픽셀 퍼펙트), 반응형 CSS 업스케일, world/stageRoot 컨테이너
- `Camera.ts` — 스무스 팔로우 + 데드존 + 정수 줌 + 화면 흔들림, 픽셀 스냅
- `TileGridRenderer.ts` — 8x8 청크 단위 다이아몬드 타일 + 뷰포트 컬링, 시드 기반 색상

### ui/
- `DebugOverlay.ts` — F1 토글, FPS/엔티티/드로우콜/시드/줌/청크/마우스타일 표시

### 진입점
- `index.html`, `src/main.ts` — 48x48 타일 맵 데모, 카메라 이동/줌/커서/흔들림, 시드 URL 지원

### tests/
- `iso.test.ts` — 좌표 왕복 정확성, screenToTile, depthKey (5 tests)
- `rng.test.ts` — 결정성, 범위, 상태 복원, 문자열 시드 (6 tests)

## 검증 결과
- `npm run test`: **11 passed**
- `npm run build`: 성공 (tsc --noEmit + vite build)
- `npm run lint`: 경고/오류 없음

## 다음 Phase (2) 예고
ECS + 고정 타임스텝 루프 결합 + 플레이어 클릭 이동 + A* 경로탐색 + 8방향 애니메이션(플레이스홀더 도형).

## 미결 / 향후 개선 메모
- RenderTexture 배칭은 타일 수가 커지는 Phase 3에서 도입 예정 (현재는 Graphics 청크로 충분).
- 카메라 흔들림에 `Math.random()` 사용 중 → 시각 효과라 결정성 불필요하나, 리플레이 완전성 위해 Phase 후반 시드 RNG로 교체 검토.
