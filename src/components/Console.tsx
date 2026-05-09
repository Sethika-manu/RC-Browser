import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Filter, ChevronDown } from 'lucide-react';

interface Log {
  type: 'INFO' | 'WARN' | 'ERR' | 'CONSOLE';
  message: string;
  timestamp: string;
}

const INITIAL_LOGS: Log[] = [
  { type: 'INFO', message: 'System initialization complete. Version 0.1.0', timestamp: '02:30:45' },
  { type: 'INFO', message: 'Connecting to Tauri backend...', timestamp: '02:30:46' },
  { type: 'INFO', message: 'Secure tunnel established at 127.0.0.1:4432', timestamp: '02:30:46' },
  { type: 'WARN', message: 'Deprecated API usage detected: useGlobalShortcuts() is now listener-based.', timestamp: '02:30:47' },
  { type: 'ERR', message: 'Failed to load external resource: connection_timeout at https://api.dev-browser.com/v1/sync', timestamp: '02:30:48' },
  { type: 'CONSOLE', message: 'Browser instance [id: 7a9b2] spawned successfully.', timestamp: '02:30:50' },
  { type: 'INFO', message: 'Tracking protection initialized. Blocked 14 trackers.', timestamp: '02:30:52' },
  { type: 'WARN', message: 'Memory pressure detected. Optimizing webview heap...', timestamp: '02:30:55' },
  { type: 'ERR', message: 'Socket closed unexpectedly (code 1006). Reconnecting in 5s...', timestamp: '02:30:58' },
  { type: 'INFO', message: 'Reconnected to dev-sync service.', timestamp: '02:31:04' },
];

export const Console = () => {
  const [logs, setLogs] = useState<Log[]>(INITIAL_LOGS);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

    // Safe focus
    const timer = setTimeout(() => {
      if (isMounted.current && inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleClear = () => {
    if (isMounted.current) setLogs([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const newLog: Log = {
        type: 'CONSOLE',
        message: inputValue,
        timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      if (isMounted.current) {
        setLogs(prev => [...prev, newLog]);
        setInputValue('');
      }
    }
  };

  const getLogColor = (type: Log['type']) => {
    switch (type) {
      case 'INFO': return 'text-emerald-400';
      case 'WARN': return 'text-amber-400';
      case 'ERR': return 'text-rose-400';
      default: return 'text-neutral-100';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-neutral-300 font-mono overflow-hidden select-none animate-in fade-in duration-300">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-neutral-900/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-blue-400" />
          <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">CONSOLE v0.1.0</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-neutral-400 hover:text-white hover:bg-white/5 rounded transition-colors"
          >
            <Trash2 size={12} />
            Clear
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-neutral-400 hover:text-white hover:bg-white/5 rounded transition-colors">
            <Filter size={12} />
            Filter
            <ChevronDown size={10} />
          </button>
        </div>
      </div>

      {/* Log Display Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar relative"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9)), url('https://www.transparenttextures.com/patterns/carbon-fibre.png')`,
          backgroundAttachment: 'fixed'
        }}
      >
        {logs.map((log, i) => (
          <div 
            key={`${log.timestamp}-${i}`}
            className="flex gap-3 text-[12px] leading-relaxed group"
          >
            <span className="text-neutral-600 shrink-0 select-none w-14">{log.timestamp}</span>
            <span className={`font-bold shrink-0 select-none w-16 ${getLogColor(log.type)}`}>
              [{log.type}]
            </span>
            <span className="break-all group-hover:text-white transition-colors select-text">{log.message}</span>
          </div>
        ))}
      </div>

      {/* Command Input Line */}
      <div className="p-4 border-t border-white/5 bg-[#050505] relative group focus-within:bg-blue-500/[0.02] transition-colors">
        <div className="flex items-center gap-3 relative z-10">
          <span className="text-blue-400 font-bold select-none">{'>'}</span>
          <div className="flex-1 relative flex items-center">
            <input 
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type commands or JavaScript here..."
              className="w-full bg-transparent border-none outline-none text-[13px] text-neutral-100 placeholder:text-neutral-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
