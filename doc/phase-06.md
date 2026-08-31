# Phase 6 — 몬스터 4종 + 엘리트 접사 + 보스 페이즈 + 군집 회피

작업일: 2026-08-31
상태: **완료** (build/test/lint 통과, 68 tests)

## 구현 산출물

### data/
- `monsters.ts` — 근접(grunt)/원거리(archer)/돌진(brute)/소환(necromancer) 4종 + 보스(overlord). 행동 파라미터(투사체/돌진/소환) 데이터화.
- `eliteAffixes.ts` — 엘리트 접사 3종: 빠름(speedMult)/광폭화(berserkDamageMult)/보호막(shieldRatio).

### entities/
- `aiComponents.ts` — Ai 확장(kind/preferredRange/charge/summon/ranged 타이머), Elite/Boss/Shield 컴포넌트.
- `eliteRoll.ts` — 엘리트 접사 롤링 순수 함수(렌더 비의존, 테스트 가능).
- `createMonster.ts` — 4종+보스+엘리트 생성, 크기/색상/체력/속도 강화.

### systems/
- `aiSystem.ts` — 전면 재작성. FSM(Idle→Patrol→Chase→Attack→Reposition→Death) + 행동별 로직:
  - 근접: 접근·근접공격
  - 원거리: preferredRange 유지, 투사체 발사, 근접 시 후퇴(reposition)
  - 돌진: 쿨다운마다 직선 고속 돌진 + 충돌 피해
  - 소환: 하수인 소환(최대치) + 원거리 견제
  - 보스: 2페이즈(50% 전환 시 하수인 소환), 패턴 텔레그래프(slam/nova) 1초 예고 후 광역 피해
  - 군집 회피(separation): 인접 적 밀어내기
- `combat/applyDamage.ts` — 보호막 우선 흡수 후 체력 감소. combat/projectile/skill 데미지 경로에 통합.

### render/
- 보스 텔레그래프: Game.drawTelegraph (아이소 타원 예고 표시).

### ui/
- `BossHud.ts` — 보스 체력바 + 페이즈 표시(상단).

### core/
- `Game.ts` — 신 aiSystem 컨텍스트 구성(소환/텔레그래프/광역피해/피격/사망 콜백), 보스 추적, 보스 HUD 연동.

## 설계 메모
- **결정성**: 엘리트 접사·스폰은 층 시드 파생 RNG. 동일 시드 → 동일 몬스터 구성.
- **보스**: bossRoom(=출구 부근)에 배치되어 출구를 수호. HP 50%에서 페이즈 2 진입 → 패턴 빈도 증가·하수인 소환.
- **텔레그래프**: 패턴 발동 1초 전 위험 범위를 화면에 표시해 회피 가능.
- **성능**: separation은 근접 적만 대상, 공간 규모상 허용. 투사체/파티클 풀링 유지.

## 검증 결과
- `npm run test`: **68 passed** (monster 7, shield 4 추가)
- `npm run build` / `npm run lint`: 통과

## 다음 Phase (7) 예고
아이템/접사 롤링 + 드롭 + 그리드 인벤토리/장비 + 스탯 재계산 파이프라인 + 툴팁.

## 미결
- berserk(광폭화) 접사의 체력 임계 데미지 배수는 데이터로 정의됨, 실제 적용은 근접 데미지 파이프라인에 조건 추가 필요(Phase 7 스탯 재계산과 함께 정리 예정).
- 원거리/소환 몬스터의 투사체도 벽 통과 — 타일 충돌은 Phase 10 최적화와 함께.
