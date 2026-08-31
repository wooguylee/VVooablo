# 배포 가이드

VVooablo는 **완전 클라이언트 사이드**(서버 없음) 정적 사이트로 배포된다.
`vite.config.ts`의 `base: './'` 설정으로 어떤 경로에서도 동작한다.

## 빌드 산출물

```bash
npm run deploy:check   # 빌드 + 테스트 통과 확인
# 산출물: dist/
```

`dist/`를 아무 정적 호스팅에 업로드하면 된다.

## 호스팅 옵션

### 1. GitHub Pages
```bash
npm run build
# dist/ 내용을 gh-pages 브랜치 또는 /docs 로 배포
npx gh-pages -d dist    # gh-pages 패키지 사용 시
```
`base: './'` 이므로 리포지토리 하위 경로(`/repo/`)에서도 자산 로딩이 정상.

### 2. Netlify / Vercel / Cloudflare Pages
- 빌드 명령: `npm run build`
- 출력 디렉터리: `dist`
- SPA 리다이렉트 불필요(단일 index.html, 라우팅 없음).

### 3. 로컬/사내 정적 서버
```bash
npm run build && npm run serve:dist   # http://localhost:4173
```

## 배포 전 체크리스트

- [ ] `npm run build` 성공 (tsc strict + vite)
- [ ] `npm run test` 통과 (전 유닛/통합/성능 테스트)
- [ ] `npm run lint` 오류 없음
- [ ] 브라우저 스모크: `npm run serve:dist` 후 `npm run smoke` (콘솔/페이지 오류 0)
- [ ] 저작권 에셋 미포함 확인 (플레이스홀더/CC0/절차적 사운드만)

## 브라우저 요구사항

- WebGPU 지원 브라우저 우선, 미지원 시 WebGL 자동 폴백.
- IndexedDB(세이브), localStorage(옵션), WebAudio(사운드) 사용.
- 모바일: 터치 시 가상 조이스틱 + 스킬 버튼 자동 표시.

## 캐시/버전

- Vite가 자산 파일명에 해시를 부여하므로 캐시 무효화 자동.
- 세이브 스키마 변경 시 `src/save/serialize.ts`의 `SAVE_VERSION` 증가 + `migrate` 확장.
