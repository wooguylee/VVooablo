# 스프라이트 아틀라스 교체 가이드

현재 모든 캐릭터/몬스터는 **코드로 생성한 플레이스홀더 도형**(`src/render/Animator.ts`)으로 렌더된다.
저작권 있는 에셋(블리자드 등)은 절대 사용하지 않으며, 아래 절차로 **CC0 에셋 또는 직접 제작한
8방향 픽셀 스프라이트**로 교체할 수 있는 구조다.

## 1. 애니메이터 추상화

`applyAnimation(sprite, facing, color)`는 상태(idle/walk/attack/cast/hit/death), 방향(0~7),
경과 시간(`facing.animTime`)만 입력받는다. 이 인터페이스를 유지하면 렌더 방식만 교체하면 된다.

## 2. 아틀라스 JSON 포맷 (권장)

TexturePacker 호환 또는 아래 커스텀 포맷:

```json
{
  "meta": { "image": "hero.png", "tileW": 32, "tileH": 32 },
  "anims": {
    "walk": {
      "frameDurationMs": 100,
      "dirs": {
        "0": [ {"x":0,"y":0}, {"x":32,"y":0}, {"x":64,"y":0} ],
        "1": [ {"x":0,"y":32}, {"x":32,"y":32}, {"x":64,"y":32} ]
      }
    },
    "idle": { "...": "..." }
  }
}
```

- `dirs` 키 0~7 = 8방향(E,SE,S,SW,W,NW,N,NE).
- 각 방향은 프레임 좌표 배열. 없는 방향은 좌우 반전으로 재사용 가능(4방향 소스 → 8방향).

## 3. 교체 단계

1. `src/assets/atlases/`에 PNG + JSON 배치 (nearest 필터 유지).
2. Pixi로 텍스처 로드:
   ```ts
   import { Assets, Texture, Rectangle } from 'pixi.js';
   const base = await Assets.load('assets/atlases/hero.png');
   base.source.scaleMode = 'nearest';
   ```
3. `Animator.ts`의 `createPlaceholderSprite` → `createSpriteFromAtlas(atlas)` 로 교체하고,
   `applyAnimation`에서 상태/방향/프레임 인덱스로 `Sprite.texture`를 교체:
   ```ts
   const frame = anim.dirs[facing.dir][frameIndex];
   sprite.texture = new Texture({ source: base.source, frame: new Rectangle(frame.x, frame.y, tileW, tileH) });
   ```
4. 프레임 인덱스 = `Math.floor(facing.animTime / frameDuration) % frameCount`.
5. 플레이스홀더 렌더 경로는 스프라이트 미존재 시 폴백으로 유지(명세 요구).

## 4. 폴백 규칙 (명세 준수)

> 스프라이트가 없으면 방향별 색상 도형으로 대체 렌더.

`createSpriteFromAtlas`는 아틀라스 로드 실패/미존재 시 `createPlaceholderSprite`로 폴백한다.
따라서 에셋 없이도 게임은 항상 구동된다.

## 5. 에셋 라이선스

- **CC0**만 사용 (예: Kenney.nl, OpenGameArt CC0 섹션).
- 폰트: 오픈 라이선스 픽셀 폰트만 (현재는 시스템 monospace 사용).
- 사운드: 현재 WebAudio 절차적 합성으로 무에셋. 교체 시 CC0 사운드만.

## 6. 성능 참고

- 아틀라스는 단일 텍스처 → 드로우콜 배칭에 유리.
- 정적 타일은 `cacheAsTexture`로 청크 캐싱됨(`TileGridRenderer`).
- 투사체/파티클/데미지 숫자는 오브젝트 풀링 적용됨.
