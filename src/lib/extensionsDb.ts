export interface Extension {
  id: string;
  name: string;
  description: string;
  js: string;
  css: string;
  enabled: boolean;
}

const DB_NAME = 'RCBrowserExtensionsDB';
const STORE_NAME = 'browser_extensions';
const DB_VERSION = 21; // Bump version to force upgradeneeded trigger

const DEFAULT_EXTENSIONS: Extension[] = [
  {
    id: "pip-helper",
    name: "Video PiP Helper",
    description: "Adds a floating Picture-in-Picture button to the YouTube main player.",
    js: `(function() { setInterval(() => { const player = document.getElementById('movie_player'); const video = document.querySelector('video.html5-main-video'); if (!player || !video) return; if (!video.dataset.rcPipSync) { video.dataset.rcPipSync = 'true'; video.addEventListener('pause', () => { if (document.pictureInPictureElement === video && player.pauseVideo) player.pauseVideo(); }); video.addEventListener('play', () => { if (document.pictureInPictureElement === video && player.playVideo) player.playVideo(); }); } if (document.getElementById('rc-pip-classic-btn')) return; document.querySelectorAll('.rc-pip-btn-classic').forEach(b => b.remove()); const btn = document.createElement('button'); btn.id = 'rc-pip-classic-btn'; btn.className = 'rc-pip-btn-classic'; btn.textContent = 'PiP Mode'; btn.style.cssText = 'position: absolute; top: 15px; left: 15px; z-index: 2147483647 !important; padding: 8px 14px; background: rgba(0,0,0,0.7); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; cursor: pointer; pointer-events: auto !important; font-family: sans-serif; font-size: 13px; font-weight: bold; backdrop-filter: blur(4px); transition: all 0.2s ease;'; btn.onmouseenter = () => btn.style.background = 'rgba(0,0,0,0.9)'; btn.onmouseleave = () => btn.style.background = 'rgba(0,0,0,0.7)'; btn.onclick = async (e) => { e.preventDefault(); e.stopPropagation(); try { if (document.pictureInPictureElement) { await document.exitPictureInPicture(); } else if (video.requestPictureInPicture) { await video.requestPictureInPicture(); } } catch (err) { console.error('PiP Error:', err); } }; player.appendChild(btn); }, 1000); })();`,
    css: ``,
    enabled: false
  }
];

export function openExtensionsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      
      // Clean Reset: if the store already exists, recreate it fresh to clear any old corrupted structure
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
  });
}

// Internal helper to seed defaults if store is empty
async function seedDefaultExtensions(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      if (countRequest.result === 0) {
        const putPromises = DEFAULT_EXTENSIONS.map(ext => {
          return new Promise<void>((res, rej) => {
            const req = store.put(ext);
            req.onsuccess = () => res();
            req.onerror = () => rej(req.error);
          });
        });
        Promise.all(putPromises)
          .then(() => resolve())
          .catch(err => reject(err));
      } else {
        resolve();
      }
    };

    countRequest.onerror = () => reject(countRequest.error);
  });
}

export async function getExtensions(): Promise<Extension[]> {
  const db = await openExtensionsDb();
  await seedDefaultExtensions(db);
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as Extension[]);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function saveExtension(extension: Extension): Promise<void> {
  const db = await openExtensionsDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(extension);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteExtension(id: string): Promise<void> {
  const db = await openExtensionsDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

import { invoke } from "@tauri-apps/api/core";

export async function syncExtensionsToRust(): Promise<void> {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) return;
  
  try {
    const list = await getExtensions();
    await invoke("sync_extensions", { extensions: list });
  } catch (e) {
    console.warn("Failed to sync extensions to Rust (expected if on Android or Tauri is initializing):", e);
  }
}
