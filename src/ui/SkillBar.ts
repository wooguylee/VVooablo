/**
 * 스킬바 HUD: Q/W/E/R + 우클릭 슬롯, 쿨다운 오버레이, 마나바.
 */
import { SKILLS } from '@/data/skills';
import type { SkillUser } from '@/entities/skillComponents';

const SLOT_KEYS = ['Q', 'W', 'E', 'R', 'RMB'];

export class SkillBar {
  private el: HTMLDivElement;
  private slots: Array<{ cd: HTMLDivElement; label: HTMLDivElement }> = [];
  private manaFill: HTMLDivElement;
  private manaLabel: HTMLSpanElement;

  constructor(mount: HTMLElement) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      left: '50%',
      bottom: '36px',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '4px',
      zIndex: '100',
      alignItems: 'flex-end',
    } satisfies Partial<CSSStyleDeclaration>);

    for (let i = 0; i < 5; i++) {
      const slot = document.createElement('div');
      Object.assign(slot.style, {
        position: 'relative',
        width: '40px',
        height: '40px',
        background: '#223',
        border: '1px solid #558',
        borderRadius: '4px',
        overflow: 'hidden',
      } satisfies Partial<CSSStyleDeclaration>);

      const label = document.createElement('div');
      Object.assign(label.style, {
        position: 'absolute',
        inset: '0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#cde',
        font: '9px monospace',
        textAlign: 'center',
        lineHeight: '1.2',
      } satisfies Partial<CSSStyleDeclaration>);
      slot.appendChild(label);

      const key = document.createElement('div');
      key.textContent = SLOT_KEYS[i];
      Object.assign(key.style, {
        position: 'absolute',
        top: '1px',
        left: '2px',
        color: '#8af',
        font: 'bold 9px monospace',
      } satisfies Partial<CSSStyleDeclaration>);
      slot.appendChild(key);

      const cd = document.createElement('div');
      Object.assign(cd.style, {
        position: 'absolute',
        left: '0',
        bottom: '0',
        width: '100%',
        height: '0%',
        background: 'rgba(0,0,0,0.6)',
      } satisfies Partial<CSSStyleDeclaration>);
      slot.appendChild(cd);

      this.slots.push({ cd, label });
      this.el.appendChild(slot);
    }
    mount.appendChild(this.el);

    // 마나바
    const manaBar = document.createElement('div');
    Object.assign(manaBar.style, {
      position: 'absolute',
      left: '50%',
      bottom: '30px',
      transform: 'translateX(-50%)',
      width: '224px',
      height: '6px',
      background: '#002',
      border: '1px solid #226',
      zIndex: '100',
      borderRadius: '2px',
      overflow: 'hidden',
    } satisfies Partial<CSSStyleDeclaration>);
    this.manaFill = document.createElement('div');
    Object.assign(this.manaFill.style, {
      height: '100%',
      background: 'linear-gradient(#48f,#25a)',
    } satisfies Partial<CSSStyleDeclaration>);
    manaBar.appendChild(this.manaFill);
    this.manaLabel = document.createElement('span');
    Object.assign(this.manaLabel.style, {
      position: 'absolute',
      right: '4px',
      top: '-14px',
      color: '#8af',
      font: '9px monospace',
    } satisfies Partial<CSSStyleDeclaration>);
    manaBar.appendChild(this.manaLabel);
    mount.appendChild(manaBar);
  }

  update(su: SkillUser | undefined): void {
    if (!su) return;
    for (let i = 0; i < 5; i++) {
      const skillId = su.slots[i];
      const def = skillId ? SKILLS[skillId] : undefined;
      const s = this.slots[i];
      if (!def) {
        s.label.textContent = '-';
        s.cd.style.height = '0%';
        continue;
      }
      s.label.textContent = def.name;
      const cd = su.cooldowns[skillId] ?? 0;
      s.cd.style.height = `${Math.min(100, (cd / def.cooldown) * 100)}%`;
    }
    this.manaFill.style.width = `${(su.mana / su.maxMana) * 100}%`;
    this.manaLabel.textContent = `MP ${Math.floor(su.mana)}/${su.maxMana}`;
  }
}
