import type { AppData } from '../types';
export interface LocalStoragePort {
  read<T>(key: string): Promise<T | undefined>;
  write<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
let database: Promise<IDBDatabase> | undefined;
function db() {
  return (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('modeldock', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('records');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Database blocked. Close other ModelDock tabs.'));
  }));
}
export const storage: LocalStoragePort = {
  async read<T>(key: string) {
    const d = await db();
    return new Promise<T | undefined>((resolve, reject) => {
      const r = d.transaction('records').objectStore('records').get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  },
  async write<T>(key: string, value: T) {
    const d = await db();
    return new Promise<void>((resolve, reject) => {
      const t = d.transaction('records', 'readwrite');
      t.objectStore('records').put(value, key);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  },
  async remove(key: string) {
    const d = await db();
    return new Promise<void>((resolve, reject) => {
      const t = d.transaction('records', 'readwrite');
      t.objectStore('records').delete(key);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  },
};
export function safeData(value: unknown): value is AppData {
  return (
    !!value &&
    typeof value === 'object' &&
    'schemaVersion' in value &&
    value.schemaVersion === 1 &&
    'providers' in value &&
    Array.isArray(value.providers) &&
    'models' in value &&
    Array.isArray(value.models) &&
    'settings' in value
  );
}
