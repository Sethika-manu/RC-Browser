import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X, Minus, Square, Copy, Search, ArrowLeft, ArrowRight, RotateCw, Home, Star, Shield } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";

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

interface TitleBarProps {
  onNavigate?: (url: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  activeSessionId: string | null;
  sessions?: { id: string; title: string; url: string }[];
}

export const TitleBar = ({ onNavigate, searchValue, onSearchChange, activeSessionId, sessions }: TitleBarProps) => {
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
      onNavigate(queryOrUrl);
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
        onNavigate(query);
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
      className="bg-white dark:bg-[#0a0a0a] border-b border-neutral-200 dark:border-white/5 flex items-center justify-between px-4 select-none cursor-default active:cursor-grabbing h-12 w-full text-neutral-800 dark:text-neutral-100"
    >
      <div data-tauri-drag-region={isMobile ? undefined : ""} className="flex items-center gap-3 w-1/4 h-full pointer-events-none hidden md:flex">
          <div className="w-2.5 h-2.5 bg-accent rounded-full shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" />
          <span className="text-[10px] font-bold font-mono tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
            RC BROWSER <span className="text-neutral-300 dark:text-neutral-700 font-normal">{appVersion}</span>
          </span>
        </div>

      <div className="flex-1 w-full max-w-md mx-auto flex items-center gap-2 h-full">
        {activeSessionId && (
          <div className="flex items-center gap-1 mr-2">
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
        
        <form onSubmit={handleSearch} className="relative group flex-1">
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
          <div className="relative flex-shrink-0">
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
              .vpn-pulse-green {
                animation: vpnPulseGreen 2s infinite ease-in-out;
              }
              .vpn-pulse-red {
                animation: vpnPulseRed 1.5s infinite ease-in-out;
              }
            `}</style>
            <button
              onClick={() => setShowProxyPanel(!showProxyPanel)}
              onMouseDown={(e) => e.stopPropagation()}
              className={`p-2 transition-all duration-300 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 text-xs font-medium border ${
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
              <span>VPN</span>
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
        )}
        <div data-tauri-drag-region={isMobile ? undefined : ""} className="w-4 h-full" />
      </div>

      <div className="flex items-center gap-1 w-1/4 justify-end h-full hidden md:flex">
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