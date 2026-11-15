import React, { useState } from 'react';
import { ShieldCheck, Trash2 } from 'lucide-react';
import type { PrivacySettings } from '../types/analytics';

interface PrivacyLgpdViewProps {
  settings: PrivacySettings;
  onUpdated: () => void;
}

export const PrivacyLgpdView: React.FC<PrivacyLgpdViewProps> = ({ settings, onUpdated }) => {
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const updateSetting = async (partial: Partial<PrivacySettings>) => {
    setSaving(true);
    setStatusMessage(null);
    try {
      await fetch('/api/analytics/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      setStatusMessage('Configuração de privacidade LGPD atualizada.');
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const runPurge = async (onlyBaseline: boolean) => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/analytics/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlyBaseline }),
      });
      const data = (await res.json()) as { removedRecords: number };
      setStatusMessage(
        onlyBaseline
          ? `Base ilustrativa removida (${data.removedRecords} registros). Apenas visitas reais permanecem.`
          : `Limpeza de retenção executada (${data.removedRecords} registros expirados removidos).`,
      );
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Segurança, Privacidade e Conformidade LGPD
            </h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              O sistema de monitoramento da VitrineApkAc realiza coleta mínima de dados agregados, sem armazenar senhas, dados de cartão, endereços IP brutos ou informações pessoais identificáveis.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">Anonimização de Sessões</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cada visitante recebe um hash efêmero de sessão armazenado localmente sem vínculo com nome, e-mail ou CPF.
            </p>
            <div className="pt-1 text-xs font-medium text-emerald-700">
              Ativo permanentemente (coleta mínima garantida)
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">
                Localização Geográfica Aproximada
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  updateSetting({ collectApproxRegion: !settings.collectApproxRegion })
                }
                className={`px-3 py-1 text-xs font-semibold rounded-lg border cursor-pointer ${
                  settings.collectApproxRegion
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {settings.collectApproxRegion ? 'Autorizada (Cidade/UF)' : 'Desativada'}
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Coletada apenas quando autorizada pelo visitante no aviso de consentimento e agregada por cidade/estado.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">
                Política de Retenção de Dados
              </div>
              <select
                value={settings.retentionDays}
                disabled={saving}
                onChange={(e) =>
                  updateSetting({
                    retentionDays: Number(e.target.value) as 30 | 90 | 180 | 365,
                  })
                }
                className="px-2.5 py-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value={30}>30 dias</option>
                <option value={90}>90 dias</option>
                <option value={180}>180 dias</option>
                <option value={365}>365 dias</option>
              </select>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Registros anteriores ao prazo definido podem ser expurgados automaticamente para conformidade com o princípio de limitação de armazenamento.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">
              Volume de Registros Anonimizados
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {settings.totalStoredEvents.toLocaleString('pt-BR')}
            </div>
            <div className="text-xs text-slate-500">
              {settings.lastPurgeAt
                ? `Última limpeza: ${new Date(settings.lastPurgeAt).toLocaleString('pt-BR')}`
                : 'Nenhuma limpeza manual executada'}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => runPurge(false)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Executar limpeza por retenção ({settings.retentionDays}d)</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => runPurge(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Remover dados ilustrativos (manter somente visitas reais)</span>
          </button>
        </div>

        {statusMessage && (
          <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-900">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
};
