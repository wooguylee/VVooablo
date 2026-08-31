/**
 * 모바일 가상 조이스틱 + 터치 스킬 버튼.
 * 터치 기기에서만 표시. 조이스틱 방향으로 플레이어 이동 요청을 낸다.
 */

export interface VirtualInputState {
  /** 이동 방향 벡터 (정규화, 없으면 0,0) */
  moveX: number;
  moveY: number;
  active: boolean;
}

export interface VirtualInputCallbacks {
  onSkill: (slot: number) => void;
  onPotion: () => void;
}

/** 터치 지원 여부 */
export function isTouchDevice(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0)
  );
}

export class VirtualJoystick {
  readonly state: VirtualInputState = { moveX: 0, moveY: 0, active: false };
  private base: HTMLDivElement;
  private stick: HTMLDivElement;
  private buttons: HTMLDivElement;
  private origin = { x: 0, y: 0 };
  private touchId: number | null = null;
  private radius = 50;

  constructor(mount: HTMLElement, cb: VirtualInputCallbacks) {
    // 조이스틱 베이스
    this.base = document.createElement('div');
    Object.assign(this.base.style, {
      position: 'absolute',
      left: '30px',
      bottom: '30px',
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      background: 'rgba(80,80,120,0.25)',
      border: '2px solid rgba(120,120,180,0.5)',
      zIndex: '120',
      touchAction: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    this.stick = document.createElement('div');
    Object.assign(this.stick.style, {
      position: 'absolute',
      left: '30px',
      top: '30px',
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: 'rgba(150,150,220,0.6)',
    } satisfies Partial<CSSStyleDeclaration>);
    this.base.appendChild(this.stick);
    mount.appendChild(this.base);

    // 스킬/포션 버튼 (우하단)
    this.buttons = document.createElement('div');
    Object.assign(this.buttons.style, {
      position: 'absolute',
      right: '20px',
      bottom: '30px',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 48px)',
      gap: '8px',
      zIndex: '120',
    } satisfies Partial<CSSStyleDeclaration>);
    const labels = ['Q', 'W', 'E', 'R', '❤', '⚡'];
    labels.forEach((label, i) => {
      const b = document.createElement('div');
      b.textContent = label;
      Object.assign(b.style, {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'rgba(60,80,110,0.5)',
        border: '2px solid rgba(120,150,200,0.6)',
        color: '#def',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: 'bold 16px monospace',
        touchAction: 'none',
      } satisfies Partial<CSSStyleDeclaration>);
      b.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (i < 4) cb.onSkill(i);
        else if (i === 4) cb.onPotion();
        else cb.onSkill(4); // ⚡ = 보조 스킬(슬롯4)
      });
      this.buttons.appendChild(b);
    });
    mount.appendChild(this.buttons);

    this.attach();
  }

  private attach(): void {
    this.base.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.touchId = t.identifier;
      const rect = this.base.getBoundingClientRect();
      this.origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this.state.active = true;
    });
    window.addEventListener('touchmove', (e) => {
      if (this.touchId === null) return;
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== this.touchId) continue;
        let dx = t.clientX - this.origin.x;
        let dy = t.clientY - this.origin.y;
        const dist = Math.hypot(dx, dy);
        if (dist > this.radius) {
          dx = (dx / dist) * this.radius;
          dy = (dy / dist) * this.radius;
        }
        this.stick.style.left = `${30 + dx}px`;
        this.stick.style.top = `${30 + dy}px`;
        // 정규화 이동 벡터 (화면 → 이동)
        const mag = Math.min(1, dist / this.radius);
        this.state.moveX = dist > 0 ? (dx / this.radius) : 0;
        this.state.moveY = dist > 0 ? (dy / this.radius) : 0;
        void mag;
      }
    });
    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.touchId) {
          this.touchId = null;
          this.state.active = false;
          this.state.moveX = 0;
          this.state.moveY = 0;
          this.stick.style.left = '30px';
          this.stick.style.top = '30px';
        }
      }
    };
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
  }

  /** 데스크톱에서는 숨김 */
  hide(): void {
    this.base.style.display = 'none';
    this.buttons.style.display = 'none';
  }
}
