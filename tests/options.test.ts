import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultOptions, loadOptions, saveOptions } from '@/save/options';

// localStorage 목 (node 환경)
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  });
});

describe('옵션', () => {
  it('기본 옵션 구조', () => {
    const o = defaultOptions();
    expect(o.masterVolume).toBeGreaterThan(0);
    expect(o.keys.skillQ).toBe('q');
    expect(o.defaultZoomIndex).toBe(1);
  });

  it('저장 후 로드하면 값 보존', () => {
    const o = defaultOptions();
    o.masterVolume = 0.3;
    o.defaultZoomIndex = 2;
    o.keys.potion = '5';
    saveOptions(o);
    const loaded = loadOptions();
    expect(loaded.masterVolume).toBeCloseTo(0.3, 5);
    expect(loaded.defaultZoomIndex).toBe(2);
    expect(loaded.keys.potion).toBe('5');
  });

  it('저장 없으면 기본값 반환', () => {
    const loaded = loadOptions();
    expect(loaded.masterVolume).toBe(defaultOptions().masterVolume);
  });

  it('부분 저장 데이터도 기본값과 병합', () => {
    localStorage.setItem('vvooablo:options', JSON.stringify({ masterVolume: 0.1 }));
    const loaded = loadOptions();
    expect(loaded.masterVolume).toBeCloseTo(0.1, 5);
    expect(loaded.keys.skillQ).toBe('q'); // 기본 키 유지
  });
});
