import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X, Minus, Square, Copy, Search, ArrowLeft, ArrowRight, RotateCw, Home, Star, Shield, Mail, RefreshCw, Trash2, ExternalLink, Loader2, Columns, Timer, MoreVertical, Puzzle, Settings, History as HistoryIcon, Download } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { generateEmail, getInbox, getMessageDetails, TempMailMessage, TempMailDetails } from "../lib/tempMail";

const appWindow = getCurrentWindow();

export function recordSearchHistory(queryOrUrl: string) {
  if (!queryOrUrl || !queryOrUrl.trim()) return;
  try {
    const rawHistory = localStorage.getItem('app_browser_history');
    let history: { queryOrUrl: string; timestamp: number }[] = [];
    if (rawHistory) {
      try {
        history = JSON.parse(rawHistory);
      } catch (e) {
        history = [];
      }
    }
    if (!Array.isArray(history)) {
      history = [];
    }
    history.push({
      queryOrUrl: queryOrUrl.trim(),
      timestamp: Date.now()
    });
    if (history.length > 100) {
      history = history.slice(history.length - 100);
    }
    localStorage.setItem('app_browser_history', JSON.stringify(history));
  } catch (e) {
    console.error("Failed to record search history:", e);
  }
}

export function parseBangSearch(query: string): string | null {
  const trimmed = query.trim();
  const match = trimmed.match(/^!(yt|gh|w|g)(?:\s+(.*))?$/i);
  if (!match) return null;
  
  const bang = match[1].toLowerCase();
  const searchPart = match[2] ? match[2].trim() : "";
  const encodedQuery = encodeURIComponent(searchPart);
  
  switch (bang) {
    case "yt":
      return `https://www.youtube.com/results?search_query=${encodedQuery}`;
    case "gh":
      return `https://github.com/search?q=${encodedQuery}`;
    case "w":
      return `https://en.wikipedia.org/wiki/Special:Search?search=${encodedQuery}`;
    case "g":
      return `https://www.google.com/search?q=${encodedQuery}`;
    default:
      return null;
  }
}

