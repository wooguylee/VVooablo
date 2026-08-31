/**
 * 보스 체력바 HUD (화면 상단).
 */
export class BossHud {
  private el: HTMLDivElement;
  private fill: HTMLDivElement;
  private label: HTMLSpanElement;

  constructor(mount: HTMLElement) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      left: '50%',
      top: '12px',
      transform: 'translateX(-50%)',
      width: '420px',
      height: '20px',
      background: '#200',
      border: '2px solid #722',
      zIndex: '100',
      borderRadius: '3px',
      overflow: 'hidden',
      display: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    this.fill = document.createElement('div');
    Object.assign(this.fill.style, {
      height: '100%',
      background: 'linear-gradient(#f26,#912)',
    } satisfies Partial<CSSStyleDeclaration>);
    this.el.appendChild(this.fill);
    this.label = document.createElement('span');
    Object.assign(this.label.style, {
      position: 'absolute',
      inset: '0',
      textAlign: 'center',
      color: '#fff',
      font: 'bold 11px/20px monospace',
      textShadow: '0 1px 2px #000',
    } satisfies Partial<CSSStyleDeclaration>);
    this.el.appendChild(this.label);
    mount.appendChild(this.el);
  }

  update(info: { hp: number; maxHp: number; phase: number } | null): void {
    if (!info) {
      this.el.style.display = 'none';
      return;
    }
    this.el.style.display = 'block';
    const ratio = Math.max(0, info.hp / info.maxHp);
    this.fill.style.width = `${ratio * 100}%`;
    this.label.textContent = `심연의 군주 — 페이즈 ${info.phase}  (${Math.ceil(info.hp)}/${info.maxHp})`;
  }
}
