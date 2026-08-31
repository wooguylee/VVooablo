# Phase 8 — 레벨링/특성 트리 + 마을 허브 + 상점 + 포션

작업일: 2026-08-31
상태: **완료** (build/test/lint/브라우저 스모크 통과, 112 tests)

## 구현 산출물

### systems/
- `leveling.ts` — 경험치 곡선(xpForLevel), 레벨업(여러 레벨 동시), 스탯/스킬 포인트 지급, 스탯 투자, 진행률.
- `talentSystem.ts` — 특성 배분(선행 tier 조건), 재설정(환급), 특성 modifier 집계(ModTotals).
- `shopSystem.ts` — 재고 생성(시드), 매매가(구매>판매), 구매/판매/포션 구매.
- `potionSystem.ts` — 체력 포션 회복(최대 40%), 쿨다운.

### data/
- `talents.ts` — 특성 트리 3분기(전사/사냥꾼/신비가) × 5노드, tier 선행/랭크/효과.

### world/
- `Town.ts` — 마을 허브(안전 개방형 방, 상인/스탯리셋/포탈 지점).

### entities/
- `playerProfile.ts` — talents/potions 추가.
- `createMonster.ts` — XpReward 컴포넌트(엘리트/보스 가중).

### systems/items/
- `equipment.ts` — recalcStats에 extraTotals(특성) 합산 지원.

### ui/
- `CharacterPanel.ts` — C 토글: 레벨/XP/골드/포션, 스탯 배분, 특성 트리.
- `ShopPanel.ts` — 상인 근처 시 표시: 구매/판매/포션, 툴팁.
- `PlayerHud.ts` — 레벨/XP%/포션 라인 추가.

### core/
- `Game.ts` — 마을(depth 0)에서 시작, 포탈로 던전 진입, 처치 경험치→레벨업(스탯 재적용), 포션 입력(1~4), 상점/특성/스탯 연동, 상인 근접 감지.

## 설계 메모
- **마을 시작**: depth 0 = 마을. 포탈(출구) 도달 시 depth 1 던전으로. 사망 시 마을 부활.
- **성장 파이프라인**: 레벨업/특성/스탯 투자 → recalcStats 단일 경로로 재계산(체력 비율 보존).
- **재현성**: 상점 재고/드롭 시드 파생. 특성/레벨은 결정적 함수.
- **경험치**: 몬스터 xp × (엘리트 2.5 / 보스 1) 가중, XpReward 컴포넌트로 전달.

## 검증 결과
- `npm run test`: **112 passed** (progression 17, potion 5 추가)
- `npm run build` / `npm run lint`: 통과
- 브라우저 스모크: 마을 시작·캐릭터/인벤 패널·포션 사용 확인, 콘솔/페이지 오류 0

## 다음 Phase (9) 예고
저장/로드(IndexedDB, 슬롯 3, 마이그레이션) + 옵션(볼륨/줌/키 리맵) + 사운드(웹오디오, 채널 믹싱).

## 미결
- 스탯 리셋 지점(마을)은 현재 CharacterPanel의 특성 초기화 버튼으로 대체. 위치 기반 상호작용은 Phase 10 UX 폴리시에서.
- 상점은 상인 근접 시 자동 표시. 명시적 열기/닫기 키는 추후.
