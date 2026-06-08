import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Shield, 
  Cpu, 
  Palette, 
  Globe, 
  Keyboard, 
  Info,
  ChevronRight,
  Settings as SettingsIcon,
  Check,
  RefreshCw,
  Volume2
} from "lucide-react";
import { motion } from "framer-motion";
import { useSettings } from "./SettingsContext";
import { getVersion } from "@tauri-apps/api/app";

declare const __BUILD_DATE__: string;

type Language = 'English (US)' | 'Sinhala (LK)' | 'Singlish';

const TRANSLATIONS: Record<Language, any> = {
  'English (US)': {
    title: 'Settings',
    desc: 'Configure your browsing experience',
    appearance: 'Appearance',
    appearance_desc: 'Customize themes and visual style',
    engine: 'Rendering Engine',
    engine_desc: 'Underlying technology for this browser',
    language: 'Language',
    language_desc: 'Preferred language for interface',
    privacy: 'Privacy Shield',
    privacy_desc: 'Block trackers and intrusive ads',
    clear: 'Clear Data',
    clear_desc: 'Clear browsing history and cache',
    clear_suggestions: 'Clear Search Suggestions',
    clear_suggestions_desc: 'Clear autocomplete search suggestions from the search bar',
    shortcuts: 'Shortcuts',
    shortcuts_desc: 'Configure keyboard shortcuts',
    sidebar: 'Sidebar',
    sidebar_desc: 'Auto-hide sidebar when not in use',
    auto_update: 'Enable Auto-Updates',
    auto_update_desc: 'Automatically download and install new updates in the background.',
    accessibility: 'Accessibility',
    voice_assist: 'Enable Voice Assistant',
    voice_assist_desc: 'Enable sound effects for specific UI actions',
    clear_cache: 'Clear Cache',
    clear_cache_desc: 'Clear cached assets and temporary web files',
  },
  'Sinhala (LK)': {
    title: 'සැකසුම්',
    desc: 'ඔබේ අත්දැකීම සකස් කරන්න',
    appearance: 'පෙනුම',
    appearance_desc: 'තේමාවන් සහ දෘශ්‍ය විලාසය',
    engine: 'විදැහුම් එන්ජිම',
    engine_desc: 'බ්‍රවුසරයේ තාක්ෂණය',
    language: 'භාෂාව',
    language_desc: 'මුහුණත සඳහා කැමති භාෂාව',
    privacy: 'පුද්ගලිකත්ව පලිහ',
    privacy_desc: 'අනවශ්‍ය දැන්වීම් අවහිර කරන්න',
    clear: 'දත්ත මකන්න',
    clear_desc: 'ඉතිහාසය සහ මතකය මකන්න',
    clear_suggestions: 'සෙවුම් යෝජනා මකන්න',
    clear_suggestions_desc: 'සෙවුම් තීරුවේ ඇති ස්වයංක්‍රීය යෝජනා මකන්න',
    shortcuts: 'කෙටිමං',
    shortcuts_desc: 'යතුරුපුවරු කෙටිමං සකසන්න',
    sidebar: 'පැති තීරුව',
    sidebar_desc: 'පැති තීරුව ස්වයංක්‍රීයව සඟවන්න',
    auto_update: 'ස්වයංක්‍රීය යාවත්කාලීන සක්‍රීය කරන්න',
    auto_update_desc: 'පසුබිමින් නව යාවත්කාලීන ස්වයංක්‍රීයව බාගත කර ස්ථාපනය කරන්න.',
    accessibility: 'ප්‍රවේශ්‍යතාව',
    voice_assist: 'හඬ සහායක සක්‍රීය කරන්න',
    voice_assist_desc: 'නිශ්චිත ක්‍රියා සඳහා ශබ්ද ප්‍රයෝග සක්‍රීය කරන්න',
    clear_cache: 'මතකය මකන්න (Clear Cache)',
    clear_cache_desc: 'තාවකාලික ගොනු සහ වෙබ් මතකය මකන්න',
  },
  'Singlish': {
    title: 'Settings kalla',
    desc: 'Oyata oni widiyata hada ganna',
    appearance: 'Appearance eka',
    appearance_desc: 'Themes hadaganna',
    engine: 'Rendering Engine eka',
    engine_desc: 'Yata thiyena kalla',
    language: 'Language eka',
    language_desc: 'Katha karana bhashawa',
    privacy: 'Privacy Shield kalla',
    privacy_desc: 'Ads block karanna',
    clear: 'Data makanna',
    clear_desc: 'Okoma ain karala danna',
    clear_suggestions: 'Search Suggestions makanna',
    clear_suggestions_desc: 'Search bar eke suggestions okkoma ain karanna',
    shortcuts: 'Shortcuts tika',
    shortcuts_desc: 'Keys hadaganna',
    sidebar: 'Sidebar eka',
    sidebar_desc: 'Sidebar eka hanganna',
    auto_update: 'Auto-Updates on කරන්න',
    auto_update_desc: 'පසුබිමෙන් auto ම download කරලා update install කරන්න.',
    accessibility: 'Accessibility',
    voice_assist: 'Voice Assistant on කරන්න',
    voice_assist_desc: 'UI actions walata sound effects on කරන්න',
    clear_cache: 'Cache memory eka makanna',
    clear_cache_desc: 'Cached files okoma ain karala danna',
  }
};

