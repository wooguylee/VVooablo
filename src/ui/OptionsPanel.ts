/**
 * 옵션 패널 (ESC 또는 버튼): 볼륨/줌/키 리맵.
 */
import type { GameOptions } from '@/save/options';

export interface OptionsCallbacks {
  onChange: (opts: GameOptions) => void;
  onSave: () => void;
  onLoad: () => void;
}

export class OptionsPanel {
  private el: HTMLDivElement;
  private opts: GameOptions;
  private cb: OptionsCallbacks;
  visible = false;

  constructor(mount: HTMLElement, opts: GameOptions, cb: OptionsCallbacks) {
    this.opts = opts;
    this.cb = cb;
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      width: '340px',
      padding: '16px',
      background: 'rgba(10,10,20,0.97)',
      border: '2px solid #557',
      borderRadius: '6px',
      zIndex: '200',
      color: '#cde',
      font: '12px monospace',
      display: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    mount.appendChild(this.el);
    this.render();

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.toggle();
    });
  }

  toggle(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
    if (this.visible) this.render();
  }

  private slider(label: string, value: number, onInput: (v: number) => void): HTMLDivElement {
    const row = document.createElement('div');
    row.style.margin = '6px 0';
    const lbl = document.createElement('div');
    lbl.textContent = `${label}: ${Math.round(value * 100)}%`;
    row.appendChild(lbl);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = String(Math.round(value * 100));
    input.style.width = '100%';
    input.addEventListener('input', () => {
      const v = Number(input.value) / 100;
      lbl.textContent = `${label}: ${input.value}%`;
      onInput(v);
    });
    row.appendChild(input);
    return row;
  }

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
      background: '#243',
      color: '#dfd',
      border: '1px solid #384',
      font: '12px monospace',
      padding: '6px 10px',
      margin: '4px 4px 0 0',
      cursor: 'pointer',
    } satisfies Partial<CSSStyleDeclaration>);
    b.addEventListener('click', onClick);
    return b;
  }

  private render(): void {
    this.el.innerHTML = '';
    const title = document.createElement('div');
    title.innerHTML = '<b>옵션 (ESC)</b>';
    title.style.marginBottom = '8px';
    this.el.appendChild(title);

    this.el.appendChild(
      this.slider('마스터 볼륨', this.opts.masterVolume, (v) => {
        this.opts.masterVolume = v;
        this.cb.onChange(this.opts);
      }),
    );
    this.el.appendChild(
      this.slider('효과음', this.opts.sfxVolume, (v) => {
        this.opts.sfxVolume = v;
        this.cb.onChange(this.opts);
      }),
    );
    this.el.appendChild(
      this.slider('음악', this.opts.musicVolume, (v) => {
        this.opts.musicVolume = v;
        this.cb.onChange(this.opts);
      }),
    );

    // 줌
    const zoomRow = document.createElement('div');
    zoomRow.style.margin = '8px 0';
    zoomRow.textContent = '기본 줌: ';
    [1, 2, 3].forEach((z, i) => {
      const b = this.button(`${z}x`, () => {
        this.opts.defaultZoomIndex = i;
        this.cb.onChange(this.opts);
        this.render();
      });
      if (this.opts.defaultZoomIndex === i) b.style.background = '#465';
      zoomRow.appendChild(b);
    });
    this.el.appendChild(zoomRow);

    // 저장/로드
    const sr = document.createElement('div');
    sr.style.marginTop = '10px';
    sr.appendChild(this.button('저장', () => this.cb.onSave()));
    sr.appendChild(this.button('불러오기', () => this.cb.onLoad()));
    this.el.appendChild(sr);

    const hint = document.createElement('div');
    hint.textContent = '키: Q/W/E/R 스킬, 1~4 포션, I 인벤, C 캐릭터';
    hint.style.cssText = 'margin-top:10px;color:#789;font-size:10px';
    this.el.appendChild(hint);
  }
}
