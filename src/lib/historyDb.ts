export interface HistoryItem {
  id?: number;
  url: string;
  title: string;
  timestamp: number;
}

const DB_NAME = 'RCBrowserHistoryDB';
const STORE_NAME = 'browsing_history';
const DB_VERSION = 1;

export function openHistoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('url', 'url', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
    };
  });
}

export async function getLastHistoryItem(): Promise<HistoryItem | null> {
  const db = await openHistoryDb();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev');
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        resolve(cursor.value as HistoryItem);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => {
      resolve(null);
    };
  });
}

let lastLoggedUrl = '';
let lastLoggedTime = 0;

export async function addHistoryItem(url: string, title: string): Promise<number> {
  // Only record HTTP/HTTPS pages, ignoring internal pages (like chrome:, about:, file:, etc.)
  if (!url || !url.startsWith('http')) return 0;

  // 1. Synchronous In-Memory Cache Guard (defends against race conditions)
  const now = Date.now();
  if (url === lastLoggedUrl && (now - lastLoggedTime) < 2000) {
    return 0;
  }
  // Synchronously update the cache immediately
  lastLoggedUrl = url;
  lastLoggedTime = now;

  try {
    const lastItem = await getLastHistoryItem();
    if (lastItem && lastItem.url === url) {
      const timeDiff = Date.now() - lastItem.timestamp;
      if (timeDiff < 2000) {
        return lastItem.id || 0;
      }
    }
  } catch (e) {
    console.error("Failed to query last history item for deduplication:", e);
  }
  
  const db = await openHistoryDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Fallback title to hostname if empty
    let pageTitle = title || '';
    if (!pageTitle) {
      try {
        pageTitle = new URL(url).hostname.replace('www.', '');
      } catch (e) {
        pageTitle = url;
      }
    }

    const item: HistoryItem = {
      url,
      title: pageTitle,
      timestamp: Date.now()
    };

    const request = store.add(item);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteHistoryItem(id: number): Promise<void> {
  const db = await openHistoryDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllHistory(): Promise<void> {
  const db = await openHistoryDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getHistoryItems(query?: string): Promise<HistoryItem[]> {
  const db = await openHistoryDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const items: HistoryItem[] = [];

    // Open a cursor sorted by timestamp in descending order (newest first)
    const request = index.openCursor(null, 'prev');

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        const item = cursor.value as HistoryItem;
        if (query) {
          const lowerQuery = query.toLowerCase();
          const matchUrl = item.url.toLowerCase().includes(lowerQuery);
          const matchTitle = item.title.toLowerCase().includes(lowerQuery);
          if (matchUrl || matchTitle) {
            items.push(item);
          }
        } else {
          items.push(item);
        }
        cursor.continue();
      } else {
        resolve(items);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export const logHistoryVisit = async (url: string, title?: string) => {
  if (!url || !url.startsWith('http')) return;
  try {
    let resolvedTitle = title || '';
    if (!resolvedTitle) {
      resolvedTitle = new URL(url).hostname.replace('www.', '');
    }
    await addHistoryItem(url, resolvedTitle);
  } catch (e) {
    console.error("Failed to log history visit:", e);
  }
};

export function clearSearchSuggestionsOnly(): void {
  try {
    localStorage.removeItem('app_browser_history');
    window.dispatchEvent(new Event('search-suggestions-cleared'));
  } catch (e) {
    console.error("Failed to clear search suggestions:", e);
  }
}
