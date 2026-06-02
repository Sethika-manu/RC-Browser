import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Trash2, 
  Search, 
  ExternalLink, 
  Globe, 
  AlertTriangle,
  FolderHeart,
  Calendar,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookmarkItem, 
  getAllBookmarks, 
  deleteBookmarkById, 
  clearAllBookmarks 
} from "../lib/bookmarksDb";

interface BookmarksProps {
  onNavigate: (url: string) => void;
}

export const Bookmarks = ({ onNavigate }: BookmarksProps) => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const loadBookmarks = async () => {
    try {
      const list = await getAllBookmarks();
      setBookmarks(list);
    } catch (e) {
      console.error("Failed to load bookmarks:", e);
    }
  };

  useEffect(() => {
    loadBookmarks();

    const handleChanged = () => {
      loadBookmarks();
    };
    window.addEventListener('bookmarks-changed', handleChanged);
    return () => {
      window.removeEventListener('bookmarks-changed', handleChanged);
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRemove = async (e: React.MouseEvent, id: number, title: string) => {
    e.stopPropagation();
    try {
      await deleteBookmarkById(id);
      showToast(`Removed "${title}" from Bookmarks.`);
    } catch (err) {
      console.error("Failed to remove bookmark:", err);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear all bookmarks? This action cannot be undone.")) {
      try {
        await clearAllBookmarks();
        showToast("All bookmarks cleared.");
      } catch (err) {
        console.error("Failed to clear bookmarks:", err);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredBookmarks = bookmarks.filter(b => {
    const query = searchQuery.toLowerCase();
    return b.title.toLowerCase().includes(query) || b.url.toLowerCase().includes(query);
  });

  return (
    <div className="h-full bg-white dark:bg-[#050505] overflow-y-auto custom-scrollbar transition-colors duration-300">
      <div className="max-w-3xl mx-auto py-12 px-8">
        
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 right-6 z-[999999] bg-neutral-900 border border-neutral-800 text-neutral-100 text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2"
            >
              <Star size={14} className="text-amber-500 fill-amber-500 animate-pulse" />
              <span className="text-neutral-100">{toast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header/Title Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Star size={24} className="text-amber-500 fill-amber-500/30" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Bookmarks</h1>
              <p className="text-neutral-500 text-sm">Access and manage your favorite web pages quickly.</p>
            </div>
          </div>
          {bookmarks.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 dark:border-red-500/5 transition-all active:scale-[0.98] self-start md:self-center"
            >
              <Trash2 size={13} /> Clear All
            </button>
          )}
        </div>

        {/* Search bar */}
        {bookmarks.length > 0 && (
          <div className="relative group mb-6">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
              <Search size={16} className="text-neutral-400 dark:text-neutral-600 group-focus-within:text-amber-500 transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookmarks by title or URL..."
              className="w-full bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-white/5 rounded-2xl py-3 pl-11 pr-10 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/30 focus:bg-white dark:focus:bg-neutral-900/60 focus:ring-2 focus:ring-amber-500/10 transition-all shadow-sm dark:shadow-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3.5 flex items-center text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Bookmarks List View */}
        <div className="space-y-4">
          {bookmarks.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-500 bg-neutral-50/50 dark:bg-neutral-900/10 border border-neutral-100 dark:border-white/5 rounded-3xl"
            >
              <FolderHeart size={48} className="mb-4 text-neutral-300 dark:text-neutral-700 animate-pulse" />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">No bookmarks saved yet</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-xs text-center">Click the star icon next to the address bar while browsing to save your favorite sites.</p>
            </motion.div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
              <Search size={32} className="mb-2 opacity-50" />
              <p className="text-sm font-medium">No matching bookmarks found</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-900/30 border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-none">
              <AnimatePresence initial={false}>
                {filteredBookmarks.map((bookmark, idx) => (
                  <motion.div
                    key={bookmark.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => onNavigate(bookmark.url)}
                    className={`flex items-center justify-between p-4.5 cursor-pointer transition-all hover:bg-neutral-50 dark:hover:bg-white/[0.01] group ${
                      idx !== filteredBookmarks.length - 1 ? 'border-b border-neutral-100 dark:border-white/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
                      <div className="flex-shrink-0 w-9 h-9 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-150 dark:border-white/5 flex items-center justify-center overflow-hidden">
                        {bookmark.favicon ? (
                          <img 
                            src={bookmark.favicon} 
                            alt="" 
                            className="w-5.5 h-5.5 object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const parent = (e.target as HTMLElement).parentElement;
                              if (parent) {
                                const fallback = parent.querySelector('.bookmark-fallback-icon');
                                if (fallback) (fallback as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div className="bookmark-fallback-icon hidden items-center justify-center text-amber-500">
                          <Globe size={16} />
                        </div>
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate group-hover:text-amber-500 transition-colors">
                            {bookmark.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-neutral-400 dark:text-neutral-500">
                          <span className="truncate max-w-sm font-medium font-mono text-[10px] text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors">
                            {bookmark.url}
                          </span>
                          <span className="flex items-center gap-1 flex-shrink-0 text-[10px] opacity-80">
                            <Calendar size={10} />
                            {formatDate(bookmark.dateAdded)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Navigate Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(bookmark.url);
                        }}
                        className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg border border-transparent dark:hover:border-white/5 transition-all opacity-0 group-hover:opacity-100"
                        title="Open Bookmark"
                      >
                        <ExternalLink size={14} />
                      </button>

                      {/* Remove Button */}
                      <button
                        onClick={(e) => handleRemove(e, bookmark.id!, bookmark.title)}
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Remove Bookmark"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Tip alert */}
        <div className="mt-8 bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex gap-3 text-amber-600 dark:text-amber-500">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold">Sync across WebViews</div>
            <p className="leading-relaxed opacity-90">Bookmarks are stored in a dedicated IndexedDB layer. All open browser WebViews instantly reflect your bookmark toggles without restarts.</p>
          </div>
        </div>

      </div>
    </div>
  );
};
