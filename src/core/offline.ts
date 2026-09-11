/**
 * Offline sync queue using IndexedDB.
 * Stores punches created offline and syncs when back online.
 */
import { CONFIG } from '../config.js';

export interface OfflinePunch {
  id: string;
  userId: string;
  type: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracy: number | null;
  source: string;
  photoUrl: string | null;
}

// ─── IndexedDB helpers ──────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CONFIG.IDB_NAME, CONFIG.IDB_VERSION);

    request.onupgradeneeded = (): void => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CONFIG.IDB_STORE)) {
        db.createObjectStore(CONFIG.IDB_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(request.error);
  });
}

/**
 * Queue a punch for later sync.
 */
export async function queuePunch(punch: OfflinePunch): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONFIG.IDB_STORE, 'readwrite');
    tx.objectStore(CONFIG.IDB_STORE).put(punch);
    tx.oncomplete = (): void => resolve();
    tx.onerror = (): void => reject(tx.error);
  });
}

/**
 * Get all queued punches.
 */
export async function getQueuedPunches(): Promise<OfflinePunch[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONFIG.IDB_STORE, 'readonly');
    const request = tx.objectStore(CONFIG.IDB_STORE).getAll();
    request.onsuccess = (): void => resolve(request.result as OfflinePunch[]);
    request.onerror = (): void => reject(request.error);
  });
}

/**
 * Remove a punch from the queue after successful sync.
 */
export async function removePunch(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONFIG.IDB_STORE, 'readwrite');
    tx.objectStore(CONFIG.IDB_STORE).delete(id);
    tx.oncomplete = (): void => resolve();
    tx.onerror = (): void => reject(tx.error);
  });
}

/**
 * Get the count of queued punches.
 */
export async function getQueueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONFIG.IDB_STORE, 'readonly');
    const request = tx.objectStore(CONFIG.IDB_STORE).count();
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(request.error);
  });
}

/**
 * Clear all queued punches.
 */
export async function clearQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONFIG.IDB_STORE, 'readwrite');
    tx.objectStore(CONFIG.IDB_STORE).clear();
    tx.oncomplete = (): void => resolve();
    tx.onerror = (): void => reject(tx.error);
  });
}

/**
 * Drain the offline queue — push every queued punch into the live DB via
 * `insertPunch`, then remove it from IndexedDB on success. Resolves with
 * the number of punches pushed; throws on the first failure (the queue
 * stays intact for a later retry).
 */
export async function syncQueue(
  insert: (item: OfflinePunch) => Promise<unknown>,
): Promise<number> {
  const queued = await getQueuedPunches();
  if (queued.length === 0) return 0;

  let synced = 0;
  for (const item of queued) {
    await insert(item);
    await removePunch(item.id);
    synced += 1;
  }
  return synced;
}
