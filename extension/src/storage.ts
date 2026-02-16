/**
 * Local-only storage for pending PDF. Uses IndexedDB so we can store
 * full PDF bytes (Chrome storage has an 8KB per-item limit).
 * All data stays on the user's device.
 */
const DB_NAME = "paralegal-toolkit-db";
const STORE_NAME = "pending-pdf";
const PENDING_ID_KEY = "bates_pending_id";

export async function savePendingPdf(data: ArrayBuffer, filename: string): Promise<string> {
  const id = `bates_${Date.now()}`;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, data, filename });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  await chrome.storage.session.set({ [PENDING_ID_KEY]: id });
  return id;
}

export async function getPendingPdf(): Promise<{ data: ArrayBuffer; filename: string } | null> {
  const { [PENDING_ID_KEY]: id } = await chrome.storage.session.get(PENDING_ID_KEY);
  if (!id || typeof id !== "string") return null;
  const db = await openDb();
  const row = await new Promise<{ data: ArrayBuffer; filename: string } | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(tx.error);
  });
  db.close();
  if (!row) return null;
  await clearPendingPdf();
  return { data: row.data, filename: row.filename };
}

export async function clearPendingPdf(): Promise<void> {
  const { [PENDING_ID_KEY]: id } = await chrome.storage.session.get(PENDING_ID_KEY);
  if (!id) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  await chrome.storage.session.remove(PENDING_ID_KEY);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
  });
}
