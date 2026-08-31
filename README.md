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

## 검증 방법
- **단위/통합 테스트**: `npm run test` — 전투 공식, 던전 생성, 경로탐색, 좌표 변환, 상태이상 등 순수 로직 + 헤드리스 통합 시나리오(이동/전투/AI/사망).
- **브라우저 스모크**: 실제 Chromium(Playwright)으로 게임 페이지를 띄워 콘솔/페이지 오류·canvas 렌더·입력(이동/스킬/층이동/재생성)을 검증.
  ```bash
  npm run build
  npx vite preview --port 4173   # 별도 터미널에서 실행
  npm run smoke                  # Playwright 스모크 (playwright 설치 필요)
  ```

## 게임 플레이 (Phase 1~10 구현 완료)

마을 허브에서 시작 → 포탈로 던전 진입 → 절차적 던전 탐험·전투 → 아이템/성장 → 보스.

### 조작
- **좌클릭(홀드)**: 이동
- **우클릭**: 보조 스킬(토템)
- **Q / W / E / R**: 스킬 (휘두르기 / 돌진 / 투사체 연사 / 원형 폭발)
- **1~4**: 포션
- **마우스 휠**: 정수 배율 줌 (1x / 2x / 3x)
- **I**: 인벤토리/장비 · **C**: 캐릭터(스탯/특성) · **ESC**: 옵션 · **F1**: 디버그
- **모바일**: 터치 시 가상 조이스틱 + 스킬 버튼 자동 표시

### 시드 재현
URL 쿼리로 시드 지정: `?seed=12345` 또는 `?seed=hello`(문자열 해시).
던전/드롭/스폰 등 모든 무작위성이 시드 기반이라 완전 재현 가능.

## 구현 범위 (Phase별)
1. 픽셀 퍼펙트 파이프라인 + 아이소 타일 + 카메라/줌 + 디버그
2. ECS + 클릭 이동 + A*(옥타일) + 8방향 애니메이션
3. 절차적 던전 2종(BSP/셀룰러) + 층 이동 + 도달성 검증
4. 전투 코어(격리된 데미지 공식/히트박스/데미지 숫자) + 근접 몬스터 + 스폰
5. 스킬 5종 + 투사체 + 상태이상 4종 + 파티클(풀링)
6. 몬스터 4종 + 엘리트 접사 + 보스 2페이즈 텔레그래프 + 군집 회피
7. 아이템/접사 롤링 + 드롭 + 인벤토리/장비 + 스탯 재계산 + 툴팁
8. 레벨링 + 특성 트리(3분기×5) + 마을 허브 + 상점 + 포션
9. 저장/로드(IndexedDB, 슬롯3, 마이그레이션) + 옵션 + 사운드(WebAudio)
10. 최적화(풀링/청크 캐싱) + 모바일 입력 + 아틀라스 교체 가이드 + 배포

## 검증 방법
- **단위/통합/성능 테스트**: `npm run test` (122 tests) — 전투 공식, 던전 생성, 경로탐색, 좌표 변환, 상태이상, 아이템/레벨링/저장 + 헤드리스 통합(이동/전투/AI) + 부하(200유닛×300틱).
- **브라우저 스모크**: 실제 Chromium(Playwright)으로 콘솔/페이지 오류·canvas 렌더·입력 검증.
  ```bash
  npm run build
  npm run serve:dist   # 별도 터미널
  npm run smoke        # Playwright 스모크
  ```

## 핵심 설계 결정
| 항목 | 결정 |
|------|------|
| 아이소 투영 | 2:1 다이아몬드, 32x16px 타일 (`Config.ts`) |
| 좌표 변환 | `sx=(wx-wy)*16, sy=(wx+wy)*8`, 역변환 선형계 역산 (`src/render/iso.ts`) |
| 픽셀 퍼펙트 | 내부 1280x720 고정, `nearest`/`roundPixels`/antialias off, CSS `pixelated` 정수 업스케일 |
| 줌 | 정수 배율(1/2/3x)만 |
| 무작위성 | 전부 시드 기반 mulberry32 (`src/core/Rng.ts`) |
| 게임 루프 | 고정 60Hz + 렌더 보간(alpha), 나선형 지연 방지 |
| 데미지 공식 | 격리 모듈 (`src/systems/combat/damage.ts`), 문서화·단위 테스트 |
| 성능 | 오브젝트 풀링(투사체/파티클/데미지숫자) + 청크 `cacheAsTexture` + 뷰포트 컬링 + 공간 해시 |
| 저장 | IndexedDB(세이브 v2, 마이그레이션) + localStorage(옵션) |

## 폴더 구조
```
src/
  core/    (Config, Rng, EventBus, GameLoop, ecs, Game)
  render/  (PixiApp, Camera, iso, TileGridRenderer, Animator, 이펙트)
  world/   (던전 생성, TileMap, 경로탐색, 스폰, 공간해시, Town)
  entities/(플레이어/몬스터/토템/투사체 팩토리 + 컴포넌트, 프로필)
  systems/ (이동, 전투, 상태이상, AI, 스킬, 아이템, 레벨링, 특성, 상점, 포션)
  data/    (skills, affixes, monsters, items, talents, eliteAffixes)
  ui/      (HUD, 인벤토리, 스킬바, 캐릭터/옵션/상점 패널, 조이스틱)
  save/    (직렬화, 마이그레이션, 저장소, 옵션)
  audio/   (SoundSystem)
tests/     (18개 스위트, 122 tests)
doc/       (Phase별 로그, 아틀라스 교체/배포 가이드)
```

## 문서
- `doc/phase-01.md` ~ `phase-10.md`: Phase별 구현 로그
- `doc/sprite-atlas-guide.md`: 플레이스홀더 → 스프라이트 아틀라스 교체 가이드
- `doc/deployment.md`: 정적 배포 가이드

## 에셋 정책
저작권 있는 에셋(블리자드 스프라이트/사운드/폰트/아이콘)은 사용하지 않는다.
현재 아트는 전부 코드로 생성한 플레이스홀더 도형이며, 이후 CC0 에셋 또는
직접 제작 스프라이트로 교체 가능한 구조로 설계했다.

## 라이선스
소스 코드: 프로젝트 소유자 정책에 따름. 서드파티 에셋 미포함.
