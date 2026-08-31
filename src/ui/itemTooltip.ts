/**
 * 아이템 툴팁 생성 헬퍼 (HTML 문자열).
 * modifier를 사람이 읽을 수 있는 문구로 변환한다.
 */
import type { ItemInstance, ModKey } from '@/data/itemTypes';
import { RARITY_COLOR, RARITY_NAME } from '@/data/itemTypes';

const MOD_LABEL: Record<ModKey, (v: number) => string> = {
  str: (v) => `+${v} 힘`,
  dex: (v) => `+${v} 민첩`,
  int: (v) => `+${v} 지능`,
  vit: (v) => `+${v} 활력`,
  flatDamage: (v) => `+${v} 피해`,
  increasedDamage: (v) => `+${v}% 증가 피해`,
  critChance: (v) => `+${v}% 치명타 확률`,
  critDamage: (v) => `+${v}% 치명타 피해`,
  maxHp: (v) => `+${v} 최대 생명력`,
  armor: (v) => `+${v} 방어도`,
  resistance: (v) => `+${v} 저항`,
  attackSpeed: (v) => `+${v}% 공격 속도`,
};

function toHexColor(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

export function itemTooltipHtml(item: ItemInstance): string {
  const color = toHexColor(RARITY_COLOR[item.rarity]);
  const lines: string[] = [];
  lines.push(`<div style="color:${color};font-weight:bold">${item.name}</div>`);
  lines.push(
    `<div style="color:#999;font-size:10px">${RARITY_NAME[item.rarity]} · 아이템레벨 ${item.itemLevel} · ${slotName(item.slot)}</div>`,
  );
  if (item.baseDamage) lines.push(`<div style="color:#ddd">무기 피해: ${item.baseDamage}</div>`);
  if (item.baseArmor) lines.push(`<div style="color:#ddd">방어도: ${item.baseArmor}</div>`);
  if (item.mods.length) {
    lines.push('<div style="height:4px"></div>');
    for (const m of item.mods) {
      const fn = MOD_LABEL[m.key];
      lines.push(`<div style="color:#6cf">${fn ? fn(m.value) : `${m.key} ${m.value}`}</div>`);
    }
  }
  return lines.join('');
}

function slotName(slot: string): string {
  const map: Record<string, string> = {
    weapon: '무기',
    armor: '갑옷',
    helmet: '투구',
    gloves: '장갑',
    boots: '신발',
    ring1: '반지',
    ring2: '반지',
    amulet: '목걸이',
  };
  return map[slot] ?? slot;
}
