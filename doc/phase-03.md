# Phase 3 — 절차적 던전 생성 2종 + 층 이동 + 시드 재현

작업일: 2026-08-31
상태: **완료** (build/test/lint 통과, 39 tests)

## 구현 산출물

### world/dungeon/
- `common.ts` — Dungeon/DungeonFeatures 타입, `floodFill`(4방향 도달성), `verifyReachable`(입구→특수지점 검증), `keepLargestRegion`(섬 제거).
- `rooms.ts` — BSP 방+복도. 재귀 이분할 → 리프 방 배치 → 형제 L자 복도 연결. 입구=첫 방, 출구=최원거리 방, 보스=출구, 보물=중간 방. 도달성 실패 시 시드 파생으로 최대 8회 재시도.
- `cave.ts` — 셀룰러 오토마타. 초기 45% 벽 → 4-5 규칙 5회 반복 → 최대 연결 영역만 유지. 입구=영역 시작점, 출구=최원거리 타일.

### world/
- `DungeonManager.ts` — `floorSeed`(baseSeed+depth 파생), `monsterLevelForDepth`(깊이 스케일링), `generateFloor`(홀수 층=방+복도, 짝수 층=동굴).

### render/
- `FeatureMarkers.ts` — 입구(초록)/출구(빨강)/보물(노랑) 마름모 마커.

### ui/
- `FloorHud.ts` — 층/시드/몬스터레벨 표시, 시드 재입력·재생성, ▼내려가기/▲올라가기 버튼.

### core/
- `Game.ts` — 오케스트레이터. 층 생성/전환(loadFloor), 재시드, 하강/상승, 계단 도달 감지(이동 완료 시 출구 타일이면 다음 층), 플레이어 배치, 시스템 결선. main.ts를 얇게 유지.

### 진입점
- `main.ts` — Game/HUD/오버레이 결선으로 축소.

## 설계 메모
- **시드 재현**: 층은 `floorSeed(baseSeed, depth)`로 결정. 같은 baseSeed+depth → 완전 동일 맵. URL `?seed=` 및 HUD 재입력 지원.
- **도달성 보장**: 방+복도는 verifyReachable 통과까지 재시도, 동굴은 keepLargestRegion으로 단일 연결 영역만 남겨 원천 보장.
- **충돌**: TileMap.walkable이 A*와 이동을 제약 → 벽 통과 불가. 컬링은 청크 단위 유지.
- **층 이동**: 출구 타일에 정지 상태로 도달하면 자동 하강. HUD 버튼으로 수동 상/하강도 가능.

## 검증 결과
- `npm run test`: **39 passed** (dungeon 10 추가)
- `npm run build`: 성공
- `npm run lint`: 오류 없음

## 다음 Phase (4) 예고
전투 코어(데미지 공식 격리, 히트박스, 데미지 숫자, 사망) + 근접 몬스터 + 스폰 매니저.

## 미결
- 동굴 세부 지형(물/장식) 및 방 종류별 시각 차별화는 아트 교체 단계(Phase 10)에서.
- 계단을 밟는 즉시가 아니라 "정지 시" 전환 — 추후 F키 상호작용 방식으로 개선 검토.
