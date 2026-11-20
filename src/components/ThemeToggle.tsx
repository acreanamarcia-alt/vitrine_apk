import React from 'react';
import { Moon, Sun } from 'lucide-react';

export type ThemeMode = 'light' | 'dark';

interface ThemeToggleProps {
  theme: ThemeMode;
  onChangeTheme: (next: ThemeMode) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onChangeTheme }) => {
  return (
    <div
      role="group"
      aria-label="Seletor de tema"
      className="inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shrink-0"
    >
      <button
        type="button"
        onClick={() => onChangeTheme('light')}
        aria-pressed={theme === 'light'}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          theme === 'light'
            ? 'bg-white text-slate-900 shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        <Sun className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Claro</span>
      </button>
      <button
        type="button"
        onClick={() => onChangeTheme('dark')}
        aria-pressed={theme === 'dark'}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          theme === 'dark'
            ? 'bg-slate-900 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        <Moon className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Escuro</span>
      </button>
    </div>
  );
};
