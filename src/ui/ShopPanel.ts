/**
 * 상점 패널.
 * 마을에서 상인 근처일 때 표시. 구매/판매/포션 구매.
 */
import type { ItemInstance } from '@/data/itemTypes';
import type { PlayerProfile } from '@/entities/playerProfile';
import { buyPrice, sellPrice, POTION_PRICE } from '@/systems/shopSystem';
import { itemTooltipHtml } from '@/ui/itemTooltip';

export interface ShopCallbacks {
  onBuy: (item: ItemInstance) => void;
  onSell: (uid: number) => void;
  onBuyPotion: () => void;
}

export class ShopPanel {
  private el: HTMLDivElement;
  private tooltip: HTMLDivElement;
  private cb: ShopCallbacks;
  visible = false;

  constructor(mount: HTMLElement, cb: ShopCallbacks) {
    this.cb = cb;
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      width: '520px',
      maxHeight: '70vh',
      overflowY: 'auto',
      padding: '14px',
      background: 'rgba(12,10,8,0.96)',
      border: '2px solid #764',
      borderRadius: '6px',
      zIndex: '160',
      color: '#eda',
      font: '12px monospace',
      display: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    mount.appendChild(this.el);

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
      font: '11px monospace',
    } satisfies Partial<CSSStyleDeclaration>);
    mount.appendChild(this.tooltip);
  }

  setVisible(v: boolean): void {
    if (this.visible === v) return;
    this.visible = v;
    this.el.style.display = v ? 'block' : 'none';
    if (!v) this.tooltip.style.display = 'none';
  }

  private itemRow(item: ItemInstance, price: number, action: string, onClick: () => void): HTMLDivElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '2px 4px',
      borderBottom: '1px solid #321',
    } satisfies Partial<CSSStyleDeclaration>);
    const name = document.createElement('span');
    name.textContent = item.name;
    name.style.color = '#' + item.color.toString(16).padStart(6, '0');
    name.addEventListener('mousemove', (e) => {
      this.tooltip.innerHTML = itemTooltipHtml(item);
      this.tooltip.style.left = `${e.clientX + 12}px`;
      this.tooltip.style.top = `${e.clientY}px`;
      this.tooltip.style.display = 'block';
    });
    name.addEventListener('mouseleave', () => (this.tooltip.style.display = 'none'));
    row.appendChild(name);

    const btn = document.createElement('button');
    btn.textContent = `${action} (${price}G)`;
    Object.assign(btn.style, {
      background: '#432',
      color: '#fda',
      border: '1px solid #764',
      font: '11px monospace',
      padding: '2px 6px',
      cursor: 'pointer',
    } satisfies Partial<CSSStyleDeclaration>);
    btn.addEventListener('click', onClick);
    row.appendChild(btn);
    return row;
  }

  update(profile: PlayerProfile, stock: ItemInstance[]): void {
    if (!this.visible) return;
    this.el.innerHTML = '';
    const title = document.createElement('div');
    title.innerHTML = `<b>상점</b> · 골드 ${profile.inventory.gold}G · 포션 ${profile.potions}`;
    title.style.marginBottom = '8px';
    this.el.appendChild(title);

    const potionBtn = document.createElement('button');
    potionBtn.textContent = `포션 구매 (${POTION_PRICE}G)`;
    Object.assign(potionBtn.style, {
      background: '#523',
      color: '#fcd',
      border: '1px solid #856',
      font: '11px monospace',
      padding: '4px 8px',
      cursor: 'pointer',
      marginBottom: '8px',
    } satisfies Partial<CSSStyleDeclaration>);
    potionBtn.addEventListener('click', () => this.cb.onBuyPotion());
    this.el.appendChild(potionBtn);

    const buyTitle = document.createElement('div');
    buyTitle.textContent = '판매 물품';
    buyTitle.style.margin = '6px 0';
    this.el.appendChild(buyTitle);
    for (const item of stock) {
      this.el.appendChild(this.itemRow(item, buyPrice(item), '구매', () => this.cb.onBuy(item)));
    }

    const sellTitle = document.createElement('div');
    sellTitle.textContent = '내 아이템 (판매)';
    sellTitle.style.margin = '8px 0 4px';
    this.el.appendChild(sellTitle);
    for (const entry of profile.inventory.items.values()) {
      this.el.appendChild(
        this.itemRow(entry.item, sellPrice(entry.item), '판매', () => this.cb.onSell(entry.item.uid)),
      );
    }

    const hint = document.createElement('div');
    hint.textContent = '(상인에게서 멀어지면 닫힘)';
    hint.style.cssText = 'margin-top:8px;color:#a97;font-size:10px';
    this.el.appendChild(hint);
  }
}
