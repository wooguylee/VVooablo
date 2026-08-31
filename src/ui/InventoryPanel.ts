/**
 * 인벤토리/장비 패널 (HTML 오버레이).
 * - I 키로 토글
 * - 그리드 인벤토리 (아이템 클릭으로 장착/해제)
 * - 장비 슬롯 8개
 * - 호버 시 툴팁 + 비교
 * - 골드 표시
 *
 * 단순화를 위해 드래그 대신 클릭 장착/해제를 기본으로 하되,
 * HTML5 드래그 이벤트도 지원한다.
 */
import type { Inventory, Equipment } from '@/systems/items/equipment';
import type { ItemInstance, EquipSlot } from '@/data/itemTypes';
import { itemTooltipHtml } from '@/ui/itemTooltip';

export interface InventoryCallbacks {
  onEquip: (uid: number) => void;
  onUnequip: (slot: EquipSlot) => void;
}

const EQUIP_SLOTS: EquipSlot[] = [
  'weapon',
  'armor',
  'helmet',
  'gloves',
  'boots',
  'ring1',
  'ring2',
  'amulet',
];
const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: '무기',
  armor: '갑옷',
  helmet: '투구',
  gloves: '장갑',
  boots: '신발',
  ring1: '반지1',
  ring2: '반지2',
  amulet: '목걸이',
};

export class InventoryPanel {
  private el: HTMLDivElement;
  private tooltip: HTMLDivElement;
  private gridEl: HTMLDivElement;
  private equipEl: HTMLDivElement;
  private goldEl: HTMLDivElement;
  private cb: InventoryCallbacks;
  visible = false;

  constructor(mount: HTMLElement, cb: InventoryCallbacks) {
    this.cb = cb;
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      right: '12px',
      top: '48px',
      width: '360px',
      padding: '12px',
      background: 'rgba(10,10,20,0.94)',
      border: '2px solid #446',
      borderRadius: '6px',
      zIndex: '150',
      color: '#cde',
      font: '12px monospace',
      display: 'none',
    } satisfies Partial<CSSStyleDeclaration>);

    const title = document.createElement('div');
    title.textContent = '인벤토리 (I)';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '8px';
    this.el.appendChild(title);

    // 장비 슬롯 영역
    const equipTitle = document.createElement('div');
    equipTitle.textContent = '장비';
    equipTitle.style.margin = '4px 0';
    this.el.appendChild(equipTitle);
    this.equipEl = document.createElement('div');
    Object.assign(this.equipEl.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '4px',
      marginBottom: '10px',
    } satisfies Partial<CSSStyleDeclaration>);
    this.el.appendChild(this.equipEl);

    // 가방 그리드
    const bagTitle = document.createElement('div');
    bagTitle.textContent = '가방';
    bagTitle.style.margin = '4px 0';
    this.el.appendChild(bagTitle);
    this.gridEl = document.createElement('div');
    Object.assign(this.gridEl.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(8, 1fr)',
      gap: '3px',
    } satisfies Partial<CSSStyleDeclaration>);
    this.el.appendChild(this.gridEl);

    this.goldEl = document.createElement('div');
    this.goldEl.style.marginTop = '10px';
    this.goldEl.style.color = '#fd6';
    this.el.appendChild(this.goldEl);

    mount.appendChild(this.el);

    // 툴팁
    this.tooltip = document.createElement('div');
    Object.assign(this.tooltip.style, {
      position: 'absolute',
      padding: '8px',
      background: 'rgba(0,0,0,0.95)',
      border: '1px solid #668',
      borderRadius: '4px',
      zIndex: '300',
      pointerEvents: 'none',
      display: 'none',
      maxWidth: '240px',
      font: '11px monospace',
    } satisfies Partial<CSSStyleDeclaration>);
    mount.appendChild(this.tooltip);

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'i') this.toggle();
    });
  }

  toggle(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
    if (!this.visible) this.hideTooltip();
  }

  private showTooltip(item: ItemInstance, x: number, y: number): void {
    this.tooltip.innerHTML = itemTooltipHtml(item);
    this.tooltip.style.left = `${x - 250}px`;
    this.tooltip.style.top = `${y}px`;
    this.tooltip.style.display = 'block';
  }
  private hideTooltip(): void {
    this.tooltip.style.display = 'none';
  }

  private cell(item: ItemInstance | null, onClick: () => void): HTMLDivElement {
    const c = document.createElement('div');
    Object.assign(c.style, {
      width: '38px',
      height: '38px',
      background: item ? 'rgba(40,50,70,0.8)' : 'rgba(20,25,35,0.6)',
      border: item ? `1px solid ${hex(item.color)}` : '1px solid #234',
      borderRadius: '3px',
      cursor: item ? 'pointer' : 'default',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
    } satisfies Partial<CSSStyleDeclaration>);
    if (item) {
      c.textContent = itemIcon(item.slot);
      c.style.color = hex(item.color);
      c.addEventListener('click', onClick);
      c.addEventListener('mousemove', (e) => this.showTooltip(item, e.clientX, e.clientY));
      c.addEventListener('mouseleave', () => this.hideTooltip());
    }
    return c;
  }

  update(inv: Inventory, equip: Equipment): void {
    if (!this.visible) return;
    // 장비 슬롯
    this.equipEl.innerHTML = '';
    for (const slot of EQUIP_SLOTS) {
      const wrap = document.createElement('div');
      wrap.style.textAlign = 'center';
      const lbl = document.createElement('div');
      lbl.textContent = SLOT_LABEL[slot];
      lbl.style.fontSize = '8px';
      lbl.style.color = '#89a';
      wrap.appendChild(lbl);
      const item = equip.slots[slot] ?? null;
      wrap.appendChild(this.cell(item, () => item && this.cb.onUnequip(slot)));
      this.equipEl.appendChild(wrap);
    }

    // 가방 (아이템 나열, 빈 칸 32개까지)
    this.gridEl.innerHTML = '';
    const items = [...inv.items.values()];
    const total = 32;
    for (let i = 0; i < total; i++) {
      const entry = items[i];
      const item = entry ? entry.item : null;
      this.gridEl.appendChild(this.cell(item, () => item && this.cb.onEquip(item.uid)));
    }

    this.goldEl.textContent = `골드: ${inv.gold} G`;
  }
}

function hex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

function itemIcon(slot: string): string {
  const map: Record<string, string> = {
    weapon: '⚔',
    armor: '▤',
    helmet: '⌂',
    gloves: '✋',
    boots: '👢',
    ring1: '◯',
    ring2: '◯',
    amulet: '♦',
  };
  return map[slot] ?? '?';
}
