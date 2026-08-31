# VVooablo — 웹 기반 아이소메트릭 픽셀아트 ARPG

브라우저에서 동작하는 Diablo 스타일 아이소메트릭 픽셀아트 액션 RPG.
완전 클라이언트 사이드(서버 없음), 정적 호스팅 가능.

## 기술 스택
- **TypeScript** (strict) + **Vite 5**
- **PixiJS v8** 렌더링 (WebGPU 우선, WebGL 폴백)
- 경량 **ECS** (외부 라이브러리 없이 직접 구현)
- UI: HTML/CSS 오버레이
- 테스트: **Vitest**
- 린트/포맷: ESLint + Prettier
- 저장: IndexedDB (idb)

## 실행
```bash
npm install
npm run dev      # 개발 서버
npm run build    # 타입체크 + 프로덕션 빌드
npm run test     # 단위 테스트
npm run lint     # 린트
```

## Phase 1 (구현 완료)
아이소메트릭 타일 그리드 렌더 + 카메라/줌 + 디버그 오버레이 + 픽셀 퍼펙트 파이프라인.

### 조작
- **방향키 / WASD**: 카메라 이동
- **마우스 휠**: 정수 배율 줌 (1x / 2x / 3x)
- **마우스 이동**: 가리키는 타일 하이라이트
- **좌클릭**: 화면 흔들림 데모
- **F1**: 디버그 오버레이 토글

### 시드 재현
URL 쿼리로 시드 지정: `?seed=12345` 또는 `?seed=hello` (문자열은 해시).
미지정 시 무작위 시드 생성 후 콘솔/디버그 오버레이에 표시.

## 핵심 설계 결정 (Phase 1)
| 항목 | 결정 |
|------|------|
| 아이소 투영 | 2:1 다이아몬드, 32x16px 타일 (`Config.ts`에서 변경 가능) |
| 좌표 변환 | `sx=(wx-wy)*16, sy=(wx+wy)*8`, 역변환은 선형계 역산 (`src/render/iso.ts`) |
| 픽셀 퍼펙트 | 내부 해상도 1280x720 고정, `nearest`/`roundPixels`/antialias off, CSS `image-rendering: pixelated`로 정수 배율 업스케일 |
| 줌 | 정수 배율(1/2/3x)만 허용해 픽셀 왜곡 방지 |
| 무작위성 | 모두 시드 기반 mulberry32 (`src/core/Rng.ts`) → 리플레이/디버깅 가능 |
| 게임 루프 | 고정 타임스텝 60Hz + 렌더 보간(alpha), 나선형 지연 방지 |
| 타일 렌더 | 8x8 청크 컨테이너 단위 + 뷰포트 컬링 |

## 폴더 구조
```
src/
  core/    (Config, Rng, EventBus, GameLoop)
  render/  (PixiApp, Camera, iso 좌표, TileGridRenderer)
  world/   (Phase 3~)
  entities/(Phase 2~)
  systems/ (Phase 2~)
  data/    (Phase 4~)
  ui/      (DebugOverlay)
  save/    (Phase 9~)
  assets/  (Phase 10~)
tests/     (iso 좌표 왕복, RNG 결정성)
doc/       (개발 로그, 세션 기록)
```

## 에셋 정책
저작권 있는 에셋(블리자드 스프라이트/사운드/폰트/아이콘)은 사용하지 않는다.
현재 아트는 전부 코드로 생성한 플레이스홀더 도형이며, 이후 CC0 에셋 또는
직접 제작 스프라이트로 교체 가능한 구조로 설계했다.

## 라이선스
소스 코드: 프로젝트 소유자 정책에 따름. 서드파티 에셋 미포함.
