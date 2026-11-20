import React, { useState } from 'react';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Pause,
  Play,
  PlusCircle,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type {
  AlertMetricType,
  AlertNotification,
  AlertRule,
  AlertsOverviewResponse,
} from '../types/analytics';

interface AlertsConfigViewProps {
  overview: AlertsOverviewResponse | null;
  onUpdated: (next: AlertsOverviewResponse) => void;
  onImmediateNotification?: (notif: AlertNotification) => void;
}

const METRIC_OPTIONS: Array<{
  id: AlertMetricType;
  label: string;
  unitLabel: string;
  placeholder: string;
}> = [
  {
    id: 'visitors_today',
    label: 'Visitantes hoje',
    unitLabel: 'visitantes',
    placeholder: 'Ex: 750',
  },
  {
    id: 'visitors_total',
    label: 'Visitantes totais (30 dias)',
    unitLabel: 'visitantes',
    placeholder: 'Ex: 13000',
  },
  {
    id: 'sales_count',
    label: 'Volume de vendas (quantidade)',
    unitLabel: 'vendas',
    placeholder: 'Ex: 10',
  },
  {
    id: 'sales_revenue',
    label: 'Volume de vendas (faturamento R$)',
    unitLabel: 'R$',
    placeholder: 'Ex: 3500',
  },
];