interface SettingItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  value?: any;
  onClick?: () => void;
  readOnly?: boolean;
  toggle?: boolean;
  checked?: boolean;
  action?: boolean;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

export const Settings = () => {
  const { 
    theme, setTheme, 
    language, setLanguage, 
    privacyShield, setPrivacyShield,
    autoHideSidebar, setAutoHideSidebar,
    enableVoiceAssist, setEnableVoiceAssist,
    playVoiceAssist
  } = useSettings();

  const [appVersion, setAppVersion] = useState("0.1.0");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    getVersion().then(setAppVersion).catch((err) => {
      console.error("Failed to get app version:", err);
    });
    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
  }, []);

  const t = TRANSLATIONS[language];

  const cycleTheme = () => {
    const themes = ['System', 'Dark', 'Light'] as const;
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const cycleLanguage = () => {
    const langs = ['English (US)', 'Sinhala (LK)', 'Singlish'] as const;
    const nextIndex = (langs.indexOf(language) + 1) % langs.length;
    setLanguage(langs[nextIndex]);
  };

  const [restoreTabs, setRestoreTabs] = useState(() => {
    return localStorage.getItem('rc_restore_tabs') === 'true';
  });

  const toggleRestoreTabs = () => {
    const newVal = !restoreTabs;
    setRestoreTabs(newVal);
    localStorage.setItem('rc_restore_tabs', String(newVal));
  };

  const [autoUpdate, setAutoUpdate] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('rcbrowser_autoupdate');
    if (stored !== null) {
      setAutoUpdate(stored === 'true');
    }
  }, []);

  const handleAutoUpdateChange = () => {
    const newVal = !autoUpdate;
    setAutoUpdate(newVal);
    localStorage.setItem('rcbrowser_autoupdate', String(newVal));
  };

  const handleClearBrowsingData = async () => {
    const confirmClear = window.confirm("Are you sure you want to clear all browsing data? This will delete your browsing history, top sites, and search suggestions.");
    if (confirmClear) {
      try {
        const { clearAllHistory } = await import("../lib/historyDb");
        await clearAllHistory();
        localStorage.removeItem('siteHistory');
        localStorage.removeItem('app_browser_history');
        window.dispatchEvent(new Event('browsing-data-cleared'));
        playVoiceAssist('/sounds/data-delete.mp3');
        alert("Browsing data cleared successfully!");
      } catch (err) {
        console.error("Failed to clear browsing data:", err);
      }
    }
  };

  const handleClearCache = async () => {
    const confirmClear = window.confirm("Are you sure you want to clear the browser cache?");
    if (confirmClear) {
      try {
        if ('caches' in window) {
          const keys = await window.caches.keys();
          await Promise.all(keys.map(key => window.caches.delete(key)));
        }
        playVoiceAssist('/sounds/cache-clear.mp3');
        alert("Cache cleared successfully!");
      } catch (err) {
        console.error("Failed to clear cache:", err);
      }
    }
  };

  const handleClearSearchSuggestions = async () => {
    const confirmClear = window.confirm("Are you sure you want to clear your search suggestions? This will delete all recent queries shown under the search bar.");
    if (confirmClear) {
      try {
        const { clearSearchSuggestionsOnly } = await import("../lib/historyDb");
        await clearSearchSuggestionsOnly();
        playVoiceAssist('/sounds/history-clear.mp3');
        alert("Search suggestions cleared successfully!");
      } catch (err) {
        console.error("Failed to clear search suggestions:", err);
      }
    }
  };

  const sections: SettingSection[] = [
    {
      title: "General",
      items: [
        { 
          icon: <Monitor size={18} />, 
          label: t.appearance, 
          description: t.appearance_desc, 
          value: theme,
          onClick: cycleTheme
        },
        { 
          icon: <Cpu size={18} />, 
          label: t.engine, 
          description: t.engine_desc, 
          value: "Tauri WebView",
          readOnly: true
        },
        { 
          icon: <Globe size={18} />, 
          label: t.language, 
          description: t.language_desc, 
          value: language,
          onClick: cycleLanguage
        },
        {
          icon: <Info size={18} />,
          label: "Restore previous tabs",
          description: "Re-open tabs from your last session",
          toggle: true,
          checked: restoreTabs,
          onClick: toggleRestoreTabs
        },
        {
          icon: <RefreshCw size={18} />,
          label: t.auto_update,
          description: t.auto_update_desc,
          toggle: true,
          checked: autoUpdate,
          onClick: handleAutoUpdateChange
        }
      ]
    },
    {
      title: "Privacy & Security",
      items: [
        { 
          icon: <Shield size={18} />, 
          label: t.privacy, 
          description: t.privacy_desc, 
          toggle: true, 
          checked: privacyShield,
          onClick: () => setPrivacyShield(!privacyShield)
        },
        { 
          icon: <Check size={18} />, 
          label: t.clear, 
          description: t.clear_desc, 
          action: true,
          onClick: handleClearBrowsingData
        },
        { 
          icon: <Check size={18} />, 
          label: t.clear_cache, 
          description: t.clear_cache_desc, 
          action: true,
          onClick: handleClearCache
        },
        { 
          icon: <Check size={18} />, 
          label: t.clear_suggestions, 
          description: t.clear_suggestions_desc, 
          action: true,
          onClick: handleClearSearchSuggestions
        }
      ]
    },
    {
      title: t.accessibility,
      items: [
        {
          icon: <Volume2 size={18} />,
          label: t.voice_assist,
          description: t.voice_assist_desc,
          toggle: true,
          checked: enableVoiceAssist,
          onClick: () => setEnableVoiceAssist(!enableVoiceAssist)
        }
      ]
    },
    {
      title: "Productivity",
      items: [
        { 
          icon: <Keyboard size={18} />, 
          label: t.shortcuts, 
          description: t.shortcuts_desc 
        },
        { 
          icon: <Palette size={18} />, 
          label: t.sidebar, 
          description: t.sidebar_desc, 
          toggle: true, 
          checked: autoHideSidebar, // Connected
          onClick: () => setAutoHideSidebar(!autoHideSidebar) // Toggle action
        }
      ]
    }
  ];

  return (
    <div className="h-full bg-white dark:bg-[#050505] overflow-y-auto custom-scrollbar transition-colors duration-300">
      <div className="max-w-3xl mx-auto py-12 px-8">
        <div className="flex items-center gap-3 mb-12">
          <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/20">
            <SettingsIcon size={24} className="text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{t.title}</h1>
            <p className="text-neutral-500 text-sm">{t.desc}</p>
          </div>
        </div>

        <div className="space-y-12">
          {sections.map((section, idx) => (
            <motion.div 
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`space-y-4 ${section.title === 'Productivity' ? 'settings-productivity-section' : ''}`}
            >
              <h2 className="text-xs font-bold text-neutral-500 dark:text-neutral-600 uppercase tracking-widest px-1">
                {section.title}
              </h2>
              <div className="bg-white dark:bg-neutral-900/30 border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-none">
                {(() => {
                  const visibleItems = section.items.filter(item => !(item.label === t.auto_update && isMobile));
                  return visibleItems.map((item, i) => (
                    <div 
                      key={item.label}
                      onClick={item.readOnly ? undefined : item.onClick}
                      className={`flex items-center justify-between p-4 transition-colors ${
                        item.readOnly ? 'cursor-default opacity-80' : 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/[0.02]'
                      } ${
                        i !== visibleItems.length - 1 ? 'border-b border-neutral-100 dark:border-white/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-neutral-500 dark:text-neutral-400 p-2 bg-neutral-100 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-white/5">
                          {item.icon}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{item.label}</div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-500">{item.description}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {item.value && (
                          <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono bg-neutral-100 dark:bg-neutral-900 px-2 py-1 rounded border border-neutral-200 dark:border-white/5">
                            {item.value}
                          </span>
                        )}
                        {item.toggle ? (
                          <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${item.checked ? 'bg-accent' : 'bg-neutral-300 dark:bg-neutral-800'}`}>
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${item.checked ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                        ) : !item.readOnly && (
                          <ChevronRight size={16} className="text-neutral-400 dark:text-neutral-700" />
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-neutral-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-600">
            <Info size={14} />
            <span className="text-[10px] font-medium uppercase tracking-wider">RC BROWSER v{appVersion}</span>
          </div>
          <div className="text-[10px] text-neutral-400 dark:text-neutral-700">
            Build {__BUILD_DATE__}
          </div>
        </div>
      </div>
    </div>
  );
};