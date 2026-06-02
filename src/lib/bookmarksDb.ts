export interface BookmarkItem {
  id?: number;
  url: string;
  title: string;
  favicon?: string;
  dateAdded: number;
}

const DB_NAME = 'RCBrowserBookmarksDB';
const STORE_NAME = 'bookmarks';
const DB_VERSION = 1;

export function openBookmarksDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('url', 'url', { unique: true }); // Prevent duplicate bookmarks for same URL
        store.createIndex('dateAdded', 'dateAdded', { unique: false });
      }
    };
  });
}

export async function addBookmark(url: string, title: string, favicon?: string): Promise<number> {
  if (!url || !url.startsWith('http')) return 0;
  
  const db = await openBookmarksDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Fallback title to hostname if empty
    let resolvedTitle = title || '';
    if (!resolvedTitle) {
      try {
        resolvedTitle = new URL(url).hostname.replace('www.', '');
      } catch (e) {
        resolvedTitle = url;
      }
    }

    // Try to get default favicon if not provided
    let resolvedFavicon = favicon || '';
    if (!resolvedFavicon) {
      try {
        resolvedFavicon = `https://www.google.com/s2/favicons?sz=64&domain=${new URL(url).hostname}`;
      } catch (e) {}
    }

    const item: BookmarkItem = {
      url,
      title: resolvedTitle,
      favicon: resolvedFavicon,
      dateAdded: Date.now()
    };

    // Before adding, check if already exists to prevent unique constraint error on url index
    const index = store.index('url');
    const getRequest = index.get(url);

    getRequest.onsuccess = () => {
      if (getRequest.result) {
        // Already bookmarked, just resolve with existing ID
        resolve((getRequest.result as BookmarkItem).id || 0);
      } else {
        const putRequest = store.add(item);
        putRequest.onsuccess = () => {
          window.dispatchEvent(new Event('bookmarks-changed'));
          resolve(putRequest.result as number);
        };
        putRequest.onerror = () => reject(putRequest.error);
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function deleteBookmark(url: string): Promise<void> {
  const db = await openBookmarksDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('url');
    const getRequest = index.get(url);

    getRequest.onsuccess = () => {
      const item = getRequest.result as BookmarkItem;
      if (item && item.id !== undefined) {
        const deleteRequest = store.delete(item.id);
        deleteRequest.onsuccess = () => {
          window.dispatchEvent(new Event('bookmarks-changed'));
          resolve();
        };
        deleteRequest.onerror = () => reject(deleteRequest.error);
      } else {
        resolve(); // Not found, nothing to delete
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function deleteBookmarkById(id: number): Promise<void> {
  const db = await openBookmarksDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      window.dispatchEvent(new Event('bookmarks-changed'));
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function isPageBookmarked(url: string): Promise<boolean> {
  if (!url || !url.startsWith('http')) return false;

  const db = await openBookmarksDb();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('url');
    const request = index.get(url);

    request.onsuccess = () => {
      resolve(!!request.result);
    };
    request.onerror = () => {
      resolve(false);
    };
  });
}

export async function getAllBookmarks(): Promise<BookmarkItem[]> {
  const db = await openBookmarksDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('dateAdded');
    const items: BookmarkItem[] = [];

    // Sorted by date added in descending order
    const request = index.openCursor(null, 'prev');

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        items.push(cursor.value as BookmarkItem);
        cursor.continue();
      } else {
        resolve(items);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function clearAllBookmarks(): Promise<void> {
  const db = await openBookmarksDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      window.dispatchEvent(new Event('bookmarks-changed'));
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}
