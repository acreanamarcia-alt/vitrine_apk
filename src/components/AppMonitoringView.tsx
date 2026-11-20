import React, { useEffect, useState } from 'react';
import { Clock, Eye, Lock, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import type { AnalyticsSummaryResponse, AppAnalyticsSummary } from '../types/analytics';

interface AppMonitoringViewProps {
  summary: AnalyticsSummaryResponse;
  initialAppId?: string | null;
  onRefresh: () => void;
  onOpenClientPortal: (appId: string) => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export const AppMonitoringView: React.FC<AppMonitoringViewProps> = ({
  summary,
  initialAppId,
  onRefresh,
  onOpenClientPortal,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    initialAppId || summary.topApps[0]?.appId || 'barbearia',
  );
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialAppId) {
      setSelectedId(initialAppId);
    }
  }, [initialAppId]);

  const selectedApp: AppAnalyticsSummary | undefined =
    summary.topApps.find((a) => a.appId === selectedId) || summary.topApps[0];

  const handleToggleClientPortal = async (app: AppAnalyticsSummary) => {
    setTogglingId(app.appId);
    try {
      await fetch('/api/analytics/app-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: app.appId,
          clientPortalEnabled: !app.clientPortalEnabled,
        }),
      });
      onRefresh();
    } finally {
      setTogglingId(null);
    }
  };

  if (!selectedApp) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Nenhum aplicativo cadastrado para monitoramento individual.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & App Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Monitoramento Individual dos Aplicativos
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Selecione qualquer aplicativo personalizado para acompanhar métricas exclusivas e controle de acesso do cliente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="select-app-monitoring" className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Aplicativo:
          </label>
          <select
            id="select-app-monitoring"
            value={selectedApp.appId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-3 py-2 text-sm font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-blue-600"
          >
            {summary.topApps.map((app) => (
              <option key={app.appId} value={app.appId}>
                {app.name} ({app.trackingId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected App Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* App Identity & Client Portal Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {selectedApp.category} · Cliente: {selectedApp.clientBusinessName} · ID{' '}
                <span className="font-mono text-slate-800 dark:text-slate-200">{selectedApp.trackingId}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedApp.name}</h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={togglingId === selectedApp.appId}
                onClick={() => handleToggleClientPortal(selectedApp)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedApp.clientPortalEnabled
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {selectedApp.clientPortalEnabled
                  ? 'Portal do Cliente: Habilitado'
                  : 'Portal do Cliente: Desativado'}
              </button>

              <button
                type="button"
                disabled={!selectedApp.clientPortalEnabled}
                onClick={() => onOpenClientPortal(selectedApp.appId)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Abrir Visão do Cliente</span>
              </button>
            </div>
          </div>

          {/* 6 Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>Visitantes</span>
                <Users className="w-4 h-4 text-slate-400" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {selectedApp.visitors.toLocaleString('pt-BR')}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>Visualizações</span>
                <Eye className="w-4 h-4 text-slate-400" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {selectedApp.views.toLocaleString('pt-BR')}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>Visitantes únicos est.</span>
                <Users className="w-4 h-4 text-slate-400" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {selectedApp.uniqueVisitors.toLocaleString('pt-BR')}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>Tempo médio</span>
                <Clock className="w-4 h-4 text-slate-400" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {formatDuration(selectedApp.avgDurationSec)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>Solicitações de compra</span>
                <ShoppingCart className="w-4 h-4 text-slate-400" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {selectedApp.purchaseRequests.toLocaleString('pt-BR')}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>Vendas · Conversão</span>
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {selectedApp.purchases.toLocaleString('pt-BR')}{' '}
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  ({selectedApp.conversionRate}%)
                </span>
              </div>
            </div>
          </div>

          {/* Most Accessed Features inside this App */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Funcionalidades Mais Acessadas em {selectedApp.name}
            </h4>
            {selectedApp.topFeatures.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma interação registrada neste período.</p>
            ) : (
              <div className="space-y-3">
                {selectedApp.topFeatures.map((feat) => {
                  const maxCount = Math.max(...selectedApp.topFeatures.map((f) => f.count), 1);
                  const pct = Math.round((feat.count / maxCount) * 100);
                  return (
                    <div key={feat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{feat.name}</span>
                        <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 font-semibold">
                          {feat.count.toLocaleString('pt-BR')} acessos
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-700 dark:bg-blue-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Full App Ranking Comparison */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Comparativo entre Aplicativos
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Clique em um aplicativo para inspecionar detalhes individuais.
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {summary.topApps.map((app) => {
              const isSelected = app.appId === selectedApp.appId;
              return (
                <button
                  key={app.appId}
                  type="button"
                  onClick={() => setSelectedId(app.appId)}
                  className={`w-full text-left py-3 px-2.5 rounded-lg transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/60'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{app.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {app.trackingId} · {app.clientPortalEnabled ? 'Cliente ativo' : 'Somente admin'}
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {app.visitors.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-xs text-emerald-700 dark:text-emerald-400">{app.conversionRate}% conv.</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
