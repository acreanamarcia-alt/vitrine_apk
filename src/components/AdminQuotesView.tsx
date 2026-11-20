import React, { useState } from 'react';
import { Clock, FileText, MapPin, Phone } from 'lucide-react';
import type {
  QuotePriority,
  QuoteRequestRecord,
  QuoteWorkflowStatus,
} from '../types/analytics';

interface AdminQuotesViewProps {
  quotes: QuoteRequestRecord[];
  onRefresh: () => void;
}

const WORKFLOW_OPTIONS: QuoteWorkflowStatus[] = [
  'Recebido',
  'Em análise',
  'Orçamento enviado',
  'Aprovado',
];

export const AdminQuotesView: React.FC<AdminQuotesViewProps> = ({
  quotes,
  onRefresh,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<'Todas' | QuotePriority>('Todas');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredQuotes =
    priorityFilter === 'Todas'
      ? quotes
      : quotes.filter((q) => q.priority === priorityFilter);

  const handleStatusChange = async (id: string, workflowStatus: QuoteWorkflowStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/quotes/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowStatus }),
      });
      if (res.ok) {
        onRefresh();
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Solicitações de Orçamento de Clientes
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Pedidos enviados pela aba Orçamento com ramo de atividade, ferramentas solicitadas e prazo de prioridade.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
          {(['Todas', '10 dias', '15 dias', '30 dias'] as const).map((prio) => {
            const active = priorityFilter === prio;
            return (
              <button
                key={prio}
                type="button"
                onClick={() => setPriorityFilter(prio)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {prio}
              </button>
            );
          })}
        </div>
      </div>

      {filteredQuotes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-1.5">
          <FileText className="w-5 h-5 text-slate-400 mx-auto" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Nenhuma solicitação encontrada para este filtro
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Novos pedidos enviados na aba pública Orçamento aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => (
            <article
              key={quote.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                      {quote.protocolCode}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{quote.activityType}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-700 dark:text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      Prioridade {quote.priority}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(quote.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {quote.tradeName} — {quote.customerName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                    <span className="font-mono">CPF/CNPJ: {quote.documentNumber}</span>
                    {quote.phone && (
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                        {quote.phone}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      {quote.address}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label htmlFor={`status-${quote.id}`} className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Status:
                  </label>
                  <select
                    id={`status-${quote.id}`}
                    disabled={updatingId === quote.id}
                    value={quote.workflowStatus}
                    onChange={(e) =>
                      handleStatusChange(quote.id, e.target.value as QuoteWorkflowStatus)
                    }
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-blue-600"
                  >
                    {WORKFLOW_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Descrição do pedido:
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {quote.description}
                </p>
              </div>

              {quote.selectedFeatures.length > 0 && (
                <div className="pt-2 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Recursos selecionados:{' '}
                  </span>
                  <span>{quote.selectedFeatures.join(' · ')}</span>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
