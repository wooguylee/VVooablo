/**
 * 플레이어 HUD: 체력바 + 사망 오버레이(부활).
 */
export interface PlayerHudCallbacks {
  onRespawn: () => void;
}

export class PlayerHud {
  private bar: HTMLDivElement;
  private fill: HTMLDivElement;
  private label: HTMLSpanElement;
  private deathOverlay: HTMLDivElement;
  private xpLine!: HTMLDivElement;

  constructor(mount: HTMLElement, cb: PlayerHudCallbacks) {
    // 체력바
    this.bar = document.createElement('div');
    Object.assign(this.bar.style, {
      position: 'absolute',
      left: '50%',
      bottom: '12px',
      transform: 'translateX(-50%)',
      width: '260px',
      height: '18px',
      background: '#200',
      border: '1px solid #611',
      zIndex: '100',
      borderRadius: '3px',
      overflow: 'hidden',
    } satisfies Partial<CSSStyleDeclaration>);
    this.fill = document.createElement('div');
    Object.assign(this.fill.style, {
      height: '100%',
      width: '100%',
      background: 'linear-gradient(#e44,#a22)',
      transition: 'width 0.1s',
    } satisfies Partial<CSSStyleDeclaration>);
    this.bar.appendChild(this.fill);
    this.label = document.createElement('span');
    Object.assign(this.label.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '100%',
      textAlign: 'center',
      color: '#fff',
      font: '11px/18px monospace',
      textShadow: '0 1px 1px #000',
    } satisfies Partial<CSSStyleDeclaration>);
    this.bar.appendChild(this.label);
    mount.appendChild(this.bar);

    // 경험치/레벨 라인 (체력바 위)
    this.xpLine = document.createElement('div');
    Object.assign(this.xpLine.style, {
      position: 'absolute',
      left: '50%',
      bottom: '58px',
      transform: 'translateX(-50%)',
      color: '#adf',
      font: '10px monospace',
      textShadow: '0 1px 1px #000',
      zIndex: '100',
      whiteSpace: 'nowrap',
    } satisfies Partial<CSSStyleDeclaration>);
    mount.appendChild(this.xpLine);

    // 사망 오버레이
    this.deathOverlay = document.createElement('div');
    Object.assign(this.deathOverlay.style, {
      position: 'absolute',
      inset: '0',
      background: 'rgba(40,0,0,0.55)',
      display: 'none',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      zIndex: '200',
      color: '#f88',
      font: '24px monospace',
    } satisfies Partial<CSSStyleDeclaration>);
    const title = document.createElement('div');
    title.textContent = '사망했습니다';
    this.deathOverlay.appendChild(title);
    const btn = document.createElement('button');
    btn.textContent = '마을에서 부활';
    Object.assign(btn.style, {
      background: '#422',
      color: '#fdd',
      border: '1px solid #833',
      font: '16px monospace',
      padding: '8px 16px',
      cursor: 'pointer',
    } satisfies Partial<CSSStyleDeclaration>);
    btn.addEventListener('click', () => cb.onRespawn());
    this.deathOverlay.appendChild(btn);
    mount.appendChild(this.deathOverlay);
  }

  update(hp: number, maxHp: number, dead: boolean, info?: { level: number; xpRatio: number; potions: number }): void {
    const ratio = Math.max(0, hp / maxHp);
    this.fill.style.width = `${ratio * 100}%`;
    this.label.textContent = `HP ${Math.ceil(hp)} / ${maxHp}`;
    this.deathOverlay.style.display = dead ? 'flex' : 'none';
    if (info) {
      this.xpLine.textContent = `Lv ${info.level}  XP ${Math.round(info.xpRatio * 100)}%  포션 ${info.potions} (1~4)`;
    }
  }
}