export const AlertsConfigView: React.FC<AlertsConfigViewProps> = ({
  overview,
  onUpdated,
  onImmediateNotification,
}) => {
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState<AlertMetricType>('visitors_today');
  const [threshold, setThreshold] = useState('750');
  const [notifyInUi, setNotifyInUi] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyRuleId, setBusyRuleId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [editingThresholdValue, setEditingThresholdValue] = useState<string>('');

  const formatMetricValue = (m: AlertMetricType, value: number) => {
    if (m === 'sales_revenue') {
      return `R$ ${value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    if (m === 'sales_count') {
      return `${value.toLocaleString('pt-BR')} vendas`;
    }
    return `${value.toLocaleString('pt-BR')} visitantes`;
  };

  const getActualValueForMetric = (m: AlertMetricType): number => {
    if (!overview) return 0;
    const cm = overview.currentMetrics;
    if (m === 'visitors_today') return cm.visitorsToday;
    if (m === 'visitors_total') return cm.visitorsTotal;
    if (m === 'sales_count') return cm.salesCount;
    return cm.salesRevenue;
  };

  const getMetricLabel = (m: AlertMetricType): string =>
    METRIC_OPTIONS.find((opt) => opt.id === m)?.label || m;

  const handleMetricSelect = (nextMetric: AlertMetricType) => {
    setMetric(nextMetric);
    if (!overview) return;
    const actual = getActualValueForMetric(nextMetric);
    if (nextMetric === 'sales_revenue') {
      setThreshold(String(Math.ceil((actual + 500) / 100) * 100));
    } else if (nextMetric === 'sales_count') {
      setThreshold(String(actual + 2));
    } else if (nextMetric === 'visitors_today') {
      setThreshold(String(actual + 50));
    } else {
      setThreshold(String(actual + 500));
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericThreshold = Number(threshold);
    if (!title.trim() || Number.isNaN(numericThreshold) || numericThreshold <= 0) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          metric,
          threshold: numericThreshold,
          enabled: true,
          notifyInUi,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          triggeredNotification: AlertNotification | null;
          overview: AlertsOverviewResponse;
        };
        onUpdated(data.overview);
        if (data.triggeredNotification && onImmediateNotification) {
          onImmediateNotification(data.triggeredNotification);
        }
        setTitle('');
        setFeedback(
          data.triggeredNotification
            ? 'Regra salva e notificação imediata disparada porque a meta já foi alcançada.'
            : 'Regra de alerta criada e em monitoramento contínuo.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRule = async (rule: AlertRule) => {
    setBusyRuleId(rule.id);
    try {
      const res = await fetch(`/api/admin/alerts/rules/${encodeURIComponent(rule.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (res.ok) {
        const data = (await res.json()) as { overview: AlertsOverviewResponse };
        onUpdated(data.overview);
      }
    } finally {
      setBusyRuleId(null);
    }
  };

  const handleSaveEditedThreshold = async (ruleId: string) => {
    const val = Number(editingThresholdValue);
    if (Number.isNaN(val) || val <= 0) return;
    setBusyRuleId(ruleId);
    try {
      const res = await fetch(`/api/admin/alerts/rules/${encodeURIComponent(ruleId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: val }),
      });
      if (res.ok) {
        const data = (await res.json()) as { overview: AlertsOverviewResponse };
        onUpdated(data.overview);
        setEditingThresholdId(null);
      }
    } finally {
      setBusyRuleId(null);
    }
  };

  const handleRearmRule = async (ruleId: string) => {
    setBusyRuleId(ruleId);
    try {
      const res = await fetch(`/api/admin/alerts/rules/${encodeURIComponent(ruleId)}/rearm`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = (await res.json()) as AlertsOverviewResponse;
        onUpdated(data);
      }
    } finally {
      setBusyRuleId(null);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    setBusyRuleId(ruleId);
    try {
      const res = await fetch(`/api/admin/alerts/rules/${encodeURIComponent(ruleId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = (await res.json()) as AlertsOverviewResponse;
        onUpdated(data);
      }
    } finally {
      setBusyRuleId(null);
    }
  };

  const handleMarkRead = async (notifId: string) => {
    const res = await fetch(`/api/admin/alerts/notifications/${encodeURIComponent(notifId)}/read`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = (await res.json()) as AlertsOverviewResponse;
      onUpdated(data);
    }
  };

  const handleMarkAllRead = async () => {
    const res = await fetch('/api/admin/alerts/notifications/read-all', { method: 'POST' });
    if (res.ok) {
      const data = (await res.json()) as AlertsOverviewResponse;
      onUpdated(data);
    }
  };

  const handleClearRead = async () => {
    const res = await fetch('/api/admin/alerts/notifications/read', { method: 'DELETE' });
    if (res.ok) {
      const data = (await res.json()) as AlertsOverviewResponse;
      onUpdated(data);
    }
  };

  if (!overview) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
        <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  const { rules, notifications, unreadCount, currentMetrics } = overview;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Configuração de Alertas e Metas
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Defina limites automáticos para visitantes e volume de vendas. Quando uma meta é atingida, uma notificação é exibida em tempo real na interface administrativa.
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
          Regras ativas: <span className="font-semibold text-slate-900 dark:text-slate-100">{rules.filter((r) => r.enabled).length}</span>
          <span aria-hidden="true"> · </span>
          Não lidas: <span className="font-semibold text-blue-700 dark:text-blue-400">{unreadCount}</span>
        </div>
      </div>

      {/* Live Baseline Reference Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Visitantes hoje (atual)',
            value: currentMetrics.visitorsToday.toLocaleString('pt-BR'),
          },
          {
            label: 'Visitantes totais 30d (atual)',
            value: currentMetrics.visitorsTotal.toLocaleString('pt-BR'),
          },
          {
            label: 'Volume de vendas (atual)',
            value: `${currentMetrics.salesCount.toLocaleString('pt-BR')} pedidos`,
          },
          {
            label: 'Faturamento bruto (atual)',
            value: `R$ ${currentMetrics.salesRevenue.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4"
          >
            <div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
            <div className="mt-1.5 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Create Rule Form + Rules List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleCreateRule}
          className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Nova Regra de Alerta
            </h3>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="alert-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Descrição da meta
            </label>
            <input
              id="alert-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Meta de 800 visitantes hoje"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="alert-metric" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Indicador monitorado
            </label>
            <select
              id="alert-metric"
              value={metric}
              onChange={(e) => handleMetricSelect(e.target.value as AlertMetricType)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-blue-600"
            >
              {METRIC_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="alert-threshold" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Valor da meta ({METRIC_OPTIONS.find((m) => m.id === metric)?.unitLabel})
              </label>
              <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Atual: {formatMetricValue(metric, getActualValueForMetric(metric))}
              </span>
            </div>
            <input
              id="alert-threshold"
              type="number"
              min={1}
              step={metric === 'sales_revenue' ? '10' : '1'}
              required
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={METRIC_OPTIONS.find((m) => m.id === metric)?.placeholder}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-blue-600"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyInUi}
              onChange={(e) => setNotifyInUi(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700"
            />
            <span>Disparar notificação visual em tempo real no painel</span>
          </label>

          {feedback && (
            <div className="px-3 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              {feedback}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            {submitting ? 'Salvando regra...' : 'Salvar Regra de Alerta'}
          </button>
        </form>

        {/* Configured Rules List */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Metas Configuradas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Acompanhamento automático a cada nova visita ou venda registrada.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {rules.length} regras
            </span>
          </div>

          {rules.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhuma regra cadastrada. Crie uma nova meta ao lado para receber notificações automáticas.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {rules.map((rule) => {
                const actual = getActualValueForMetric(rule.metric);
                const progressPct = Math.min(100, Math.round((actual / Math.max(1, rule.threshold)) * 100));
                const isEditing = editingThresholdId === rule.id;

                return (
                  <div key={rule.id} className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{getMetricLabel(rule.metric)}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-semibold ${
                              rule.lastTriggeredAt
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : rule.enabled
                                  ? 'text-blue-700 dark:text-blue-400'
                                  : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {rule.lastTriggeredAt
                              ? `Meta atingida em ${new Date(rule.lastTriggeredAt).toLocaleString('pt-BR')}`
                              : rule.enabled
                                ? 'Ativa · Monitorando'
                                : 'Pausada'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {rule.title}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {rule.lastTriggeredAt && (
                          <button
                            type="button"
                            disabled={busyRuleId === rule.id}
                            onClick={() => handleRearmRule(rule.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Reativar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyRuleId === rule.id}
                          onClick={() => handleToggleRule(rule)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        >
                          {rule.enabled ? (
                            <>
                              <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Pausar</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Ativar</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={busyRuleId === rule.id}
                          onClick={() => handleDeleteRule(rule.id)}
                          aria-label={`Excluir regra ${rule.title}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress & Threshold Editor */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
                        <span className="text-slate-600 dark:text-slate-300">
                          Atual: <span className="font-semibold text-slate-900 dark:text-slate-100">{formatMetricValue(rule.metric, actual)}</span>
                        </span>

                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              value={editingThresholdValue}
                              onChange={(e) => setEditingThresholdValue(e.target.value)}
                              className="w-28 px-2 py-1 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditedThreshold(rule.id)}
                              className="px-2 py-1 text-xs font-semibold text-white bg-blue-700 rounded cursor-pointer"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingThresholdId(null)}
                              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingThresholdId(rule.id);
                              setEditingThresholdValue(String(rule.threshold));
                            }}
                            className="text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 underline-offset-2 hover:underline cursor-pointer"
                          >
                            Meta: {formatMetricValue(rule.metric, rule.threshold)} ({progressPct}%)
                          </button>
                        )}
                      </div>

                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            rule.lastTriggeredAt || progressPct >= 100
                              ? 'bg-emerald-600 dark:bg-emerald-500'
                              : 'bg-blue-700 dark:bg-blue-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Triggered Notifications Feed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Central de Notificações de Metas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Histórico de alertas disparados na interface quando metas de visitantes ou vendas são atingidas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Marcar todas como lidas</span>
              </button>
            )}
            {notifications.some((n) => n.read) && (
              <button
                type="button"
                onClick={handleClearRead}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              >
                Limpar lidas
              </button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="p-8 text-center space-y-1.5">
            <BellOff className="w-5 h-5 text-slate-400 mx-auto" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Nenhuma notificação disparada ainda
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quando o total de visitantes ou vendas alcançar o limite de uma regra ativa, o alerta aparecerá aqui e em tempo real na tela.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  notif.read
                    ? 'bg-white dark:bg-slate-900 opacity-75'
                    : 'bg-blue-50/50 dark:bg-blue-950/20'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span
                      className={`font-semibold ${
                        notif.read
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'text-blue-700 dark:text-blue-400'
                      }`}
                    >
                      {notif.read ? 'Lida' : 'Nova notificação'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{getMetricLabel(notif.metric)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(notif.triggeredAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {notif.title}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                    {notif.message}
                  </div>
                </div>

                {!notif.read && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(notif.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Marcar como lida</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
