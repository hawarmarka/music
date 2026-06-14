// HawarMusic — offline depo (IndexedDB)
// Şarkı ses dosyasını blob olarak saklar; internet yokken çalınabilir.
const DB_NAME = "hawarmusic_offline";
const STORE = "songs";
const VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export const offline = {
  // Şarkı blob'unu ve metadata'sını sakla
  async save(song, blob) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ id: song.id, song, blob, savedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },
  // Tek şarkıyı getir (blob URL döner)
  async get(id) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const rq = tx.objectStore(STORE).get(id);
      rq.onsuccess = () => {
        const rec = rq.result;
        if (!rec) return resolve(null);
        resolve({ ...rec.song, _localUrl: URL.createObjectURL(rec.blob) });
      };
      rq.onerror = () => resolve(null);
    });
  },
  // Saklı tüm şarkılar (metadata)
  async list() {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const rq = tx.objectStore(STORE).getAll();
      rq.onsuccess = () => resolve((rq.result || []).map((r) => r.song));
      rq.onerror = () => resolve([]);
    });
  },
  async has(id) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const rq = tx.objectStore(STORE).getKey(id);
      rq.onsuccess = () => resolve(!!rq.result);
      rq.onerror = () => resolve(false);
    });
  },
  async remove(id) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  },
  async ids() {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const rq = tx.objectStore(STORE).getAllKeys();
      rq.onsuccess = () => resolve(rq.result || []);
      rq.onerror = () => resolve([]);
    });
  },
};
