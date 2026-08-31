/**
 * 게임 옵션 (볼륨/줌/키 리맵).
 * localStorage에 영속. 사운드/카메라/입력이 참조한다.
 */

export interface KeyBindings {
  skillQ: string;
  skillW: string;
  skillE: string;
  skillR: string;
  potion: string;
  inventory: string;
  character: string;
}

export interface GameOptions {
  masterVolume: number; // 0..1
  sfxVolume: number;
  musicVolume: number;
  defaultZoomIndex: number; // 0..2
  keys: KeyBindings;
}

const STORAGE_KEY = 'vvooablo:options';

export function defaultOptions(): GameOptions {
  return {
    masterVolume: 0.7,
    sfxVolume: 0.8,
    musicVolume: 0.5,
    defaultZoomIndex: 1,
    keys: {
      skillQ: 'q',
      skillW: 'w',
      skillE: 'e',
      skillR: 'r',
      potion: '1',
      inventory: 'i',
      character: 'c',
    },
  };
}

export function loadOptions(): GameOptions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultOptions();
    const parsed = JSON.parse(raw) as Partial<GameOptions>;
    return { ...defaultOptions(), ...parsed, keys: { ...defaultOptions().keys, ...parsed.keys } };
  } catch {
    return defaultOptions();
  }
}

export function saveOptions(opts: GameOptions): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(opts));
  } catch {
    // 무시 (프라이빗 모드 등)
  }
}
