import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface LgpdBannerProps {
  visible: boolean;
  onAcceptAll: () => void;
  onEssentialOnly: () => void;
  onOpenPrivacy: () => void;
}

export const LgpdBanner: React.FC<LgpdBannerProps> = ({
  visible,
  onAcceptAll,
  onEssentialOnly,
  onOpenPrivacy,
}) => {
  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Preferências de privacidade LGPD"
      className="fixed bottom-4 left-4 right-4 z-40 max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Utilizamos medição anônima de acessos (sem dados pessoais, senhas ou pagamentos) em conformidade com a LGPD.{' '}
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="text-blue-700 hover:underline font-medium cursor-pointer"
          >
            Política de retenção
          </button>
          .
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <button
          type="button"
          onClick={onEssentialOnly}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Somente essenciais
        </button>
        <button
          type="button"
          onClick={onAcceptAll}
          className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Aceitar estatísticas
        </button>
      </div>
    </div>
  );
};
