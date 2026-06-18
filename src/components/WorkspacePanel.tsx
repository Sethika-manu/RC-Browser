import React, { useState, useEffect } from 'react';
import { Layers, Trash2, X, Check, Save, AlertTriangle, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Session {
  id: string;
  title: string;
  url: string;
  isSleeping?: boolean;
  lastAccessed?: number;
  side?: 'left' | 'right';
}

interface Workspace {
  id: string;
  name: string;
  urls: string[];
}

interface WorkspacePanelProps {
  sessions: Session[];
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  setActiveSessionId: (id: string | null) => void;
  setIsSplitScreen: (split: boolean) => void;
  setRightActiveSessionId: (id: string | null) => void;
  setFocusedSide: (side: 'left' | 'right') => void;
  setSearchValue: (val: string) => void;
  setAppView: (view: any) => void;
  onClose: () => void;
}

export const WorkspacePanel = ({
  sessions,
  setSessions,
  setActiveSessionId,
  setIsSplitScreen,
  setRightActiveSessionId,
  setFocusedSide,
  setSearchValue,
  setAppView,
  onClose
}: WorkspacePanelProps) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [workspaceToRestore, setWorkspaceToRestore] = useState<Workspace | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Load workspaces on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rc_browser_workspaces');
      if (stored) {
        setWorkspaces(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load workspaces from localStorage:", e);
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Save current active tabs as a new workspace
  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newWorkspaceName.trim();
    if (!name) return;

    // Extract URLs from current sessions (skipping empty ones optionally, or saving them)
    // Filter out blank URLs or save all. Saving all tabs as they are is best.
    const urls = sessions.map(s => s.url);

    const newWorkspace: Workspace = {
      id: Math.random().toString(36).substring(7),
      name,
      urls
    };

    const updatedWorkspaces = [newWorkspace, ...workspaces];
    setWorkspaces(updatedWorkspaces);
    localStorage.setItem('rc_browser_workspaces', JSON.stringify(updatedWorkspaces));
    setNewWorkspaceName('');
    showToast(`Workspace "${name}" saved!`);
  };

  // Delete workspace
  const handleDeleteWorkspace = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    const updated = workspaces.filter(w => w.id !== id);
    setWorkspaces(updated);
    localStorage.setItem('rc_browser_workspaces', JSON.stringify(updated));
    showToast(`Deleted workspace "${name}".`);
  };

  // Restore workspace
  const handleRestoreWorkspace = () => {
    if (!workspaceToRestore) return;

    // Create new session objects
    const restoredSessions: Session[] = workspaceToRestore.urls.map(url => ({
      id: Math.random().toString(36).substring(7),
      title: (url === "" || url === "about:blank") ? "New Tab" : url,
      url: url,
      isSleeping: false,
      lastAccessed: Date.now()
    }));

    // Perform state resets
    setSessions(restoredSessions);
    setIsSplitScreen(false);
    setRightActiveSessionId(null);
    setFocusedSide('left');
    setSearchValue(restoredSessions.length > 0 ? restoredSessions[0].url : "");
    setActiveSessionId(restoredSessions.length > 0 ? restoredSessions[0].id : null);
    
    // Switch to browser view
    setAppView('browser');
    
    showToast(`Restored "${workspaceToRestore.name}"!`);
    setWorkspaceToRestore(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#0a0a0a] text-neutral-800 dark:text-neutral-100 select-none">
      
      {/* Panel Header */}
      <div className="p-4 flex items-center justify-between border-b border-neutral-200 dark:border-white/5 h-12 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-accent" />
          <span className="text-xs font-bold uppercase tracking-wider">Workspaces</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-150 dark:hover:bg-white/5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
          title="Close Workspaces"
        >
          <X size={14} />
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {/* Toast Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-14 left-4 right-4 z-50 bg-neutral-900 border border-neutral-800 text-neutral-100 text-[10px] font-semibold px-3 py-2 rounded-xl shadow-lg flex items-center gap-2"
            >
              <Check size={12} className="text-emerald-500" />
              <span>{toast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save Current Session Card */}
        <div className="bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <Save size={13} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Save Active Tabs</span>
          </div>
          
          <form onSubmit={handleSaveWorkspace} className="space-y-3">
            <input
              type="text"
              required
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="e.g. Research, Entertainment..."
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-accent/30 focus:ring-2 focus:ring-accent/10 transition-all"
            />
            <button
              type="submit"
              disabled={sessions.length === 0}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-accent/10 flex items-center justify-center gap-1.5"
            >
              <Layers size={13} />
              <span>Save Current Session ({sessions.length} tabs)</span>
            </button>
          </form>
        </div>

        {/* Saved Workspaces List */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
            Saved Workspaces ({workspaces.length})
          </span>

          {workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400 dark:text-neutral-600 bg-neutral-50/50 dark:bg-neutral-900/10 border border-neutral-100 dark:border-white/5 rounded-2xl text-center p-4">
              <Layers size={28} className="mb-2 opacity-40 text-accent animate-pulse" />
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-400 mb-0.5">No saved workspaces</span>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-550 max-w-[200px]">Save your current open tabs to restore them later with one click.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => setWorkspaceToRestore(ws)}
                  className="group relative p-3.5 bg-neutral-50 dark:bg-neutral-900/30 hover:bg-neutral-100/50 dark:hover:bg-white/[0.02] border border-neutral-200 dark:border-white/5 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="space-y-1 pr-6 min-w-0 flex-1">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate block group-hover:text-accent transition-colors">
                      {ws.name}
                    </span>
                    <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                      {ws.urls.length} tab{ws.urls.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setWorkspaceToRestore(ws)}
                      className="p-1.5 text-neutral-450 hover:text-accent hover:bg-accent/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Restore Workspace"
                    >
                      <Play size={13} fill="currentColor" className="ml-0.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteWorkspace(e, ws.id, ws.name)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Delete Workspace"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal Overlay */}
      <AnimatePresence>
        {workspaceToRestore && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWorkspaceToRestore(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="bg-white dark:bg-[#121212] rounded-3xl p-5 w-full max-w-[280px] shadow-2xl border border-neutral-200 dark:border-neutral-800 relative z-10 text-left pointer-events-auto flex flex-col gap-4"
            >
              <div className="flex items-center gap-3 text-amber-500">
                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 flex-shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Restore Workspace?</h3>
              </div>
              
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                This will close all your currently open tabs and restore the tabs from <strong className="text-neutral-700 dark:text-neutral-200 font-semibold">"{workspaceToRestore.name}"</strong>.
              </p>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setWorkspaceToRestore(null)}
                  className="flex-1 py-2 rounded-xl text-[10px] font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestoreWorkspace}
                  className="flex-1 py-2 rounded-xl text-[10px] font-bold text-white bg-accent hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20 cursor-pointer"
                >
                  Restore
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
