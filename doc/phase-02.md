# Phase 2 — ECS + 클릭 이동 + A* + 8방향 애니메이션

작업일: 2026-08-31
상태: **완료** (build/test/lint 통과, 29 tests)

## 구현 산출물

### core/
- `ecs.ts` — 경량 ECS. `World`(엔티티 수명 + free list 재사용), `ComponentStore<T>`(Map 기반). 시스템은 순수 함수로 분리.

### entities/
- `components.ts` — Position(prev 포함, 렌더 보간용), Movement(A* 경로/속도), Facing(8방향/애니 상태/시간), SpriteRef, PlayerControlled. 스토어 키 상수 `C`.
- `createPlayer.ts` — 플레이어 엔티티 팩토리 (플레이스홀더 스프라이트 부착).

### world/
- `TileMap.ts` — Uint8Array 격자, walkable 콜백, Phase 2 데모 맵(테두리 벽 + 시드 장애물, 스폰 주변 클리어).
- `pathfinding.ts` — A*(옥타일 휴리스틱, 8방향, 코너 컷팅 방지), 경로 스무딩(시선 병합), Bresenham 시선 검사.

### systems/
- `direction.ts` — 월드 이동 벡터 → 화면 기준 8방향 인덱스, 방향별 색상.
- `movementSystem.ts` — A* 경로를 따라 타일 단위 이동 + 방향/애니 상태 갱신.
- `renderSyncSystem.ts` — 위치 보간(alpha) + (x+y) y-sort(zIndex) + 애니메이션 적용. `animationTickSystem`(고정 스텝 애니 시간 누적).
- `InputController.ts` — 좌클릭/터치 홀드 이동, 목표 타일 변경 시 A* 재탐색 + 스무딩 주입.

### render/
- `Animator.ts` — 8방향 플레이스홀더 스프라이트(몸통+방향 부리), 상태별 효과(walk 바운스, attack/cast 펄스, hit 점멸, death 페이드). 아틀라스 교체 대비 상태/방향/시간만 입력.
- `TileGridRenderer.ts` — TileMap 기반 바닥+입체 벽 렌더, 청크 컬링 유지.

### 진입점
- `main.ts` — ECS/맵/플레이어/입력/시스템 결선. 카메라 플레이어 추적, 경로/호버 디버그 시각화.

## 설계 메모
- 엔티티 월드 좌표는 정수 타일 기준, 렌더 시 +0.5 오프셋으로 타일 중심 정렬.
- 렌더 보간: Position에 prevX/prevY 저장, 고정 스텝마다 갱신 → 렌더에서 alpha 보간.
- y-sort는 entityLayer의 sortableChildren + zIndex=depthKey(x+y)로 처리. 벽 가림은 Phase 3에서 벽도 엔티티/청크 zIndex 통합 시 정교화 예정.

## 검증 결과
- `npm run test`: **29 passed** (iso 5, rng 6, ecs 3, pathfinding 9, direction 6)
- `npm run build`: 성공
- `npm run lint`: 오류 없음

## 다음 Phase (3) 예고
절차적 던전 생성 2종(BSP 방+복도, 셀룰러 오토마타 동굴) + 도달성 플러드필 검증 + 층 이동 + 충돌/컬링 + 시드 재입력.

## 미결
- 현재 벽은 타일 렌더러에만 존재, 엔티티가 벽 뒤로 가려지는 정교한 depth는 Phase 3에서 벽 depth를 엔티티 정렬과 통합해 개선.
- 이동 시 다른 엔티티와의 충돌(회피)은 AI/군집 도입되는 Phase 6에서 처리.
