import { useState, useEffect } from "react";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { CommandPalette } from "./components/CommandPalette";
import { Viewport } from "./components/Viewport";
import { Home } from "./components/Home";
import { Settings } from "./components/Settings";
import { Console } from "./components/Console";
import { listen } from "@tauri-apps/api/event";

interface Session {
  id: string;
  title: string;
  url: string;
}

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [appView, setAppView] = useState<'browser' | 'settings' | 'console'>('browser');

  const activeSession = sessions.find(s => s.id === activeSessionId);

  useEffect(() => {
    const unlisten = listen("shortcut-event", (event: any) => {
      if (event.payload.key === "k") {
        setIsPaletteOpen(true);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (activeSession) {
      setSearchValue(activeSession.url === "about:blank" ? "" : activeSession.url);
    } else {
      setSearchValue("");
    }
  }, [activeSessionId, activeSession?.url]);

  const handleNavigate = (url: string) => {
    if (!activeSessionId) {
      handleCreateSession(url);
      setAppView('browser');
      return;
    }

    setSessions(prev => prev.map(s => 
      s.id === activeSessionId ? { ...s, url, title: url } : s
    ));
    setSearchValue(url);
  };

  const handleCreateSession = (url: string = "") => {
    const newSession: Session = {
      id: Math.random().toString(36).substring(7),
      title: url === "" ? "New Tab" : url,
      url: url
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    setAppView('browser');
  };

  const handleCloseSession = (id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
      }
      return filtered;
    });
  };

  const handleGoHome = () => {
    setActiveSessionId(null);
    setSearchValue("");
    setAppView('browser');
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      <div className="relative z-[100]">
        <TitleBar 
          onNavigate={handleNavigate} 
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          activeSessionId={activeSessionId}
        />
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="relative z-[100]">
          <Sidebar 
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSessionSelect={(id) => {
              setActiveSessionId(id);
              setAppView('browser');
            }}
            onSessionClose={handleCloseSession}
            onNewSession={() => handleCreateSession()}
            onHomeClick={handleGoHome}
            onSearchClick={() => setIsPaletteOpen(true)}
            onSettingsClick={() => setAppView('settings')}
            onConsoleClick={() => setAppView('console')}
            activeView={appView}
          />
        </div>
        
        <main className="flex-1 relative overflow-hidden bg-[#0a0a0a] z-0">
          
          {/* 1. Viewport: Native Webview container (Always mounted) */}
          <div className={`absolute inset-0 z-0 ${appView === 'browser' ? 'visible' : 'invisible pointer-events-none'}`}>
            <Viewport 
              sessions={sessions}
              activeSessionId={activeSessionId}
              isPaletteOpen={isPaletteOpen}
              appView={appView}
            />
          </div>

          {/* 2. OVERLAY LAYER: Strictly mutually exclusive rendering */}
          <div className="absolute inset-0 z-10">
            {(() => {
              if (appView === 'settings') {
                return (
                  <div className="absolute inset-0 z-20 bg-[#0a0a0a]">
                    <Settings />
                  </div>
                );
              }
              
              if (appView === 'console') {
                return (
                  <div className="absolute inset-0 z-20 bg-[#0a0a0a]">
                    <Console />
                  </div>
                );
              }

              if (appView === 'browser') {
                const isHomeVisible = !activeSessionId || (activeSession && activeSession.url === "");
                if (isHomeVisible) {
                  return (
                    <div className="absolute inset-0 z-20 bg-[#0a0a0a]">
                      <Home onNavigate={handleNavigate} />
                    </div>
                  );
                }
              }

              return null;
            })()}
          </div>
        </main>
      </div>

      <StatusBar />
      <CommandPalette 
        isOpen={isPaletteOpen} 
        onClose={() => setIsPaletteOpen(false)} 
        onNavigate={handleNavigate} 
      />
    </div>
  );
}
