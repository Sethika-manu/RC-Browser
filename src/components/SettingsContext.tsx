import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

type Theme = 'System' | 'Dark' | 'Light';
type Language = 'English (US)' | 'Sinhala (LK)' | 'Singlish';

interface SettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDarkMode: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  privacyShield: boolean;
  setPrivacyShield: (enabled: boolean) => void;
  autoHideSidebar: boolean;
  setAutoHideSidebar: (enabled: boolean) => void;
  enableVoiceAssist: boolean;
  setEnableVoiceAssist: (enabled: boolean) => void;
  playVoiceAssist: (url: string) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  'English (US)': {
    'nav_new_session': 'New Session',
    'nav_console': 'Console',
    'nav_settings': 'Settings',
    'nav_history': 'History',
    'nav_home': 'HOME',
    'home_ready': 'Ready for Exploration',
    'home_docs': 'Documentation',
    'home_media': 'Multimedia',
    'settings_title': 'Settings',
    'settings_desc': 'Configure your browsing experience',
    'settings_appearance': 'Appearance',
    'settings_appearance_desc': 'Customize themes and visual style',
    'settings_engine': 'Rendering Engine',
    'settings_engine_desc': 'Underlying technology for this browser',
    'settings_language': 'Language',
    'settings_language_desc': 'Preferred language for interface',
    'settings_privacy': 'Privacy Shield',
    'settings_privacy_desc': 'Block trackers and intrusive ads',
    'settings_clear': 'Clear Data',
    'settings_clear_desc': 'Clear browsing history and cache',
    'settings_shortcuts': 'Shortcuts',
    'settings_shortcuts_desc': 'Configure keyboard shortcuts',
    'settings_sidebar': 'Sidebar',
    'settings_sidebar_desc': 'Auto-hide sidebar when not in use',
  },
  'Sinhala (LK)': {
    'nav_new_session': 'නව සැසිය',
    'nav_console': 'පර්යන්තය',
    'nav_settings': 'සැකසුම්',
    'nav_history': 'ඉතිහාසය',
    'nav_home': 'මුල් පිටුව',
    'home_ready': 'ගවේෂණයට සූදානම්',
    'home_docs': 'ලේඛන',
    'home_media': 'බහුමාධ්‍ය',
    'settings_title': 'සැකසුම්',
    'settings_desc': 'ඔබේ අත්දැකීම සකස් කරන්න',
    'settings_appearance': 'පෙනුම',
    'settings_appearance_desc': 'තේමාවන් සහ දෘශ්‍ය විලාසය',
    'settings_engine': 'විදැහුම් එන්ජිම',
    'settings_engine_desc': 'බ්‍රවුසරයේ තාක්ෂණය',
    'settings_language': 'භාෂාව',
    'settings_language_desc': 'මුහුණත සඳහා කැමති භාෂාව',
    'settings_privacy': 'පුද්ගලිකත්ව පලිහ',
    'settings_privacy_desc': 'අනවශ්‍ය දැන්වීම් අවහිර කරන්න',
    'settings_clear': 'දත්ත මකන්න',
    'settings_clear_desc': 'ඉතිහාසය සහ මතකය මකන්න',
    'settings_shortcuts': 'කෙටිමං',
    'settings_shortcuts_desc': 'යතුරුපුවරු කෙටිමං සකසන්න',
    'settings_sidebar': 'පැති තීරුව',
    'settings_sidebar_desc': 'පැති තීරුව ස්වයංක්‍රීයව සඟවන්න',
  },
  'Singlish': {
    'nav_new_session': 'Aluth Session ekak',
    'nav_console': 'Console eka',
    'nav_settings': 'Settings kalla',
    'nav_history': 'History eka',
    'nav_home': 'Home eka',
    'home_ready': 'Wadeeta Ready',
    'home_docs': 'Poth Path',
    'home_media': 'Videos n Stuff',
    'settings_title': 'Settings kalla',
    'settings_desc': 'Oyata oni widiyata hada ganna',
    'settings_appearance': 'Appearance eka',
    'settings_appearance_desc': 'Themes hadaganna',
    'settings_engine': 'Rendering Engine eka',
    'settings_engine_desc': 'Yata thiyena kalla',
    'settings_language': 'Language eka',
    'settings_language_desc': 'Katha karana bhashawa',
    'settings_privacy': 'Privacy Shield kalla',
    'settings_privacy_desc': 'Ads block karanna',
    'settings_clear': 'Data makanna',
    'settings_clear_desc': 'Okoma ain karala danna',
    'settings_shortcuts': 'Shortcuts tika',
    'settings_shortcuts_desc': 'Keys hadaganna',
    'settings_sidebar': 'Sidebar eka',
    'settings_sidebar_desc': 'Sidebar eka hanganna',
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => 
    (localStorage.getItem('app-theme') as Theme) || 'System'
  );
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const themeVal = (localStorage.getItem('app-theme') as Theme) || 'System';
    return themeVal === 'System'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : themeVal === 'Dark';
  });
  const [language, setLanguage] = useState<Language>(() => 
    (localStorage.getItem('app-language') as Language) || 'English (US)'
  );
  const [privacyShield, setPrivacyShield] = useState<boolean>(() => 
    localStorage.getItem('app-privacy-shield') !== 'false'
  );
  // NEW: Auto Hide Sidebar State
  const [autoHideSidebar, setAutoHideSidebar] = useState<boolean>(() => 
    localStorage.getItem('app-auto-hide-sidebar') === 'true'
  );

  const [appWindow] = useState(() => {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        return getCurrentWindow();
      } catch (err) {
        console.warn("Tauri window API not available:", err);
      }
    }
    return null;
  });

  useEffect(() => {
    let active = true;
    let unlistenFn: (() => void) | null = null;

    const applyTheme = async (preference: string) => {
      const pref = preference.toLowerCase();
      let resolvedTheme = 'light';

      if (pref === 'system') {
        let detectedTheme = null;
        if (appWindow) {
          try {
            detectedTheme = await appWindow.theme();
          } catch (err) {
            console.warn("Failed to get native window theme:", err);
          }
        }
        if (detectedTheme) {
          resolvedTheme = detectedTheme;
        } else {
          resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
      } else {
        resolvedTheme = pref;
      }

      if (!active) return;

      const isDark = resolvedTheme === 'dark';
      setIsDarkMode(isDark);

      const root = document.documentElement;
      const body = document.body;

      root.classList.toggle('dark', isDark);
      if (body) {
        body.classList.toggle('dark', isDark);
        body.style.colorScheme = resolvedTheme;
        body.setAttribute('data-theme', resolvedTheme);
      }
      root.style.colorScheme = resolvedTheme;
      root.setAttribute('data-theme', resolvedTheme);

      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        invoke('set_window_theme', { theme: resolvedTheme })
          .catch((err) => console.warn("Failed to set window theme via IPC:", err));
        
        if (appWindow) {
          try {
            appWindow.setTheme(resolvedTheme as any)
              .catch((err) => console.warn("Failed to set native window theme:", err));
          } catch (err) {
            console.warn("Failed to set native theme:", err);
          }
        }
      }
    };

    const setupListeners = async () => {
      if (appWindow) {
        try {
          const unlisten = await appWindow.onThemeChanged(({ payload }) => {
            if (theme.toLowerCase() === 'system') {
              applyTheme(payload);
            }
          });
          if (active) {
            unlistenFn = unlisten;
          } else {
            unlisten();
          }
          return;
        } catch (err) {
          console.warn("Failed to register native theme change listener:", err);
        }
      }

      // Fallback for non-desktop environments (Mobile/Web)
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (theme.toLowerCase() === 'system') {
          applyTheme('system');
        }
      };
      mediaQuery.addEventListener('change', handleChange);
      unlistenFn = () => mediaQuery.removeEventListener('change', handleChange);
    };

    applyTheme(theme);
    localStorage.setItem('app-theme', theme);
    setupListeners();

    return () => {
      active = false;
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('app-language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('app-privacy-shield', String(privacyShield));
    
    // Pass to Android native layer if available
    const win = window as any;
    if (win.NativeBridge || win.AndroidBridge) {
      try {
        (win.NativeBridge || win.AndroidBridge).setPrivacyShield(privacyShield);
      } catch (err) {
        console.warn("Failed to set Android privacy shield:", err);
      }
    }
    
    // Pass to PC (Tauri/Rust) native layer
    invoke('set_privacy_shield', { enabled: privacyShield })
      .catch((err) => console.warn("Failed to set PC privacy shield:", err));
  }, [privacyShield]);

  // Save autoHideSidebar to localStorage
  useEffect(() => {
    localStorage.setItem('app-auto-hide-sidebar', String(autoHideSidebar));
  }, [autoHideSidebar]);

  // NEW: Voice Assist settings state
  const [enableVoiceAssist, setEnableVoiceAssist] = useState<boolean>(() => 
    localStorage.getItem('app-enable-voice-assist') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('app-enable-voice-assist', String(enableVoiceAssist));
  }, [enableVoiceAssist]);

  // Voice Assist playback utility
  const playVoiceAssist = (url: string) => {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobileDevice) return;
    if (!enableVoiceAssist) return;
    try {
      const audio = new Audio(url);
      audio.play().catch((err) => {
        console.warn("Failed to play audio:", err);
      });
    } catch (err) {
      console.warn("Failed to instantiate audio:", err);
    }
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <SettingsContext.Provider value={{ 
      theme, setTheme, 
      isDarkMode,
      language, setLanguage, 
      privacyShield, setPrivacyShield,
      autoHideSidebar, setAutoHideSidebar,
      enableVoiceAssist, setEnableVoiceAssist,
      playVoiceAssist,
      t 
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};