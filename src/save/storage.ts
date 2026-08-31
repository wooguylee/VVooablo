/**
 * IndexedDB 저장소 (idb).
 * 슬롯 3개. 저장/로드/삭제/목록. 마이그레이션은 로드 시 적용.
 */
import { openDB, type IDBPDatabase } from 'idb';
import { migrate, type SaveData } from '@/save/serialize';

const DB_NAME = 'vvooablo';
const STORE = 'saves';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'slot' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveGame(data: SaveData): Promise<void> {
  const db = await getDb();
  await db.put(STORE, data);
}

export async function loadGame(slot: number): Promise<SaveData | null> {
  const db = await getDb();
  const raw = await db.get(STORE, slot);
  if (!raw) return null;
  return migrate(raw);
}

export async function deleteGame(slot: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, slot);
}

export interface SaveSummary {
  slot: number;
  level: number;
  depth: number;
  updatedAt: number;
  exists: boolean;
}

export async function listSaves(slots = 3): Promise<SaveSummary[]> {
  const db = await getDb();
  const result: SaveSummary[] = [];
  for (let slot = 0; slot < slots; slot++) {
    const raw = (await db.get(STORE, slot)) as SaveData | undefined;
    if (raw) {
      const data = migrate(raw);
      result.push({
        slot,
        level: data.profile?.level ?? 1,
        depth: data.depth,
        updatedAt: data.updatedAt,
        exists: true,
      });
    } else {
      result.push({ slot, level: 0, depth: 0, updatedAt: 0, exists: false });
    }
  }
  return result;
}
