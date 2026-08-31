# Phase 9 — 저장/로드 + 옵션 + 사운드

작업일: 2026-08-31
상태: **완료** (build/test/lint/브라우저 스모크 통과, 120 tests)

## 구현 산출물

### save/
- `serialize.ts` — PlayerProfile ↔ JSON 직렬화(Map→배열), SaveData 스키마(SAVE_VERSION=2), **버전 마이그레이션**(v1→v2 potions/talents 기본값 주입).
- `storage.ts` — IndexedDB(idb) 저장/로드/삭제/목록, 슬롯 3개, 로드 시 migrate 적용.
- `options.ts` — 옵션(볼륨/줌/키 리맵) localStorage 영속, 부분 데이터 병합.

### audio/
- `SoundSystem.ts` — WebAudio 절차적 합성(저작권 에셋 미사용). 채널 믹싱(master→sfx/music 게인). 오실레이터 프리셋 8종(hit/crit/skill/death/levelup/pickup/potion/ui). 사용자 제스처 후 init, 30ms 스로틀.

### ui/
- `OptionsPanel.ts` — ESC 토글: 볼륨 슬라이더 3종, 기본 줌, 저장/불러오기 버튼, 키 안내.

### core/
- `Game.ts` — 자동 저장(10초마다, onAutosave 콜백), buildSaveData/applySave, 사운드 훅(피격/치명/스킬/사망/레벨업/획득/포션), profile 로드 교체.

### render/
- `Camera.ts` — setZoomIndex(옵션 기본 줌 반영).

### 진입점
- `main.ts` — 옵션 로드→줌/사운드 적용, 첫 상호작용 시 오디오 init, 슬롯 0 자동 로드, 자동 저장 연결, 옵션 패널.

## 설계 메모
- **완전 클라이언트 사이드 저장**: IndexedDB(세이브) + localStorage(옵션). 서버 없음.
- **마이그레이션**: 로드 시 migrate로 구버전 세이브를 최신 스키마로 업그레이드 → 하위 호환.
- **UID 복원**: 로드 시 setNextUid로 아이템 UID 카운터 복구(충돌 방지).
- **사운드 정책**: AudioContext는 브라우저 자동재생 정책상 첫 클릭/키 입력 후 init·resume.
- **결정성 유지**: 저장은 baseSeed+depth+profile 스냅샷. 로드 시 같은 시드로 층 재생성.

## 검증 결과
- `npm run test`: **120 passed** (save 4, options 4 추가)
- `npm run build` / `npm run lint`: 통과
- 브라우저 스모크: 옵션 패널·사운드·저장 로드 확인, 콘솔/페이지 오류 0

## 다음 Phase (10) 예고
최적화(풀링/배칭/RenderTexture), 모바일 터치/가상 조이스틱, 스프라이트 아틀라스 교체 가이드, README + 배포 스크립트.

## 미결
- 세이브 슬롯 UI(3개 선택 화면)는 현재 슬롯 0 자동. 명시적 슬롯 선택 메뉴는 Phase 10 UX에서.
- 키 리맵은 옵션에 데이터로 존재하나 입력 바인딩 실제 적용은 Phase 10에서 입력 계층과 통합.
- 배경 음악(music 채널)은 게인만 준비, 실제 절차적 BGM은 Phase 10 여유 시.
