/**
 * 층/시드 정보 HUD + 시드 재입력.
 * 화면 하단에 현재 층/시드 표시, 시드 입력 후 재생성 버튼.
 */
export interface FloorHudCallbacks {
  onReseed: (seed: string) => void;
  onDescend: () => void;
  onAscend: () => void;
}

export class FloorHud {
  private el: HTMLDivElement;
  private info: HTMLSpanElement;
  private input: HTMLInputElement;

  constructor(mount: HTMLElement, cb: FloorHudCallbacks) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      right: '8px',
      bottom: '8px',
      padding: '8px 10px',
      background: 'rgba(0,0,0,0.65)',
      color: '#cfc',
      font: '12px/1.6 monospace',
      zIndex: '100',
      borderRadius: '4px',
      display: 'flex',
      gap: '6px',
      alignItems: 'center',
    } satisfies Partial<CSSStyleDeclaration>);

    this.info = document.createElement('span');
    this.el.appendChild(this.info);

    this.input = document.createElement('input');
    this.input.placeholder = '시드';
    Object.assign(this.input.style, {
      width: '90px',
      background: '#111',
      color: '#cfc',
      border: '1px solid #384',
      font: '12px monospace',
      padding: '2px 4px',
    } satisfies Partial<CSSStyleDeclaration>);
    this.el.appendChild(this.input);

    this.el.appendChild(this.button('재생성', () => cb.onReseed(this.input.value)));
    this.el.appendChild(this.button('▼ 내려가기', () => cb.onDescend()));
    this.el.appendChild(this.button('▲ 올라가기', () => cb.onAscend()));

    mount.appendChild(this.el);
  }

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
      background: '#243',
      color: '#dfd',
      border: '1px solid #384',
      font: '12px monospace',
      padding: '3px 6px',
      cursor: 'pointer',
    } satisfies Partial<CSSStyleDeclaration>);
    b.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
      (document.activeElement as HTMLElement)?.blur();
    });
    return b;
  }

  update(depth: number, seed: number, kind: string, monsterLevel: number): void {
    this.info.textContent = `층 ${depth} (${kind}) · 시드 ${seed} · 몬스터Lv ${monsterLevel} `;
  }
}
