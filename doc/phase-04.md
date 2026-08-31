# Phase 4 — 전투 코어 + 근접 몬스터 + 스폰

작업일: 2026-08-31
상태: **완료** (build/test/lint 통과, 51 tests)

## 구현 산출물

### systems/combat/ (격리된 전투 코어)
- `stats.ts` — CoreStats(힘/민첩/지능/활력) → DerivedStats(공격력/공속/치명/생명력/방어/저항) 재계산 파이프라인.
- `damage.ts` — **데미지 공식 단일 모듈**. 무기피해 × (1+스킬계수) × (1+증가피해) × 치명 → 방어도/저항 감소 → 최종(최소 1). 물리=armor/(armor+50+10*lvl), 원소=res/(res+100) 상한 75%. RNG 주입으로 결정성.
- `hitbox.ts` — 원형/부채꼴 판정, 월드→화면 각도 변환 (Phase 5 스킬 대비).

### entities/
- `combatComponents.ts` — Health/Stats/Faction/Attacker/Corpse.
- `aiComponents.ts` — Ai(FSM 상태/aggro/사거리/repath).
- `createMonster.ts` — 몬스터 팩토리 (전투+AI 컴포넌트).
- `createPlayer.ts` — 플레이어에 전투 컴포넌트 추가.

### systems/
- `combatSystem.ts` — 근접 자동공격, 쿨다운(공속 비례), 데미지 적용, 피격 무적(0.05s), 사망 처리, onDamage/onDeath 콜백.
- `aiSystem.ts` — 근접 FSM(Idle→Chase→Attack), A* 재추적(repath 0.4s 제한).
- `targetingSystem.ts` — 공간해시 재구축 + 플레이어 최근접 적 타겟팅.

### world/
- `SpatialHash.ts` — 셀 버킷 근접 쿼리.
- `SpawnManager.ts` — 도달 가능 바닥에 시드 기반 몬스터 배치, 입구/출구 안전구역.

### data/
- `monsters.ts` — 몬스터 데이터 테이블 (grunt 근접형).

### render/
- `DamageNumbers.ts` — 데미지 숫자 (오브젝트 풀링, 타입별 색상, 치명 강조).
- `HealthBars.ts` — 엔티티 체력바.

### ui/
- `PlayerHud.ts` — 플레이어 체력바 + 사망 오버레이(부활 버튼).

### core/
- `Game.ts` — 전투/AI/스폰/데미지숫자/체력바/시체정리/사망·부활 통합.

## 설계 메모
- **결정성**: 전투 RNG는 층 시드에서 파생(`floorSeed ^ 0xc0dba7`). 같은 시드+행동은 동일 결과.
- **자동 전투**: 플레이어는 사거리 내 최근접 적을 자동 타겟팅·공격(스킬은 Phase 5). 적은 AI로 접근·공격.
- **오브젝트 풀링**: 데미지 숫자는 풀 재사용으로 프레임당 할당 최소화(성능 목표 대비).
- **사망**: 적은 시체 페이드(1.2s) 후 엔티티 제거, 플레이어는 사망 오버레이 → 1층 부활.

## 검증 결과
- `npm run test`: **51 passed** (combat 12 추가)
- `npm run build` / `npm run lint`: 통과

## 다음 Phase (5) 예고
스킬 시스템(쿨다운/자원/시전) + 스킬 5종(휘두르기/돌진/투사체 연사/원형 폭발/소환) + 파티클 이펙트.

## 미결
- 군집 회피(separation)와 투사체는 Phase 5/6에서. 현재 근접 몬스터는 서로 겹칠 수 있음.
- 데미지 숫자 update는 고정 스텝(위치 이동), render는 화면 반영으로 분리.
