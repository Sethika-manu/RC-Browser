import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSettings } from "./SettingsContext";
import { 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Search,
  X
} from "lucide-react";
import { cn } from "../lib/utils";

const appWindow = getCurrentWindow();

interface Session {
  id: string;
  title: string;
  url: string;
  isSleeping?: boolean;
  lastAccessed?: number;
  side?: 'left' | 'right';
}

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onSessionClose: (id: string) => void;
  onNewSession: () => void;
  onHomeClick: () => void;
  onSearchClick: () => void;
  isSplitScreen?: boolean;
}

export const Sidebar = ({ 
  sessions, 
  activeSessionId, 
  onSessionSelect, 
  onSessionClose, 
  onNewSession,
  onHomeClick,
  onSearchClick,
  isSplitScreen = false
}: SidebarProps) => {
  const { t, autoHideSidebar } = useSettings();
  
  // Manual toggle state
  const [isManualCollapsed, setIsManualCollapsed] = useState(false);
  // Hover state for auto-hide
  const [isHovered, setIsHovered] = useState(false);

  // Determine actual collapsed state based on settings and hover
  const isCollapsed = autoHideSidebar ? !isHovered : isManualCollapsed;

  const handleMouseDownDrag = (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (!target.closest('button')) {
        appWindow.startDragging();
      }
    }
  };

  const toggleCollapse = () => {
    setIsManualCollapsed(!isManualCollapsed);
  };

  return (
    <div
      style={{ width: isCollapsed ? 64 : 240 }}
      className="h-full bg-white dark:bg-[#0a0a0a] border-r border-neutral-200 dark:border-white/5 flex flex-col relative z-20 flex-shrink-0 transition-[width] duration-300 ease-in-out"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        data-tauri-drag-region
        onMouseDown={handleMouseDownDrag}
        className="p-4 flex items-center justify-between cursor-default h-12"
      >
        {!isCollapsed && (
          <span 
            className="text-[10px] font-bold text-neutral-400 dark:text-neutral-600 tracking-[0.2em] cursor-pointer hover:text-neutral-900 dark:hover:text-white transition-colors relative z-50 whitespace-nowrap"
            onClick={onHomeClick}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {t('nav_home')}
          </span>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1.5 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-md transition-colors text-neutral-400 dark:text-neutral-500"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <div className="flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <button 
          onClick={onNewSession}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-all mb-4 group border border-accent/20 shadow-sm shadow-accent/5 overflow-hidden whitespace-nowrap"
        >
          <div className="flex-shrink-0"><Plus size={18} /></div>
          {!isCollapsed && <span className="text-sm font-semibold">{t('nav_new_session')}</span>}
        </button>

        <div className="space-y-0.5">
          {sessions.map((session) => (
            <div key={session.id} className="relative group overflow-hidden">
              <button
                onClick={() => onSessionSelect(session.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left whitespace-nowrap",
                  activeSessionId === session.id 
                    ? "bg-neutral-100 dark:bg-white/5 text-neutral-900 dark:text-white shadow-sm" 
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/[0.02]"
                )}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300",
                  activeSessionId === session.id 
                    ? "bg-accent animate-pulse" 
                    : session.isSleeping 
                      ? "bg-blue-400/40 dark:bg-blue-500/20 border border-blue-400/30" 
                      : "bg-neutral-300 dark:bg-neutral-800"
                )} />
                {!isCollapsed && (
                  <span className={cn(
                    "text-xs font-medium truncate flex-1 transition-all duration-300",
                    session.isSleeping 
                      ? "text-neutral-400/50 dark:text-neutral-600/50" 
                      : activeSessionId === session.id 
                        ? "text-neutral-950 dark:text-white" 
                        : "text-neutral-500 dark:text-neutral-400"
                  )}>
                    {session.title === "about:blank" || session.title === "" 
                      ? "New Tab" 
                      : (session.title.startsWith("http://") || session.title.startsWith("https://")) 
                        ? session.title.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
                        : session.title}
                    {session.isSleeping && (
                      <span className="text-[10px] opacity-60 ml-1.5 font-normal tracking-wide">
                        (sleeping)
                      </span>
                    )}
                    {isSplitScreen && (
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-md ml-1.5 inline-block transition-colors",
                        session.side === 'right'
                          ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                      )}>
                        {session.side === 'right' ? 'R' : 'L'}
                      </span>
                    )}
                  </span>
                )}
              </button>
              
              {!isCollapsed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSessionClose(session.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 dark:text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-[#0a0a0a] rounded-md shadow-sm border border-neutral-100 dark:border-white/10"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 mt-auto border-t border-neutral-100 dark:border-white/5 overflow-hidden">
        <button 
          onClick={onSearchClick}
          className="w-full flex items-center gap-3 p-2 text-neutral-400 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-400 transition-colors whitespace-nowrap"
        >
          <div className="flex-shrink-0"><Search size={16} /></div>
          {!isCollapsed && <span className="text-xs font-medium">Cmd + K</span>}
        </button>
      </div>
    </div>
  );
};