/**
 * 경량 ECS (Entity Component System).
 *
 * - 엔티티: 숫자 ID (재사용을 위해 free list 관리)
 * - 컴포넌트: 스토어(Map<entity, data>)로 관리, 타입별 분리
 * - 시스템: 순수 함수 (World를 인자로 받아 상태 변경)
 *
 * 컴포넌트 데이터는 배열/Map에 저장되어 프레임당 힙 할당을 최소화한다.
 */

export type Entity = number;

/** 컴포넌트 스토어: 엔티티 → 컴포넌트 데이터 */
export class ComponentStore<T> {
  private data: Map<Entity, T> = new Map();

  set(entity: Entity, value: T): T {
    this.data.set(entity, value);
    return value;
  }

  get(entity: Entity): T | undefined {
    return this.data.get(entity);
  }

  has(entity: Entity): boolean {
    return this.data.has(entity);
  }

  remove(entity: Entity): void {
    this.data.delete(entity);
  }

  entries(): IterableIterator<[Entity, T]> {
    return this.data.entries();
  }

  values(): IterableIterator<T> {
    return this.data.values();
  }

  keys(): IterableIterator<Entity> {
    return this.data.keys();
  }

  get size(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }
}

/**
 * World: 엔티티 수명 관리 + 컴포넌트 스토어 레지스트리.
 * 컴포넌트 스토어는 문자열 키로 등록된다.
 */
export class World {
  private nextId: Entity = 1;
  private freeIds: Entity[] = [];
  private alive: Set<Entity> = new Set();
  private stores: Map<string, ComponentStore<unknown>> = new Map();

  createEntity(): Entity {
    const id = this.freeIds.pop() ?? this.nextId++;
    this.alive.add(id);
    return id;
  }

  destroyEntity(entity: Entity): void {
    if (!this.alive.has(entity)) return;
    this.alive.delete(entity);
    for (const store of this.stores.values()) {
      store.remove(entity);
    }
    this.freeIds.push(entity);
  }

  isAlive(entity: Entity): boolean {
    return this.alive.has(entity);
  }

  /** 컴포넌트 스토어 획득 (없으면 생성). */
  store<T>(name: string): ComponentStore<T> {
    let s = this.stores.get(name);
    if (!s) {
      s = new ComponentStore<unknown>();
      this.stores.set(name, s);
    }
    return s as ComponentStore<T>;
  }

  get entityCount(): number {
    return this.alive.size;
  }

  /** 살아있는 모든 엔티티 순회 */
  entities(): IterableIterator<Entity> {
    return this.alive.values();
  }

  clear(): void {
    this.alive.clear();
    this.freeIds.length = 0;
    this.nextId = 1;
    for (const store of this.stores.values()) store.clear();
  }
}
