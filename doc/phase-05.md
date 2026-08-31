# Phase 5 — 스킬 시스템 + 스킬 5종 + 투사체 + 상태이상 + 파티클

작업일: 2026-08-31
상태: **완료** (build/test/lint 통과, 57 tests)

## 구현 산출물

### data/
- `skills.ts` — 스킬 5종 데이터. 각 스킬의 쿨다운/마나/시전시간/스킬계수/형태/파라미터 정의.
  - cleave(부채꼴 휘두르기), dash(돌진+기절), barrage(투사체 3연사), novaBlast(원형 폭발+화상), totem(번개 토템 소환).

### systems/status/
- `statusTypes.ts` — stun/slow/burn/vulnerable 정의.
- `statusSystem.ts` — 지속시간 감소, 화상 도트(0.5s 틱), 둔화 이동배율, 취약 피해배율, 스택/갱신 규칙(지속=최대, 강도=최대).

### entities/
- `skillComponents.ts` — SkillUser(마나/회복/슬롯/쿨다운/시전상태).
- `projectileComponents.ts` — Projectile(풀링 대상).
- `createTotem.ts` — 소환물(고정 자동공격 아군, 지속시간 후 제거).

### systems/
- `skillSystem.ts` — 시전 요청/쿨다운/마나/시전시간 관리 + 형태별 실행(arc/aoe/dash/projectile/summon). 기절 시 캔슬.
- `ProjectileSystem.ts` — 투사체 풀링, 이동/사거리/충돌/데미지/상태부여, 보간 렌더.
- `SkillInput.ts` — Q/W/E/R + 우클릭 슬롯 매핑, 마우스 타깃 큐잉.
- `targetingSystem.ts` — allyTargetingSystem 추가(토템 타겟팅).
- movementSystem/aiSystem — 기절/둔화 반영.

### render/
- `ParticleSystem.ts` — 파티클 풀링 + 가산 블렌딩 발광(burst 방출).

### ui/
- `SkillBar.ts` — 스킬 슬롯/쿨다운 오버레이/마나바.

### core/
- `Game.ts` — 스킬/상태/투사체/파티클 시스템 통합, 스킬 입력 처리, 토템 소환.

## 설계 메모
- **자원/쿨다운/시전**: 마나 소모·쿨다운은 시전 요청 즉시 차감, castTime>0이면 시전 진행 후 실행. 기절 시 시전 캔슬.
- **결정성**: 스킬/투사체 데미지 RNG는 층 RNG 공유. 상태이상 도트도 고정 스텝.
- **풀링**: 투사체·파티클·데미지 숫자 전부 오브젝트 풀 → 300 투사체 목표 대비 할당 최소화.
- **애니 캔슬**: 데이터의 castTime으로 시전 시간을 표현. 세부 캔슬 규칙은 Phase 6/10에서 확장 가능.

## 조작
- 좌클릭: 이동, 우클릭: 보조 스킬(토템), Q/W/E/R: 스킬, 마우스휠: 줌, F1: 디버그.

## 검증 결과
- `npm run test`: **57 passed** (status 6 추가)
- `npm run build` / `npm run lint`: 통과

## 다음 Phase (6) 예고
몬스터 4종(근접/원거리/돌진/소환) + 엘리트 접사(빠름/광폭화/보호막) + 보스 2페이즈 패턴 텔레그래프 + 군집 회피.

## 미결
- 포션(1~4) 입력은 Phase 8에서 물약 아이템과 함께.
- 투사체가 벽을 통과함 — 타일 충돌은 Phase 6/10에서 추가 검토.