interface TitleBarProps {
  onNavigate?: (url: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  activeSessionId: string | null;
  sessions?: { id: string; title: string; url: string }[];
  isSplitScreen?: boolean;
  onToggleSplitScreen?: () => void;
  onDownloadsClick?: () => void;
  onBookmarksClick?: () => void;
  onHistoryClick?: () => void;
  onExtensionsClick?: () => void;
  onSettingsClick?: () => void;
  activeView?: string;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export const TitleBar = ({ 
  onNavigate, 
  searchValue, 
  onSearchChange, 
  activeSessionId, 
  sessions,
  isSplitScreen = false,
  onToggleSplitScreen,
  onDownloadsClick,
  onBookmarksClick,
  onHistoryClick,
  onExtensionsClick,
  onSettingsClick,
  activeView,
  isZenMode = false,
  onToggleZenMode
}: TitleBarProps) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showProxyPanel, setShowProxyPanel] = useState(false);
  const [proxyEnabled, setProxyEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('rc_proxy_config');
      if (stored) {
        return JSON.parse(stored).enabled || false;
      }
    } catch (e) {}
    return false;
  });
  const [proxyType, setProxyType] = useState<'http' | 'socks5'>(() => {
    try {
      const stored = localStorage.getItem('rc_proxy_config');
      if (stored) {
        return JSON.parse(stored).proxy_type || 'http';
      }
    } catch (e) {}
    return 'http';
  });
  const [proxyIp, setProxyIp] = useState(() => {
    try {
      const stored = localStorage.getItem('rc_proxy_config');
      if (stored) {
        return JSON.parse(stored).ip || '';
      }
    } catch (e) {}
    return '';
  });
  const [proxyPort, setProxyPort] = useState(() => {
    try {
      const stored = localStorage.getItem('rc_proxy_config');
      if (stored) {
        return JSON.parse(stored).port || '';
      }
    } catch (e) {}
    return '';
  });

  const [proxyStatus, setProxyStatus] = useState<'idle' | 'success' | 'error'>(() => {
    try {
      const stored = localStorage.getItem('rc_proxy_config');
      if (stored) {
        return JSON.parse(stored).enabled ? 'success' : 'idle';
      }
    } catch (e) {}
    return 'idle';
  });
  const [proxyError, setProxyError] = useState<string | null>(null);

  const handleSaveProxy = async () => {
    const config = {
      enabled: proxyEnabled,
      proxy_type: proxyType,
      ip: proxyIp,
      port: proxyPort
    };

    try {
      setProxyError(null);
      await invoke("set_proxy_config", { config });
      localStorage.setItem('rc_proxy_config', JSON.stringify(config));
      setProxyStatus(proxyEnabled ? 'success' : 'idle');
      window.dispatchEvent(new Event('rc-recreate-active-webview'));
      setShowProxyPanel(false);
      if (proxyEnabled) {
        alert("VPN Applied! Please open a new tab or restart the browser to route traffic.");
      } else {
        alert("VPN Disabled. Please restart the browser to restore standard connection.");
      }
    } catch (e: any) {
      console.error("Failed to save proxy config:", e);
      const errorMsg = e?.toString() || "Unknown proxy error";
      setProxyError(errorMsg);
      if (proxyEnabled) {
        setProxyStatus('error');
      }
    }
  };

  useEffect(() => {
    const checkBookmarkStatus = async () => {
      const url = searchValue.trim();
      if (url && url.startsWith('http')) {
        const { isPageBookmarked } = await import("../lib/bookmarksDb");
        const bookmarked = await isPageBookmarked(url);
        setIsBookmarked(bookmarked);
      } else {
        setIsBookmarked(false);
      }
    };

    checkBookmarkStatus();

    window.addEventListener('bookmarks-changed', checkBookmarkStatus);
    return () => {
      window.removeEventListener('bookmarks-changed', checkBookmarkStatus);
    };
  }, [searchValue]);

  const handleToggleBookmark = async () => {
    const url = searchValue.trim();
    if (!url || !url.startsWith('http')) return;

    try {
      const { addBookmark, deleteBookmark } = await import("../lib/bookmarksDb");
      const activeSession = sessions?.find(s => s.id === activeSessionId);
      const title = activeSession?.title || url;

      if (isBookmarked) {
        await deleteBookmark(url);
        setIsBookmarked(false);
      } else {
        await addBookmark(url, title);
        setIsBookmarked(true);
      }
    } catch (e) {
      console.error("Failed to toggle bookmark:", e);
    }
  };
  const [isMaximized, setIsMaximized] = useState(false);
  const [appVersion, setAppVersion] = useState("0.1.0");
  const [isMobile, setIsMobile] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{ queryOrUrl: string; timestamp: number }[]>([]);

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  // Built-in Temp Mail states (PC Only)
  const [tempEmail, setTempEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem('rc_temp_email') || null;
    } catch (e) {
      return null;
    }
  });
  const [tempMailToken, setTempMailToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('rc_temp_email_token') || null;
    } catch (e) {
      return null;
    }
  });
  const [emails, setEmails] = useState<TempMailMessage[]>([]);
  const [showTempMailPanel, setShowTempMailPanel] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<TempMailDetails | null>(null);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingInbox, setIsCheckingInbox] = useState(false);

  const knownEmailIdsRef = useRef<Set<string>>(new Set());

  // Polling logic for temporary email (PC Only)
  useEffect(() => {
    if (isMobile || !tempEmail || !tempMailToken) {
      setEmails([]);
      knownEmailIdsRef.current = new Set();
      return;
    }

    let isFirstFetch = true;

    const fetchInbox = async () => {
      setIsCheckingInbox(true);
      try {
        const name = tempEmail.split("@")[0];
        const list = await getInbox(name, tempMailToken);
        
        // Find if there are new messages
        const newEmails = list.filter(msg => !knownEmailIdsRef.current.has(msg.id));
        
        // Trigger toast for new emails (skip on initial load)
        if (!isFirstFetch && newEmails.length > 0) {
          newEmails.forEach(msg => {
            window.dispatchEvent(new CustomEvent('rc-show-toast', {
              detail: {
                title: `New Email: ${msg.subject}`,
                desc: `From: ${msg.from}`
              }
            }));
          });
        }

        // Add all fetched email IDs to known list
        list.forEach(msg => knownEmailIdsRef.current.add(msg.id));
        setEmails(list);
        isFirstFetch = false;
      } catch (err) {
        console.error("Failed to poll temp mail inbox:", err);
      } finally {
        setIsCheckingInbox(false);
      }
    };

    fetchInbox();
    const interval = setInterval(fetchInbox, 12000);

    return () => {
      clearInterval(interval);
    };
  }, [tempEmail, tempMailToken, isMobile]);

  const handleGenerateTempMail = async () => {
    setIsGenerating(true);
    try {
      const { email, token } = await generateEmail();
      setTempEmail(email);
      setTempMailToken(token);
      localStorage.setItem('rc_temp_email', email);
      localStorage.setItem('rc_temp_email_token', token);
      
      // Clear old messages and list of known IDs
      setEmails([]);
      knownEmailIdsRef.current = new Set();
      setSelectedMessage(null);

      // Copy to clipboard
      await navigator.clipboard.writeText(email);

      // Dispatch toast event
      window.dispatchEvent(new CustomEvent('rc-show-toast', {
        detail: {
          title: "Temp Mail Active!",
          desc: "Copied to clipboard: " + email
        }
      }));
      setShowTempMailPanel(true);
    } catch (error) {
      console.error("Failed to generate temp mail:", error);
      window.dispatchEvent(new CustomEvent('rc-show-toast', {
        detail: {
          title: "Generation Failed",
          desc: "Could not create temporary email address."
        }
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyTempMail = async () => {
    if (!tempEmail) return;
    try {
      await navigator.clipboard.writeText(tempEmail);
      window.dispatchEvent(new CustomEvent('rc-show-toast', {
        detail: {
          title: "Copied!",
          desc: "Temp Mail copied to clipboard."
        }
      }));
    } catch (err) {
      console.error("Failed to copy email:", err);
    }
  };

  const handleClearTempMail = () => {
    setTempEmail(null);
    setTempMailToken(null);
    localStorage.removeItem('rc_temp_email');
    localStorage.removeItem('rc_temp_email_token');
    setEmails([]);
    knownEmailIdsRef.current = new Set();
    setSelectedMessage(null);
    setShowTempMailPanel(false);
    window.dispatchEvent(new CustomEvent('rc-show-toast', {
      detail: {
        title: "Temp Mail Deactivated",
        desc: "Monitoring stopped and data cleared."
      }
    }));
  };

  const handleViewMessage = async (id: string) => {
    if (!tempEmail || !tempMailToken) return;
    setIsLoadingMessage(true);
    try {
      const name = tempEmail.split("@")[0];
      const msg = await getMessageDetails(name, tempMailToken, id);
      setSelectedMessage(msg);
    } catch (err) {
      console.error("Failed to load message details:", err);
    } finally {
      setIsLoadingMessage(false);
    }
  };

  useEffect(() => {
    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
  }, []);

  useEffect(() => {
    getVersion().then(setAppVersion).catch((err) => {
      console.error("Failed to get app version:", err);
    });
  }, []);

  useEffect(() => {
    const handleSuggestionsCleared = () => {
      setSuggestions([]);
    };
    window.addEventListener('search-suggestions-cleared', handleSuggestionsCleared);
    return () => {
      window.removeEventListener('search-suggestions-cleared', handleSuggestionsCleared);
    };
  }, []);

  useEffect(() => {
    const updateIsMaximized = async () => {
      setIsMaximized(await appWindow.isMaximized());
    };
    updateIsMaximized();
    
    const unlisten = appWindow.onResized(() => {
      updateIsMaximized();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  interface HistoryState {
    stack: string[];
    index: number;
  }
  const sessionHistoryMapRef = useRef<Record<string, HistoryState>>({});
  const lastBackClickRef = useRef<number>(0);

  useEffect(() => {
    if (!activeSessionId) {
      setCanGoBack(false);
      setCanGoForward(false);
      return;
    }
    
    const state = sessionHistoryMapRef.current[activeSessionId] || { stack: [""], index: 0 };
    const currentUrl = searchValue.trim() === "about:blank" ? "" : searchValue.trim();
    
    const lastUrl = state.stack[state.index];
    if (lastUrl !== currentUrl) {
      // Check if we went back
      if (state.index > 0 && state.stack[state.index - 1] === currentUrl) {
        state.index--;
      } 
      // Check if we went forward
      else if (state.index < state.stack.length - 1 && state.stack[state.index + 1] === currentUrl) {
        state.index++;
      }
      // New navigation
      else {
        state.stack = state.stack.slice(0, state.index + 1);
        state.stack.push(currentUrl);
        state.index = state.stack.length - 1;
      }
      sessionHistoryMapRef.current[activeSessionId] = state;
    }
    
    setCanGoBack(state.index > 0);
    setCanGoForward(state.index < state.stack.length - 1);
  }, [activeSessionId, searchValue]);

  const handleMinimize = async () => {
    await appWindow.minimize();
  };

  const handleMaximize = async () => {
    if (await appWindow.isMaximized()) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
    setIsMaximized(await appWindow.isMaximized());
  };

  const handleClose = async () => {
    await appWindow.close();
  };

  const handleFocus = () => {
    setShowSuggestions(true);
  };

  const handleSuggestionMouseDown = (e: React.MouseEvent, queryOrUrl: string) => {
    e.preventDefault();
    e.stopPropagation();
    onSearchChange(queryOrUrl);
    setShowSuggestions(false);
    
    recordSearchHistory(queryOrUrl);
    if (onNavigate) {
      const parsedUrl = parseBangSearch(queryOrUrl);
      onNavigate(parsedUrl || queryOrUrl);
    }
  };

  const handleDeleteSuggestion = (e: React.MouseEvent, queryOrUrlToDelete: string, timestampToDelete: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const rawHistory = localStorage.getItem('app_browser_history');
      if (rawHistory) {
        const history = JSON.parse(rawHistory);
        if (Array.isArray(history)) {
          const updated = history.filter(item => !(item.queryOrUrl === queryOrUrlToDelete && item.timestamp === timestampToDelete));
          localStorage.setItem('app_browser_history', JSON.stringify(updated));
          
          let list = [...updated].reverse();
          const query = searchValue.trim().toLowerCase();
          if (query) {
            list = list.filter(item => item.queryOrUrl.toLowerCase().includes(query));
          }
          setSuggestions(list.slice(0, 5));
        }
      }
    } catch (err) {
      console.error("Failed to delete search history entry:", err);
    }
  };

  useEffect(() => {
    if (!showSuggestions) return;
    
    const rawHistory = localStorage.getItem('app_browser_history');
    if (rawHistory) {
      try {
        const parsed = JSON.parse(rawHistory);
        if (Array.isArray(parsed)) {
          let list = [...parsed].reverse();
          const query = searchValue.trim().toLowerCase();
          if (query) {
            list = list.filter(item => item.queryOrUrl.toLowerCase().includes(query));
          }
          setSuggestions(list.slice(0, 5));
        }
      } catch (e) {
        console.error("Failed to parse app_browser_history", e);
      }
    } else {
      setSuggestions([]);
    }
  }, [searchValue, showSuggestions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchValue.trim();
    if (query) {
      recordSearchHistory(query);
      if (onNavigate) {
        const parsedUrl = parseBangSearch(query);
        onNavigate(parsedUrl || query);
      }
    }
  };

  const handleGoBack = async () => {
    if (activeSessionId) {
      if (isMobile) {
        const win = window as any;
        if (win.NativeBridge || win.AndroidBridge) {
          (win.NativeBridge || win.AndroidBridge).goBack();
        }
      } else {
        await invoke("go_back", { label: activeSessionId }).catch((err) => {
          console.warn("Failed to go back on PC:", err);
        });
      }
    }
  };

  const handleGoForward = async () => {
    if (activeSessionId) {
      if (isMobile) {
        const win = window as any;
        if (win.NativeBridge || win.AndroidBridge) {
          (win.NativeBridge || win.AndroidBridge).goForward();
        }
      } else {
        await invoke("go_forward", { label: activeSessionId }).catch((err) => {
          console.warn("Failed to go forward on PC:", err);
        });
      }
    }
  };

  const handleReload = async () => {
    if (activeSessionId) {
      const win = window as any;
      if (isMobile) {
        const bridge = win.AndroidBridge || win.NativeBridge;
        if (bridge) {
          if (typeof bridge.reloadWebview === "function") {
            bridge.reloadWebview();
          } else if (typeof bridge.reload === "function") {
            bridge.reload();
          }
        }
      } else {
        await invoke("reload_webview", { label: activeSessionId }).catch((err) => {
          console.warn("Failed to reload PC webview:", err);
        });
      }
    }
  };

  const handleGoHomeSession = () => {
    if (onNavigate) {
      onNavigate("");
    }
  };

  const handleMouseDownDrag = (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (!target.closest('button') && !target.closest('input')) {
        appWindow.startDragging();
      }
    }
  };

  return (
    <header
      data-tauri-drag-region={isMobile ? undefined : ""}
      onMouseDown={isMobile ? undefined : handleMouseDownDrag}
      className="bg-white dark:bg-[#0a0a0a] border-b border-neutral-200 dark:border-white/5 flex items-center justify-between px-4 select-none cursor-default active:cursor-grabbing h-12 w-full text-neutral-800 dark:text-neutral-100 relative z-[99999]"
    >
      <div data-tauri-drag-region={isMobile ? undefined : ""} className="flex items-center gap-3 w-1/4 min-w-max max-w-[25%] h-full pointer-events-none hidden md:flex flex-shrink-0">
          <div className="w-2.5 h-2.5 bg-accent rounded-full shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" />
          <span className="text-[10px] font-bold font-mono tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
            RC BROWSER <span className="text-neutral-300 dark:text-neutral-700 font-normal">{appVersion}</span>
          </span>
        </div>

      <div className="flex-1 w-full flex items-center gap-2 h-full min-w-[280px]">
        {activeSessionId && (
          <div className="flex items-center gap-1 mr-2 flex-shrink-0">
            <button
              onClick={handleGoBack}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors rounded-md cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={handleGoForward}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors rounded-md cursor-pointer"
              title="Go Forward"
            >
              <ArrowRight size={16} />
            </button>
            <button
              onClick={handleReload}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors rounded-md ml-0.5"
              title="Reload"
            >
              <RotateCw size={14} />
            </button>
            <button
              onClick={handleGoHomeSession}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors rounded-md ml-0.5"
              title="Home Start Page"
            >
              <Home size={15} />
            </button>
            <button
              onClick={handleToggleBookmark}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors rounded-md ml-0.5 cursor-pointer flex items-center justify-center"
              title={isBookmarked ? "Remove Bookmark" : "Bookmark this Page"}
            >
              <Star size={15} className={isBookmarked ? "text-amber-500 fill-amber-500" : "text-neutral-500 hover:text-neutral-950 dark:hover:text-white"} />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSearch} className="relative group flex-1 min-w-[250px] flex-shrink">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={12} className="text-neutral-400 dark:text-neutral-600 group-focus-within:text-accent transition-colors" />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={() => setShowSuggestions(false)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Search or enter URL..."
            className="w-full bg-neutral-100 dark:bg-neutral-900/50 border border-neutral-200 dark:border-white/5 rounded-lg py-1.5 pl-9 pr-4 text-xs text-neutral-800 dark:text-neutral-300 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-accent/30 focus:bg-white dark:focus:bg-neutral-900/80 transition-all"
          />

          {showSuggestions && suggestions.length > 0 && (
            <div 
              className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-white/10 rounded-lg shadow-xl overflow-hidden z-[99999]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onMouseDown={(e) => handleSuggestionMouseDown(e, item.queryOrUrl)}
                  className="px-4 py-2 text-[11px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer transition-colors flex items-center justify-between gap-2 group/row"
                >
                  <div className="flex items-center gap-2 truncate flex-1">
                    <Search size={10} className="text-neutral-400 dark:text-neutral-600 flex-shrink-0" />
                    <span className="truncate">{item.queryOrUrl}</span>
                  </div>
                  <button
                    onMouseDown={(e) => handleDeleteSuggestion(e, item.queryOrUrl, item.timestamp)}
                    className="p-1 hover:bg-neutral-200 dark:hover:bg-white/10 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center justify-center flex-shrink-0"
                    title="Delete History Entry"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </form>

        {!isMobile && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <style>{`
              @keyframes vpnPulseGreen {
                0% {
                  transform: scale(1);
                  filter: drop-shadow(0 0 2px rgba(16, 185, 129, 0.4));
                }
                50% {
                  transform: scale(1.08);
                  filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8));
                }
                100% {
                  transform: scale(1);
                  filter: drop-shadow(0 0 2px rgba(16, 185, 129, 0.4));
                }
              }
              @keyframes vpnPulseRed {
                0% {
                  transform: scale(1);
                  filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.4));
                }
                50% {
                  transform: scale(1.08);
                  filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));
                }
                100% {
                  transform: scale(1);
                  filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.4));
                }
              }
              @keyframes mailPulseGreen {
                0% {
                  transform: scale(1);
                  filter: drop-shadow(0 0 2px rgba(16, 185, 129, 0.4));
                }
                50% {
                  transform: scale(1.12);
                  filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8));
                }
                100% {
                  transform: scale(1);
                  filter: drop-shadow(0 0 2px rgba(16, 185, 129, 0.4));
                }
              }
              .vpn-pulse-green {
                animation: vpnPulseGreen 2s infinite ease-in-out;
              }
              .vpn-pulse-red {
                animation: vpnPulseRed 1.5s infinite ease-in-out;
              }
              .mail-pulse-green {
                animation: mailPulseGreen 2s infinite ease-in-out;
              }
              .temp-mail-scrollbar::-webkit-scrollbar {
                width: 4px;
              }
              .temp-mail-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .temp-mail-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(156, 163, 175, 0.3);
                border-radius: 4px;
              }
              .temp-mail-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(156, 163, 175, 0.5);
              }
            `}</style>

            {/* Dual View Toggle Section */}
            <div className="relative flex-shrink-0">
              <button
                onClick={onToggleSplitScreen}
                onMouseDown={(e) => e.stopPropagation()}
                className={`p-2 transition-all duration-300 rounded-lg cursor-pointer hidden lg:flex items-center justify-center gap-1.5 text-xs font-medium border ${
                  isSplitScreen
                    ? "bg-accent/10 border-accent/30 text-accent shadow-md shadow-accent/10"
                    : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-white/5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
                title="Toggle Split-Screen Dual View"
              >
                <Columns size={14} className={isSplitScreen ? "text-accent" : ""} />
                <span className="hidden xl:inline">Dual View</span>
              </button>
            </div>

            {/* VPN / Proxy Section */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => {
                  setShowProxyPanel(!showProxyPanel);
                  setShowTempMailPanel(false);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`p-2 transition-all duration-300 rounded-lg cursor-pointer hidden lg:flex items-center justify-center gap-1.5 text-xs font-medium border ${
                  proxyEnabled
                    ? proxyStatus === 'success'
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                      : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                    : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-white/5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
                title="Proxy / VPN Configuration"
              >
                <Shield 
                  size={14} 
                  className={
                    proxyEnabled
                      ? proxyStatus === 'success'
                        ? "fill-emerald-500/20 text-emerald-500 vpn-pulse-green"
                        : "fill-rose-500/20 text-rose-500 vpn-pulse-red"
                      : ""
                  } 
                />
                <span className="hidden xl:inline">VPN</span>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  proxyEnabled 
                    ? proxyStatus === 'success' 
                      ? "bg-emerald-500" 
                      : "bg-rose-500" 
                    : "bg-neutral-300 dark:bg-neutral-700"
                }`} />
              </button>

              {showProxyPanel && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#0c0c0c] border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl p-5 z-[999999] text-left cursor-default select-text"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-neutral-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <Shield 
                        size={16} 
                        className={
                          proxyEnabled 
                            ? proxyStatus === 'success'
                              ? "text-emerald-500 fill-emerald-500/10 vpn-pulse-green" 
                              : "text-rose-500 fill-rose-500/10 vpn-pulse-red"
                            : "text-neutral-400"
                        } 
                      />
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">VPN / Proxy Routing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${
                        proxyEnabled ? 'text-emerald-500' : 'text-neutral-400'
                      }`}>
                        {proxyEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                      <button
                        onClick={() => setProxyEnabled(!proxyEnabled)}
                        className={`w-9 h-5 rounded-full relative transition-all duration-300 shadow-inner cursor-pointer ${
                          proxyEnabled
                            ? 'bg-emerald-500 shadow-emerald-600/50'
                            : 'bg-neutral-200 dark:bg-neutral-800'
                        }`}
                        title={proxyEnabled ? "Disable VPN" : "Enable VPN"}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ease-out ${
                          proxyEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {proxyError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg p-2 text-[10px] font-medium leading-normal">
                        ⚠️ Connection failed: {proxyError}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Proxy Protocol</label>
                        <select
                          value={proxyType}
                          onChange={(e) => setProxyType(e.target.value as any)}
                          className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-lg px-2.5 py-2 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all"
                        >
                          <option value="http">HTTP</option>
                          <option value="socks5">SOCKS5</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">IP Address / Host</label>
                        <input
                          type="text"
                          value={proxyIp}
                          onChange={(e) => setProxyIp(e.target.value)}
                          placeholder="e.g. 127.0.0.1"
                          className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-lg px-2.5 py-2 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Port</label>
                        <input
                          type="text"
                          value={proxyPort}
                          onChange={(e) => setProxyPort(e.target.value)}
                          placeholder="e.g. 8080"
                          className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-lg px-2.5 py-2 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2.5 border-t border-neutral-100 dark:border-white/5 justify-end">
                      <button
                        onClick={() => setShowProxyPanel(false)}
                        className="px-3 py-2 rounded-lg text-[10px] font-bold text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProxy}
                        className="px-4 py-2 rounded-lg text-[10px] font-bold text-white bg-accent hover:bg-accent/90 shadow-md shadow-accent/20 transition-all cursor-pointer"
                      >
                        Apply & Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Built-in Temp Mail Section */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => {
                  if (!tempEmail) {
                    handleGenerateTempMail();
                  } else {
                    setShowTempMailPanel(!showTempMailPanel);
                  }
                  setShowProxyPanel(false);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`p-2 transition-all duration-300 rounded-lg cursor-pointer hidden lg:flex items-center justify-center gap-1.5 text-xs font-medium border ${
                  tempEmail
                    ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-650 dark:text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)] animate-none"
                    : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-white/5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
                title="Temporary Email Generator"
              >
                <Mail 
                  size={14} 
                  className={tempEmail ? "text-indigo-500" : ""}
                />
                <span className="hidden xl:inline">Temp Mail</span>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  tempEmail 
                    ? "bg-emerald-500 mail-pulse-green" 
                    : "bg-neutral-300 dark:bg-neutral-700"
                }`} />
              </button>

              {showTempMailPanel && (
                <div
                  className="absolute right-0 mt-2 w-[340px] bg-white dark:bg-[#0c0c0c] border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl p-5 z-[999999] text-left cursor-default select-text flex flex-col gap-4"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Panel Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-indigo-500" />
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Temporary Email</span>
                    </div>
                    <button
                      onClick={() => setShowTempMailPanel(false)}
                      className="p-1 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Body Content */}
                  {selectedMessage ? (
                    /* Reading message detail view */
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => setSelectedMessage(null)}
                        className="text-[10px] font-bold text-indigo-500 hover:underline flex items-center gap-1 cursor-pointer self-start"
                      >
                        &larr; Back to Inbox
                      </button>
                      
                      <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl p-3 flex flex-col gap-1.5">
                        <div className="text-[11px]"><span className="font-bold text-neutral-400">From:</span> <span className="font-semibold text-neutral-700 dark:text-neutral-300">{selectedMessage.from}</span></div>
                        <div className="text-[11px]"><span className="font-bold text-neutral-400">Subject:</span> <span className="font-bold text-neutral-800 dark:text-neutral-100">{selectedMessage.subject}</span></div>
                        <div className="text-[9px] text-neutral-450 dark:text-neutral-500 font-mono mt-0.5">{selectedMessage.date}</div>
                      </div>

                      <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl p-3 mt-1">
                        <div 
                          className="text-xs text-neutral-750 dark:text-neutral-355 overflow-y-auto max-h-56 temp-mail-scrollbar select-text leading-relaxed break-words"
                          dangerouslySetInnerHTML={{ __html: selectedMessage.body || selectedMessage.textBody || "<p className='text-neutral-400 italic'>No content</p>" }}
                        />
                      </div>
                    </div>
                  ) : tempEmail ? (
                    /* Normal active inbox view */
                    <div className="flex flex-col gap-4">
                      {/* Active email display and copy buttons */}
                      <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl p-2.5 relative group/email">
                        <span className="text-[11px] font-mono font-semibold text-neutral-800 dark:text-neutral-300 select-all pr-2 truncate max-w-[200px]" title={tempEmail}>
                          {tempEmail}
                        </span>
                        
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={handleCopyTempMail}
                            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-white/10 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                            title="Copy Email Address"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            onClick={handleGenerateTempMail}
                            disabled={isGenerating}
                            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-white/10 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors disabled:opacity-50"
                            title="Generate New Address"
                          >
                            <RefreshCw size={12} className={isGenerating ? "animate-spin" : ""} />
                          </button>
                          <button
                            onClick={handleClearTempMail}
                            className="p-1.5 hover:bg-rose-500/10 rounded-md text-rose-500 hover:bg-rose-500/20 transition-colors"
                            title="Deactivate Temp Mail"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Inbox list */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Inbox ({emails.length})</span>
                          {isCheckingInbox && (
                            <Loader2 size={10} className="animate-spin text-neutral-400" />
                          )}
                        </div>

                        <div className="max-h-52 overflow-y-auto temp-mail-scrollbar pr-0.5">
                          {emails.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-neutral-400 dark:text-neutral-500 text-center gap-2">
                              <Loader2 size={20} className="animate-spin text-indigo-500/60" />
                              <div className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Monitoring active...</div>
                              <div className="text-[9px] text-neutral-400 dark:text-neutral-550 max-w-[200px]">Waiting for incoming verification mails or OTPs</div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {emails.map((msg) => (
                                <div
                                  key={msg.id}
                                  onClick={() => handleViewMessage(msg.id)}
                                  className="p-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-white/5 rounded-xl hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 hover:border-indigo-200 dark:hover:border-indigo-500/20 transition-all cursor-pointer text-left flex flex-col gap-0.5"
                                >
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 truncate max-w-[170px]">{msg.from}</span>
                                    <span className="text-[8px] text-neutral-400 dark:text-neutral-500 font-mono flex-shrink-0">{msg.date.split(" ")[1] || msg.date}</span>
                                  </div>
                                  <span className="text-[10.5px] font-semibold text-neutral-800 dark:text-neutral-200 truncate">{msg.subject}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Initial generate call-to-action view */
                    <div className="flex flex-col items-center py-6 text-center gap-3">
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-full text-indigo-600 dark:text-indigo-400">
                        <Mail size={28} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Generate Disposable Inbox</span>
                        <span className="text-[10.5px] text-neutral-500 dark:text-neutral-400 max-w-[240px]">
                          Create a temporary email instantly. Ideal for verification steps without spamming your real inbox.
                        </span>
                      </div>
                      <button
                        onClick={handleGenerateTempMail}
                        disabled={isGenerating}
                        className="mt-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Creating Inbox...</span>
                          </>
                        ) : (
                          <>
                            <Mail size={13} />
                            <span>Create Temporary Email</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3-dot Dropdown Menu Section */}
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`p-2 transition-all duration-300 rounded-lg cursor-pointer flex items-center justify-center text-neutral-500 hover:text-neutral-850 dark:hover:text-neutral-200 border ${
                  showMenu
                    ? "bg-neutral-100 dark:bg-white/10 border-neutral-200 dark:border-white/10 text-neutral-800 dark:text-neutral-200"
                    : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-white/5 text-neutral-500"
                }`}
                title="Menu"
              >
                <MoreVertical size={14} />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#0c0c0c] border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl py-2 z-[999999] text-left cursor-default flex flex-col gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        onDownloadsClick?.();
                        setShowMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors text-left ${
                        activeView === 'downloads' ? "text-accent bg-accent/5" : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <Download size={14} />
                      <span>Downloads</span>
                    </button>

                    <button
                      onClick={() => {
                        onBookmarksClick?.();
                        setShowMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors text-left ${
                        activeView === 'bookmarks' ? "text-accent bg-accent/5" : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <Star size={14} />
                      <span>Bookmarks</span>
                    </button>

                    <button
                      onClick={() => {
                        onHistoryClick?.();
                        setShowMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors text-left ${
                        activeView === 'history' ? "text-accent bg-accent/5" : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <HistoryIcon size={14} />
                      <span>History</span>
                    </button>

                    <button
                      onClick={() => {
                        onExtensionsClick?.();
                        setShowMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors text-left ${
                        activeView === 'extensions' ? "text-accent bg-accent/5" : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <Puzzle size={14} />
                      <span>Extensions</span>
                    </button>

                    <button
                      onClick={() => {
                        onToggleSplitScreen?.();
                        setShowMenu(false);
                      }}
                      className={`w-full flex lg:hidden items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors text-left ${
                        isSplitScreen ? "text-accent bg-accent/5" : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <Columns size={14} className={isSplitScreen ? "text-accent" : ""} />
                      <span>Dual View</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowProxyPanel(!showProxyPanel);
                        setShowTempMailPanel(false);
                        setShowMenu(false);
                      }}
                      className={`w-full flex lg:hidden items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors text-left ${
                        proxyEnabled ? "text-emerald-500 bg-emerald-500/5" : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <Shield size={14} className={proxyEnabled ? "text-emerald-500" : ""} />
                      <span>VPN Proxy</span>
                    </button>

                    <button
                      onClick={() => {
                        if (!tempEmail) {
                          handleGenerateTempMail();
                        } else {
                          setShowTempMailPanel(!showTempMailPanel);
                        }
                        setShowProxyPanel(false);
                        setShowMenu(false);
                      }}
                      className={`w-full flex lg:hidden items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors text-left ${
                        tempEmail ? "text-indigo-500 bg-indigo-500/5" : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <Mail size={14} className={tempEmail ? "text-indigo-500" : ""} />
                      <span>Temp Mail</span>
                    </button>

                    <button
                      onClick={() => {
                        onToggleZenMode?.();
                        setShowMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors text-left ${
                        isZenMode ? "text-purple-500 bg-purple-500/5" : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <Timer size={14} className={isZenMode ? "text-purple-500 animate-pulse" : ""} />
                      <span>Zen Mode</span>
                    </button>

                    <div className="h-px bg-neutral-100 dark:bg-white/5 my-1 mx-2" />

                    <button
                      onClick={() => {
                        onSettingsClick?.();
                        setShowMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors text-left ${
                        activeView === 'settings' ? "text-accent bg-accent/5" : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <Settings size={14} />
                      <span>Settings</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
        <div data-tauri-drag-region={isMobile ? undefined : ""} className="w-4 h-full flex-shrink-0" />
      </div>

      <div className="flex items-center gap-1 w-1/4 min-w-max max-w-[25%] justify-end h-full hidden md:flex flex-shrink-0">
        <div data-tauri-drag-region={isMobile ? undefined : ""} className="flex-1 h-full" />
        <button
          onClick={handleMinimize}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-2 hover:bg-white/5 transition-colors rounded-md"
        >
          <Minus size={14} className="text-neutral-500" />
        </button>
        <button
          onClick={handleMaximize}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-2 hover:bg-white/5 transition-colors rounded-md"
        >
          {isMaximized ? <Copy size={14} className="text-neutral-500" /> : <Square size={14} className="text-neutral-500" />}
        </button>
        <button
          onClick={handleClose}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-2 hover:bg-red-500/10 hover:text-red-500 transition-colors rounded-md group"
        >
          <X size={14} className="text-neutral-500 group-hover:text-red-500" />
        </button>
      </div>
    </header>
  );
};