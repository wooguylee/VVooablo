/**
 * 타입 안전한 경량 이벤트 버스.
 * 시스템 간 결합을 낮추기 위해 사용한다.
 */
export type EventHandler<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, unknown>> {
  private handlers: Map<keyof Events, Set<EventHandler<unknown>>> = new Map();

  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as EventHandler<unknown>);
    // 구독 해제 함수 반환
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<unknown>);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      (handler as EventHandler<Events[K]>)(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
