const DB_NAME = 'supernote'
const STORE = 'remembered'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveWK(workspaceId: string, wk: Uint8Array) {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    const store = tx.objectStore(STORE)
    store.put(wk, workspaceId)
  })
}

export async function loadWK(workspaceId: string): Promise<Uint8Array | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.get(workspaceId)
    req.onsuccess = () => {
      const val = req.result as ArrayBuffer | undefined
      resolve(val ? new Uint8Array(val) : null)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function forgetWK(workspaceId: string) {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.delete(workspaceId)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

