import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History as HistoryIcon, Search, Trash2, Globe, X, ExternalLink } from 'lucide-react';
import { getHistoryItems, deleteHistoryItem, clearAllHistory, HistoryItem } from '../lib/historyDb';
import { useSettings } from './SettingsContext';

interface HistoryProps {
  onNavigate: (url: string) => void;
}

export const History: React.FC<HistoryProps> = ({ onNavigate }) => {
  const { t } = useSettings();
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchHistory = async (query?: string) => {
    try {
      const items = await getHistoryItems(query);
      setHistoryList(items);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(searchQuery);

    const handleClearEvent = () => {
      fetchHistory(searchQuery);
    };
    window.addEventListener('browsing-data-cleared', handleClearEvent);
    return () => window.removeEventListener('browsing-data-cleared', handleClearEvent);
  }, [searchQuery]);

  const handleDeleteItem = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await deleteHistoryItem(id);
      setHistoryList(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const handleClearHistory = async () => {
    const confirmClear = window.confirm('Are you sure you want to clear all your browsing history?');
    if (confirmClear) {
      try {
        await clearAllHistory();
        setHistoryList([]);
        // Clear home's top sites as well for a complete cleanup experience!
        localStorage.removeItem('siteHistory');
        window.dispatchEvent(new Event('browsing-data-cleared'));
      } catch (err) {
        console.error('Failed to clear browsing history:', err);
      }
    }
  };

  // Group history items by Date
  const groupHistoryByDate = (items: HistoryItem[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const groups: { [key: string]: HistoryItem[] } = {
      Today: [],
      Yesterday: [],
      Older: []
    };

    items.forEach(item => {
      const itemDate = new Date(item.timestamp);
      itemDate.setHours(0, 0, 0, 0);

      if (itemDate.getTime() === today.getTime()) {
        groups.Today.push(item);
      } else if (itemDate.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(item);
      } else {
        groups.Older.push(item);
      }
    });

    return groups;
  };

  const groupedHistory = groupHistoryByDate(historyList);

  const getDomainName = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname;
    } catch (e) {
      return '';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="h-full bg-white dark:bg-[#050505] overflow-y-auto custom-scrollbar transition-colors duration-300">
      <div className="max-w-3xl mx-auto py-12 px-8">
        
        {/* Header section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/20">
              <HistoryIcon size={24} className="text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{t('nav_history')}</h1>
              <p className="text-neutral-500 text-sm">Review and manage your browsing history</p>
            </div>
          </div>
          {historyList.length > 0 && (
            <button 
              onClick={handleClearHistory}
              className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-red-500 transition-colors px-3 py-2 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/20 active:scale-95 duration-200"
            >
              <Trash2 size={14} />
              Clear Browsing Data
            </button>
          )}
        </div>

        {/* Search bar */}
        <div className="relative mb-8 group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search size={16} className="text-neutral-400 dark:text-neutral-600 group-focus-within:text-accent transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history by title or URL..."
            className="w-full bg-neutral-100 dark:bg-neutral-900/30 border border-neutral-200 dark:border-white/5 rounded-2xl py-3 pl-12 pr-10 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-accent/30 focus:bg-white dark:focus:bg-neutral-900/60 transition-all shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center px-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-600">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm">Loading history data...</p>
          </div>
        ) : historyList.length === 0 ? (
          <div className="text-center py-20 bg-neutral-50 dark:bg-neutral-900/10 border border-neutral-100 dark:border-white/5 rounded-3xl backdrop-blur-sm shadow-sm dark:shadow-none">
            <HistoryIcon size={40} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4 opacity-50" />
            <p className="text-sm text-neutral-500 font-medium">Your browsing history is clean. No records found.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedHistory).map(groupKey => {
              const items = groupedHistory[groupKey];
              if (items.length === 0) return null;

              return (
                <div key={groupKey} className="space-y-3">
                  <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest px-1">
                    {groupKey === 'Older' ? 'Older History' : groupKey}
                  </h3>
                  
                  <div className="bg-white dark:bg-[#0a0a0a]/30 border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden backdrop-blur-md shadow-sm dark:shadow-none">
                    <AnimatePresence initial={false}>
                      {items.map((item, idx) => {
                        const domain = getDomainName(item.url);
                        const faviconUrl = domain 
                          ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
                          : null;

                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => onNavigate(item.url)}
                            className={`flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors group relative ${
                              idx !== items.length - 1 ? 'border-b border-neutral-100 dark:border-white/5' : ''
                            }`}
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0 pr-8">
                              {/* Favicon / Icon */}
                              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 flex items-center justify-center flex-shrink-0 text-neutral-500 dark:text-neutral-400 overflow-hidden">
                                {faviconUrl ? (
                                  <img 
                                    src={faviconUrl} 
                                    alt="" 
                                    className="w-4 h-4 object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.parentElement?.classList.add('fallback-icon');
                                    }}
                                  />
                                ) : (
                                  <Globe size={14} />
                                )}
                                <Globe size={14} className="hidden absolute fallback-icon" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate group-hover:text-accent transition-colors flex items-center gap-1.5">
                                  {item.title}
                                  <ExternalLink size={10} className="opacity-0 group-hover:opacity-60 transition-opacity text-neutral-400" />
                                </div>
                                <div className="text-xs text-neutral-400 dark:text-neutral-500 truncate mt-0.5 font-mono">
                                  {item.url}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className="text-[10px] text-neutral-400 dark:text-neutral-600 font-mono whitespace-nowrap bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-200 dark:border-white/5">
                                {formatTime(item.timestamp)}
                              </span>
                              
                              <button
                                onClick={(e) => handleDeleteItem(e, item.id!)}
                                className="p-1.5 text-neutral-400 dark:text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Remove from history"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
