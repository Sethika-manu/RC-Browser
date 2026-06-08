export interface Extension {
  id: string;
  name: string;
  description: string;
  js: string;
  css: string;
  enabled: boolean;
  active?: boolean;
  isVerified?: boolean;
  isRemovable?: boolean;
  type?: string;
}

const DB_NAME = 'RCBrowserExtensionsDB';
const STORE_NAME = 'browser_extensions';
const DB_VERSION = 23; // Bump version to force upgradeneeded trigger

const DEFAULT_EXTENSIONS: Extension[] = [
  {
    id: "pip-helper",
    name: "Video PiP Helper",
    description: "Adds a floating Picture-in-Picture button to the YouTube main player.",
    js: `(function() { setInterval(() => { const player = document.getElementById('movie_player'); const video = document.querySelector('video.html5-main-video'); if (!player || !video) return; if (!video.dataset.rcPipSync) { video.dataset.rcPipSync = 'true'; video.addEventListener('pause', () => { if (document.pictureInPictureElement === video && player.pauseVideo) player.pauseVideo(); }); video.addEventListener('play', () => { if (document.pictureInPictureElement === video && player.playVideo) player.playVideo(); }); } if (document.getElementById('rc-pip-classic-btn')) return; document.querySelectorAll('.rc-pip-btn-classic').forEach(b => b.remove()); const btn = document.createElement('button'); btn.id = 'rc-pip-classic-btn'; btn.className = 'rc-pip-btn-classic'; btn.textContent = 'PiP Mode'; btn.style.cssText = 'position: absolute; top: 15px; left: 15px; z-index: 2147483647 !important; padding: 8px 14px; background: rgba(0,0,0,0.7); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; cursor: pointer; pointer-events: auto !important; font-family: sans-serif; font-size: 13px; font-weight: bold; backdrop-filter: blur(4px); transition: all 0.2s ease;'; btn.onmouseenter = () => btn.style.background = 'rgba(0,0,0,0.9)'; btn.onmouseleave = () => btn.style.background = 'rgba(0,0,0,0.7)'; btn.onclick = async (e) => { e.preventDefault(); e.stopPropagation(); try { if (document.pictureInPictureElement) { await document.exitPictureInPicture(); } else if (video.requestPictureInPicture) { await video.requestPictureInPicture(); } } catch (err) { console.error('PiP Error:', err); } }; player.appendChild(btn); }, 1000); })();`,
    css: ``,
    enabled: false
  },
  {
    id: "youtube-adblocker-pro",
    name: "YouTube Adblocker Pro",
    description: "Blocks pre-roll, mid-roll, and overlay ads on YouTube, auto-skipping video ads automatically.",
    js: `(function() {
  const skipYoutubeAds = () => {
    const video = document.querySelector('video.html5-main-video');
    const adShowing = document.querySelector('.ad-showing, .ad-interrupting');
    
    if (adShowing && video) {
      video.muted = true;
      if (!isNaN(video.duration) && isFinite(video.duration)) {
        video.currentTime = video.duration - 0.1;
      }
      video.playbackRate = 16.0;
    }

    const skipSelectors = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      '.ytp-skip-ad-button-modern',
      '.ytp-ad-skip-button-slot',
      '.ytp-ad-skip-button-container',
      '.ytp-ad-skip-button-text'
    ];
    
    for (const selector of skipSelectors) {
      const btn = document.querySelector(selector);
      if (btn) {
        btn.click();
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    }
  };

  setInterval(skipYoutubeAds, 500);
})();`,
    css: `ytd-promoted-sparkles-web-renderer,
ytd-display-ad-renderer,
ytd-promoted-video-renderer,
#player-ads,
#masthead-ad,
.ytd-mealbar-promo-renderer,
ytd-ad-slot-renderer,
yt-ad-layout-renderer,
.ytp-ad-progress-list,
#rendering-content.ytd-ad-slot-renderer,
#ad-companion-flash-container,
.sparkles-light-ctas,
#root.yt-ads-inner,
ytd-companion-card-renderer,
.video-ads,
.ytp-ad-module,
.ytp-ad-overlay-container,
.ytp-ad-image-overlay,
#chat-ads,
ytd-rich-grid-video-renderer[is-ad],
ytd-ad-slot-renderer-desktop,
ytd-in-feed-ad-layout-renderer {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  width: 0 !important;
  pointer-events: none !important;
}`,
    enabled: true,
    isVerified: true,
    isRemovable: false,
    type: "verified"
  },
  {
    id: "reader-mode",
    name: "Reader Mode",
    description: "Transforms web pages into a clean, readable layout by stripping menus, ads, headers, and footers.",
    js: `(function() {
  const apply = () => {
    if (!document.body.classList.contains('rc-reader-mode-active')) {
      document.body.classList.add('rc-reader-mode-active');
    }
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})();`,
    css: `body.rc-reader-mode-active {
  background-color: #fbf6ec !important;
  color: #2c2c2c !important;
  font-family: Georgia, Cambria, "Times New Roman", Times, serif !important;
  line-height: 1.62 !important;
  margin: 0 !important;
  padding: 0 !important;
}

body.rc-reader-mode-active nav,
body.rc-reader-mode-active footer,
body.rc-reader-mode-active aside,
body.rc-reader-mode-active header:not(article header),
body.rc-reader-mode-active .sidebar,
body.rc-reader-mode-active .ad,
body.rc-reader-mode-active .ads,
body.rc-reader-mode-active .comments,
body.rc-reader-mode-active #comments,
body.rc-reader-mode-active .menu,
body.rc-reader-mode-active #menu,
body.rc-reader-mode-active iframe:not([src*="youtube"]) {
  display: none !important;
}

body.rc-reader-mode-active article,
body.rc-reader-mode-active main,
body.rc-reader-mode-active .content,
body.rc-reader-mode-active #content {
  display: block !important;
  max-width: 760px !important;
  margin: 0 auto !important;
  padding: 40px 20px !important;
  background-color: #fbf6ec !important;
}

body.rc-reader-mode-active:not(:has(article)):not(:has(main)) {
  max-width: 760px !important;
  margin: 0 auto !important;
  padding: 40px 20px !important;
}`,
    enabled: false,
    isVerified: true,
    isRemovable: false,
    type: "verified"
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
    
    // Ensure active is set to true by default for new extensions
    const extensionWithActive = {
      ...extension,
      active: extension.active !== undefined ? extension.active : true
    };
    
    store.put(extensionWithActive);

    transaction.oncomplete = async () => {
      try {
        await syncExtensionsToRust();
        resolve();
      } catch (err) {
        console.warn("Failed to sync extensions on save complete:", err);
        resolve();
      }
    };

    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(new Error("Transaction aborted"));
  });
}

export async function deleteExtension(id: string): Promise<void> {
  const db = await openExtensionsDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);

    transaction.oncomplete = async () => {
      try {
        await syncExtensionsToRust();
        resolve();
      } catch (err) {
        console.warn("Failed to sync extensions on delete complete:", err);
        resolve();
      }
    };

    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(new Error("Transaction aborted"));
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
