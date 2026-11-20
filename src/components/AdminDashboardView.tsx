import React, { useState } from 'react';
import {
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  Globe,
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  Users,
} from 'lucide-react';
import type {
  ActiveSessionView,
  AnalyticsScope,
  AnalyticsSummaryResponse,
  DateRangePreset,
} from '../types/analytics';
import { exportAnalyticsExcel, exportAnalyticsPdf } from '../utils/exportReports';
import { VisitorsChart } from './VisitorsChart';

interface AdminDashboardViewProps {
  summary: AnalyticsSummaryResponse;
  liveSessions: ActiveSessionView[];
  wsConnected: boolean;
  range: DateRangePreset;
  customStart: string;
  customEnd: string;
  scope: AnalyticsScope;
  clientPortalAppId: string | null;
  onChangeRange: (r: DateRangePreset) => void;
  onChangeCustomDates: (start: string, end: string) => void;
  onChangeScope: (s: AnalyticsScope) => void;
  onSelectClientPortal: (appId: string | null) => void;
  onInspectApp: (appId: string) => void;
}

const PRESET_LABELS: Array<{ id: DateRangePreset; label: string }> = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: '90d', label: 'Últimos 90 dias' },
  { id: 'custom', label: 'Personalizar período' },
];

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  summary,
  liveSessions,
  wsConnected,
  range,
  customStart,
  customEnd,
  scope,
  clientPortalAppId,
  onChangeRange,
  onChangeCustomDates,
  onChangeScope,
  onSelectClientPortal,
  onInspectApp,
}) => {
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const activeClientApp = clientPortalAppId
    ? summary.topApps.find((a) => a.appId === clientPortalAppId)
    : null;

  const effectiveLiveSessions = clientPortalAppId
    ? liveSessions.filter((s) => s.appId === clientPortalAppId)
    : liveSessions;

  const onlineNowCount = Math.max(
    effectiveLiveSessions.length,
    clientPortalAppId ? 0 : summary.kpis.onlineNow,
  );

  const handleExportPdf = () => {
    exportAnalyticsPdf(summary);
    setExportFeedback('Relatório PDF gerado e baixado.');
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const handleExportExcel = () => {
    exportAnalyticsExcel(summary);
    setExportFeedback('Planilha Excel (.xlsx) gerada e baixada.');
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const totalDevices = Math.max(
    1,
    summary.origins.devices.mobile +
      summary.origins.devices.desktop +
      summary.origins.devices.tablet,
  );
  const totalSources = Math.max(
    1,
    summary.origins.sources.search +
      summary.origins.sources.social +
      summary.origins.sources.direct,
  );
  const totalSplitVisitors = Math.max(
    1,
    summary.kpis.storefrontVisitors + summary.kpis.appsTotalVisitors,
  );
  const sfPct = Math.round((summary.kpis.storefrontVisitors / totalSplitVisitors) * 100);
  const appsPct = 100 - sfPct;

  const enabledClientApps = summary.topApps.filter((a) => a.clientPortalEnabled);

  return (
    <div className="space-y-6">
      {/* Client Portal Isolation Banner if active */}
      {clientPortalAppId && (
        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-blue-950 dark:text-blue-100">
            <span className="font-semibold">Portal do Cliente (Acesso Isolado):</span>{' '}
            {activeClientApp
              ? `${activeClientApp.name} — ${activeClientApp.clientBusinessName}`
              : clientPortalAppId}
            <span className="text-xs text-blue-800 dark:text-blue-300 ml-2">
              · Exibindo exclusivamente as estatísticas deste aplicativo.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectClientPortal(null)}
            className="px-3 py-1.5 text-xs font-semibold text-blue-800 dark:text-blue-200 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Voltar ao Painel Principal
          </button>
        </div>
      )}

      {/* Workspace Header & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              VitrineApkAc — Analytics
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Período de {summary.startDate} até {summary.endDate} · Monitoramento automático com separação entre loja e aplicativos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Exportar PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {exportFeedback && (
          <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-medium text-emerald-800 dark:text-emerald-300">
            {exportFeedback}
          </div>
        )}

        {/* Filter Controls Row */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Period Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
              {PRESET_LABELS.map((item) => {
                const active = range === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeRange(item.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {range === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => onChangeCustomDates(e.target.value, customEnd)}
                  aria-label="Data inicial"
                  className="px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                />
                <span className="text-xs text-slate-400">até</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => onChangeCustomDates(customStart, e.target.value)}
                  aria-label="Data final"
                  className="px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                />
              </div>
            )}
          </div>

          {/* Scope & Client Portal Switcher */}
          {!clientPortalAppId && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(
                  [
                    { id: 'all', label: 'Consolidado' },
                    { id: 'storefront', label: 'Loja VitrineApkAc' },
                    { id: 'apps', label: 'Aplicativos' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onChangeScope(s.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      scope === s.id
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <select
                aria-label="Visualizar Portal do Cliente"
                value={clientPortalAppId || ''}
                onChange={(e) => onSelectClientPortal(e.target.value || null)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
              >
                <option value="">Modo Admin Geral</option>
                {enabledClientApps.map((app) => (
                  <option key={app.appId} value={app.appId}>
                    Portal Cliente: {app.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Primary 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Visitantes totais</div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {summary.kpis.totalVisitors.toLocaleString('pt-BR')}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold font-mono tabular-nums ${
                summary.kpis.periodGrowthPercent >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              {summary.kpis.periodGrowthPercent >= 0 ? '+' : ''}
              {summary.kpis.periodGrowthPercent}%
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Únicos: {summary.kpis.uniqueVisitors.toLocaleString('pt-BR')}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Online agora</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
                aria-hidden="true"
              />
              {wsConnected ? 'Tempo real ativo' : 'Reconectando'}
            </span>
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {onlineNowCount.toLocaleString('pt-BR')}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Sessões ativas monitoradas via WebSocket
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Visualizações</div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {summary.kpis.totalPageViews.toLocaleString('pt-BR')}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Carrinho: {summary.kpis.addToCartCount.toLocaleString('pt-BR')} pessoas
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Compras</div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {summary.kpis.purchasesCount.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs font-semibold font-mono tabular-nums text-blue-700 dark:text-blue-400">
              {summary.kpis.conversionRate}% conversão
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Visitantes convertidos em compradores
          </div>
        </div>
      </div>

      {/* Temporal Breakdown + Storefront vs Apps Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 grid grid-cols-3 gap-4 divide-x divide-slate-100 dark:divide-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Visitantes hoje</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {summary.kpis.todayVisitors.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="pl-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Na semana</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {summary.kpis.weekVisitors.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="pl-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">No mês (30d)</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {summary.kpis.monthVisitors.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Separação de Audiência: Loja VitrineApkAc vs. Aplicativos Vendidos
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Loja {sfPct}% · Aplicativos {appsPct}%
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            <div className="bg-slate-900 dark:bg-slate-400 h-full" style={{ width: `${sfPct}%` }} />
            <div className="bg-blue-700 dark:bg-blue-500 h-full" style={{ width: `${appsPct}%` }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
            <span>
              Loja VitrineApkAc: {summary.kpis.storefrontVisitors.toLocaleString('pt-BR')} visitantes ({summary.kpis.storefrontConversionRate}% conv.)
            </span>
            <span>
              Aplicativos Personalizados: {summary.kpis.appsTotalVisitors.toLocaleString('pt-BR')} visitantes ({summary.kpis.appsConversionRate}% conv.)
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart + Daily Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <VisitorsChart
            data={summary.dailySeries}
            title={`Evolução de acessos (${PRESET_LABELS.find((p) => p.id === range)?.label || 'Período'})`}
            subtitle="Comparação direta com o período anterior equivalente"
          />
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Acessos por dia</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Últimos registros</span>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-2.5 px-5 font-semibold">Dia</th>
                <th className="py-2.5 px-5 font-semibold text-right">Visitantes</th>
                <th className="py-2.5 px-5 font-semibold text-right">Compras</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs tabular-nums">
              {summary.dailySeries.slice(-7).map((row) => (
                <tr key={row.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-2.5 px-5 font-medium text-slate-800 dark:text-slate-200">{row.label}</td>
                  <td className="py-2.5 px-5 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {row.visitors.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 px-5 text-right font-mono text-emerald-700 dark:text-emerald-400">
                    {row.purchases.toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Apps, Top Products, Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Aplicativos mais visitados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Desempenho por modelo comercializado
            </p>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {summary.topApps.map((app) => (
                <button
                  key={app.appId}
                  type="button"
                  onClick={() => onInspectApp(app.appId)}
                  className="w-full py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded px-1.5 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{app.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {app.trackingId} · {app.conversionRate}% conv.
                    </div>
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 shrink-0">
                    {app.visitors.toLocaleString('pt-BR')} acessos
                  </div>
                </button>
              ))}
            </div>
          </div>
          {summary.isDemoAnnotated && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
              Inclui série histórica ilustrativa somada às visitas reais registradas agora.
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Produtos mais acessados
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Interesse e conversão por item da vitrine
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {summary.topProducts.map((prod) => (
              <div key={prod.productId} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{prod.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {prod.addToCart.toLocaleString('pt-BR')} carrinho · {prod.purchases.toLocaleString('pt-BR')} vendas
                  </div>
                </div>
                <div className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 shrink-0">
                  {prod.views.toLocaleString('pt-BR')}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Páginas mais visitadas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Rotas com maior volume de visualizações
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {summary.topPages.map((pg) => (
              <div key={pg.page} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{pg.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">{pg.page}</div>
                </div>
                <div className="text-right shrink-0 font-mono tabular-nums">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {pg.views.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {pg.uniqueVisitors.toLocaleString('pt-BR')} únicos
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Origins & Devices & Regions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Dispositivos de Acesso</h3>
          <div className="space-y-3">
            {[
              { label: 'Celular', count: summary.origins.devices.mobile, icon: Smartphone },
              { label: 'Computador', count: summary.origins.devices.desktop, icon: Monitor },
              { label: 'Tablet', count: summary.origins.devices.tablet, icon: Tablet },
            ].map((item) => {
              const Icon = item.icon;
              const pct = Math.round((item.count / totalDevices) * 100);
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                      <Icon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      {item.label}
                    </span>
                    <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-semibold">
                      {item.count.toLocaleString('pt-BR')} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-700 dark:bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Origem do Tráfego</h3>
          <div className="space-y-3">
            {[
              { label: 'Mecanismos de busca', count: summary.origins.sources.search },
              { label: 'Redes sociais', count: summary.origins.sources.social },
              { label: 'Acessos diretos', count: summary.origins.sources.direct },
            ].map((item) => {
              const pct = Math.round((item.count / totalSources) * 100);
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                    <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-semibold">
                      {item.count.toLocaleString('pt-BR')} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-800 dark:bg-slate-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Localização Aproximada</h3>
            <Globe className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Agregada por região quando autorizada pelo visitante.
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {summary.origins.regions.slice(0, 5).map((reg) => (
              <div key={reg.region} className="py-2 flex items-center justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-medium">{reg.region}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {reg.visitors.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Active Sessions Monitor */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Monitoramento em Tempo Real
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sessões ativas atualizadas automaticamente via WebSocket, sem coleta de dados pessoais.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
            {effectiveLiveSessions.length} {effectiveLiveSessions.length === 1 ? 'sessão ativa' : 'sessões ativas'}
          </div>
        </div>

        {effectiveLiveSessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhuma sessão ativa no momento para este filtro. Navegue pela vitrine ou teste um aplicativo para visualizar acessos instantaneamente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-5 font-semibold">Sessão Anonimizada</th>
                  <th className="py-2.5 px-5 font-semibold">Página Atual</th>
                  <th className="py-2.5 px-5 font-semibold">Aplicativo Consultado</th>
                  <th className="py-2.5 px-5 font-semibold">Dispositivo</th>
                  <th className="py-2.5 px-5 font-semibold text-right">Horário do Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {effectiveLiveSessions.map((sess) => (
                  <tr key={sess.sessionHash} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-5 font-mono text-slate-700 dark:text-slate-300">{sess.sessionHash}</td>
                    <td className="py-2.5 px-5 font-mono text-slate-900 dark:text-slate-100">{sess.currentPage}</td>
                    <td className="py-2.5 px-5 font-medium text-slate-800 dark:text-slate-200">{sess.appName}</td>
                    <td className="py-2.5 px-5 text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      {sess.deviceType === 'mobile'
                        ? 'Celular'
                        : sess.deviceType === 'tablet'
                          ? 'Tablet'
                          : 'Computador'}
                    </td>
                    <td className="py-2.5 px-5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {new Date(sess.lastSeenAt).toLocaleTimeString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
