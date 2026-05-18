import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSettings } from "./SettingsContext";

const QUOTES = [
  "Talk is cheap. Show me the code. — Linus Torvalds",
  "Programs must be written for people to read. — Harold Abelson",
  "The best way to predict the future is to invent it. — Alan Kay",
  "Coding is the closest thing we have to a superpower. — Drew Houston",
  "Software is a great combination between artistry and engineering. — Bill Gates",
  "First, solve the problem. Then, write the code. — John Johnson",
  "Simplicity is the soul of efficiency. — Austin Freeman",
  "Make it work, make it right, make it fast. — Kent Beck"
];

interface HomeProps {
  onNavigate: (url: string) => void;
}

export const Home = ({ onNavigate }: HomeProps) => {
  const [quote, setQuote] = useState("");
  const { t } = useSettings();

  useEffect(() => {
    const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setQuote(randomQuote);
  }, []);

  return (
    <motion.div 
      key="home"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="absolute inset-0 flex items-center justify-center p-8 z-20 bg-white dark:bg-[#050505] transition-colors duration-300"
    >
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{t('home_ready')}</h1>
          <p className="text-neutral-500 dark:text-neutral-500 text-sm leading-relaxed italic min-h-[40px]">
            {quote || "..."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4">
          <div 
            onClick={() => onNavigate("https://wikipedia.org")}
            className="p-4 rounded-xl bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-border text-left hover:border-accent/30 dark:hover:border-accent/30 transition-colors cursor-pointer group shadow-sm dark:shadow-none"
          >
            <div className="text-[10px] font-bold text-accent mb-1 uppercase tracking-widest">{t('home_docs')}</div>
            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">shashinda</div>
          </div>
          <div 
            onClick={() => onNavigate("https://youtube.com")}
            className="p-4 rounded-xl bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-border text-left hover:border-accent/30 dark:hover:border-accent/30 transition-colors cursor-pointer group shadow-sm dark:shadow-none"
          >
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 mb-1 uppercase tracking-widest">{t('home_media')}</div>
            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">YouTube</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
