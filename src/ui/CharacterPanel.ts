/**
 * 캐릭터 패널 (C 토글): 레벨/경험치, 코어 스탯 배분, 특성 트리.
 */
import type { PlayerProfile } from '@/entities/playerProfile';
import { xpForLevel } from '@/systems/leveling';
import { TALENTS, TALENT_BRANCHES, type TalentBranch } from '@/data/talents';

export interface CharacterCallbacks {
  onSpendStat: (stat: 'str' | 'dex' | 'int' | 'vit') => void;
  onAllocTalent: (id: string) => void;
  onResetTalents: () => void;
}

export class CharacterPanel {
  private el: HTMLDivElement;
  private cb: CharacterCallbacks;
  visible = false;

  constructor(mount: HTMLElement, cb: CharacterCallbacks) {
    this.cb = cb;
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      left: '12px',
      top: '48px',
      width: '340px',
      maxHeight: '80vh',
      overflowY: 'auto',
      padding: '12px',
      background: 'rgba(10,10,20,0.94)',
      border: '2px solid #446',
      borderRadius: '6px',
      zIndex: '150',
      color: '#cde',
      font: '12px monospace',
      display: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    mount.appendChild(this.el);

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'c') this.toggle();
    });
  }

  toggle(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
  }

  private btn(label: string, enabled = true): string {
    return `<button ${enabled ? '' : 'disabled'} style="background:#243;color:#dfd;border:1px solid #384;font:11px monospace;padding:2px 6px;cursor:${enabled ? 'pointer' : 'default'};opacity:${enabled ? 1 : 0.4}">${label}</button>`;
  }

  update(profile: PlayerProfile): void {
    if (!this.visible) return;
    const need = xpForLevel(profile.level);
    const c = profile.baseCore;
    const parts: string[] = [];
    parts.push(`<div style="font-weight:bold;margin-bottom:6px">캐릭터 (C)</div>`);
    parts.push(
      `<div>레벨 ${profile.level} · XP ${profile.xp}/${need}</div>`,
    );
    parts.push(`<div style="color:#fd6">골드 ${profile.inventory.gold} · 포션 ${profile.potions}</div>`);
    parts.push(`<div style="margin-top:6px;color:#8cf">스탯 포인트: ${profile.statPoints} · 스킬 포인트: ${profile.skillPoints}</div>`);

    // 코어 스탯 + 배분 버튼
    const statRow = (key: 'str' | 'dex' | 'int' | 'vit', label: string, v: number) =>
      `<div style="display:flex;justify-content:space-between;align-items:center;margin:2px 0">
        <span>${label}: ${v}</span>
        <span data-stat="${key}">${this.btn('+', profile.statPoints > 0)}</span>
      </div>`;
    parts.push('<div style="margin-top:6px">');
    parts.push(statRow('str', '힘', c.str));
    parts.push(statRow('dex', '민첩', c.dex));
    parts.push(statRow('int', '지능', c.int));
    parts.push(statRow('vit', '활력', c.vit));
    parts.push('</div>');

    // 특성 트리
    parts.push(`<div style="margin-top:10px;font-weight:bold">특성 트리</div>`);
    for (const branch of Object.keys(TALENT_BRANCHES) as TalentBranch[]) {
      parts.push(`<div style="margin-top:4px;color:#9cf">${TALENT_BRANCHES[branch]}</div>`);
      const nodes = TALENTS.filter((t) => t.branch === branch).sort((a, b) => a.tier - b.tier);
      for (const n of nodes) {
        const rank = profile.talents[n.id] ?? 0;
        parts.push(
          `<div style="display:flex;justify-content:space-between;align-items:center;margin:1px 0;font-size:11px">
            <span>${n.name} (${rank}/${n.maxRank})</span>
            <span data-talent="${n.id}">${this.btn('+', profile.skillPoints > 0 && rank < n.maxRank)}</span>
          </div>`,
        );
      }
    }
    parts.push(`<div style="margin-top:8px" data-reset="1">${this.btn('특성 초기화')}</div>`);

    this.el.innerHTML = parts.join('');
    this.bindActions();
  }

  private bindActions(): void {
    this.el.querySelectorAll('[data-stat] button').forEach((b) => {
      const stat = (b.parentElement?.getAttribute('data-stat') ?? '') as
        | 'str'
        | 'dex'
        | 'int'
        | 'vit';
      b.addEventListener('click', () => this.cb.onSpendStat(stat));
    });
    this.el.querySelectorAll('[data-talent] button').forEach((b) => {
      const id = b.parentElement?.getAttribute('data-talent') ?? '';
      b.addEventListener('click', () => this.cb.onAllocTalent(id));
    });
    this.el.querySelectorAll('[data-reset] button').forEach((b) => {
      b.addEventListener('click', () => this.cb.onResetTalents());
    });
  }
}
