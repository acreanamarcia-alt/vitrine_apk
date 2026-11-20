import React from 'react';
import { Lock, ShoppingBag } from 'lucide-react';

export type TopView = 'vitrine' | 'admin';

interface HeaderProps {
  activeView: TopView;
  isAdminAuthenticated: boolean;
  onNavigateVitrine: (anchorId?: string) => void;
  onOpenAdmin: () => void;
  cartCount: number;
  onOpenCart: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  isAdminAuthenticated,
  onNavigateVitrine,
  onOpenAdmin,
  cartCount,
  onOpenCart,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text wordmark */}
        <button
          type="button"
          onClick={() => onNavigateVitrine()}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-display whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
        >
          VitrineApkAc
        </button>

        {/* Zone 2: Clean public navigation links */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <button
            type="button"
            onClick={() => onNavigateVitrine()}
            className={`relative py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded ${
              activeView === 'vitrine'
                ? 'text-blue-700 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Vitrine
            {activeView === 'vitrine' && (
              <span className="absolute inset-x-0 -bottom-[21px] h-0.5 bg-blue-700 dark:bg-blue-400" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigateVitrine('catalogo-apps')}
            className="py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
          >
            Aplicativos
          </button>

          <button
            type="button"
            onClick={() => onNavigateVitrine('modulos-vitrine')}
            className="py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
          >
            Personalização
          </button>

          <button
            type="button"
            onClick={onOpenAdmin}
            className={`relative inline-flex items-center gap-1.5 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded ${
              activeView === 'admin'
                ? 'text-blue-700 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isAdminAuthenticated ? 'Dashboard Admin' : 'Área do Admin'}</span>
            {activeView === 'admin' && (
              <span className="absolute inset-x-0 -bottom-[21px] h-0.5 bg-blue-700 dark:bg-blue-400" aria-hidden="true" />
            )}
          </button>
        </nav>

        {/* Zone 3: Primary action */}
        <div className="flex items-center shrink-0">
          {activeView === 'vitrine' ? (
            <button
              type="button"
              onClick={onOpenCart}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              <span>Carrinho ({cartCount})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateVitrine()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <span>Abrir Vitrine</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile navigation strip */}
      <div className="md:hidden border-t border-slate-100 dark:border-slate-800 px-4 py-2 flex items-center gap-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => onNavigateVitrine()}
          className={`text-xs font-medium whitespace-nowrap shrink-0 py-1 px-2 rounded ${
            activeView === 'vitrine'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          Vitrine
        </button>
        <button
          type="button"
          onClick={() => onNavigateVitrine('catalogo-apps')}
          className="text-xs font-medium whitespace-nowrap shrink-0 py-1 px-2 rounded text-slate-600 dark:text-slate-300"
        >
          Aplicativos
        </button>
        <button
          type="button"
          onClick={() => onNavigateVitrine('modulos-vitrine')}
          className="text-xs font-medium whitespace-nowrap shrink-0 py-1 px-2 rounded text-slate-600 dark:text-slate-300"
        >
          Personalização
        </button>
        <button
          type="button"
          onClick={onOpenAdmin}
          className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap shrink-0 py-1 px-2 rounded ${
            activeView === 'admin'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          <Lock className="w-3 h-3" aria-hidden="true" />
          <span>{isAdminAuthenticated ? 'Dashboard Admin' : 'Área do Admin'}</span>
        </button>
      </div>
    </header>
  );
};
