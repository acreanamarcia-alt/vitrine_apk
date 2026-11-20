import React, { useState } from 'react';
import {
  Check,
  Clock,
  FileText,
  Phone,
  Send,
  ShieldAlert,
} from 'lucide-react';
import {
  APP_INSTALLMENT_2X,
  APP_INSTALLMENT_3X,
  APP_PRICE_AVISTA,
  QUOTE_ACTIVITIES,
  QUOTE_APP_TOOLS,
} from '../data/catalog';
import type { QuotePriority, QuoteRequestRecord } from '../types/analytics';
import { ThemeToggle, type ThemeMode } from './ThemeToggle';

interface QuoteRequestViewProps {
  theme: ThemeMode;
  onChangeTheme: (next: ThemeMode) => void;
  onBackToStore: () => void;
  onQuoteSubmitted?: () => void;
}

const PRIORITY_OPTIONS: Array<{
  id: QuotePriority;
  label: string;
  detail: string;
}> = [
  {
    id: '10 dias',
    label: 'Prioridade 10 dias',
    detail: 'Desenvolvimento expresso com entrega prioritária em até 10 dias.',
  },
  {
    id: '15 dias',
    label: 'Prioridade 15 dias',
    detail: 'Prazo intermediário equilibrado para personalização completa.',
  },
  {
    id: '30 dias',
    label: 'Prioridade 30 dias',
    detail: 'Prazo padrão programado para desenvolvimento sob medida.',
  },
];

export const QuoteRequestView: React.FC<QuoteRequestViewProps> = ({
  theme,
  onChangeTheme,
  onBackToStore,
  onQuoteSubmitted,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [activityType, setActivityType] = useState(QUOTE_ACTIVITIES[0]);
  const [description, setDescription] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    QUOTE_APP_TOOLS[0],
    QUOTE_APP_TOOLS[2],
  ]);
  const [priority, setPriority] = useState<QuotePriority>('15 dias');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedQuote, setSubmittedQuote] = useState<QuoteRequestRecord | null>(null);

  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const toggleFeature = (tool: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(tool) ? prev.filter((item) => item !== tool) : [...prev, tool],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          tradeName: tradeName.trim(),
          documentNumber: documentNumber.trim(),
          phone: phone.trim(),
          address: address.trim(),
          activityType,
          description: description.slice(0, 900).trim(),
          selectedFeatures,
          priority,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        quote?: QuoteRequestRecord;
        error?: string;
      };

      if (!res.ok || !data.ok || !data.quote) {
        setError(data.error || 'Não foi possível enviar sua solicitação de orçamento.');
        return;
      }

      setSubmittedQuote(data.quote);
      onQuoteSubmitted?.();
    } catch {
      setError('Falha de conexão ao enviar orçamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedQuote(null);
    setCustomerName('');
    setTradeName('');
    setDocumentNumber('');
    setPhone('');
    setAddress('');
    setActivityType(QUOTE_ACTIVITIES[0]);
    setDescription('');
    setSelectedFeatures([QUOTE_APP_TOOLS[0], QUOTE_APP_TOOLS[2]]);
    setPriority('15 dias');
    setError(null);
  };

  if (submittedQuote) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400">
              <Check className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                Protocolo {submittedQuote.protocolCode} · Status: {submittedQuote.workflowStatus}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                Solicitação de Orçamento Registrada
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Seu pedido de desenvolvimento de aplicativo foi encaminhado para análise técnica. Nossa equipe retornará com a proposta detalhada conforme a prioridade escolhida.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <div className="text-slate-500 dark:text-slate-400">Cliente / Nome Fantasia</div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {submittedQuote.customerName} · {submittedQuote.tradeName}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">CPF / CNPJ</div>
              <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {submittedQuote.documentNumber}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Atividade Selecionada</div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {submittedQuote.activityType}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Prioridade de Entrega</div>
              <div className="font-mono font-semibold text-blue-700 dark:text-blue-400 mt-0.5">
                {submittedQuote.priority}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-slate-500 dark:text-slate-400">Endereço</div>
              <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                {submittedQuote.address}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-slate-500 dark:text-slate-400">Descrição do Pedido</div>
              <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed whitespace-pre-wrap">
                {submittedQuote.description}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Atendimento direto: <span className="font-semibold text-slate-800 dark:text-slate-200">Francisco Araújo - (68) 99282-7744</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Novo Pedido de Orçamento
              </button>
              <button
                type="button"
                onClick={onBackToStore}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                Voltar à Vitrine
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-400">
            VitrineApkAc · Desenvolvimento Sob Medida
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight [text-wrap:balance]">
            Pedido de Orçamento para Desenvolvimento do seu Aplicativo
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            Informe os dados da sua empresa ou atuação autônoma, escolha o ramo de atividade, selecione as ferramentas desejadas e defina a prioridade de entrega.
          </p>
        </div>
        <div className="shrink-0">
          <ThemeToggle theme={theme} onChangeTheme={onChangeTheme} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Quote Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6"
        >
          {/* Customer & Business Info */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
              01. Identificação do Cliente e Negócio
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="quote-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nome completo do responsável
                </label>
                <input
                  id="quote-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Maria da Silva"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="quote-trade" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nome fantasia
                </label>
                <input
                  id="quote-trade"
                  type="text"
                  required
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="Ex: Padaria Pão Quente"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="quote-doc" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  CPF ou CNPJ
                </label>
                <input
                  id="quote-doc"
                  type="text"
                  required
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="quote-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  WhatsApp / Telefone para retorno
                </label>
                <input
                  id="quote-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(68) 99999-9999"
                  className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="quote-address" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Endereço completo
                </label>
                <input
                  id="quote-address"
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade e UF"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Activity Menu & Features */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
              02. Tipo de Atividade e Recursos do Aplicativo
            </h2>

            <div className="space-y-1.5">
              <label htmlFor="quote-activity" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tipo de atividade (Menu de segmentos)
              </label>
              <select
                id="quote-activity"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-blue-600"
              >
                {QUOTE_ACTIVITIES.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Opções de recursos e ferramentas para o aplicativo
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {QUOTE_APP_TOOLS.map((tool) => {
                  const checked = selectedFeatures.includes(tool);
                  return (
                    <label
                      key={tool}
                      className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                        checked
                          ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-medium'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFeature(tool)}
                        className="mt-0.5 accent-blue-700 shrink-0"
                      />
                      <span>{tool}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 900-char Description Box */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
              03. Descrição Detalhada do Pedido e Prioridade
            </h2>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="quote-description" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Espaço para descrição do pedido (até 900 caracteres)
                </label>
                <span
                  className={`text-xs font-mono tabular-nums ${
                    description.length >= 850
                      ? 'text-amber-700 dark:text-amber-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {description.length} / 900 caracteres
                </span>
              </div>
              <textarea
                id="quote-description"
                required
                rows={5}
                maxLength={900}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 900))}
                placeholder="Descreva como você deseja o funcionamento do seu aplicativo, cores da marca, formas de atendimento, entrega, agendamento ou observações específicas..."
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600 resize-y"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Status de prioridade para desenvolvimento
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PRIORITY_OPTIONS.map((opt) => {
                  const selected = priority === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPriority(opt.id)}
                      className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer space-y-1 ${
                        selected
                          ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-600'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold font-mono tabular-nums ${
                            selected
                              ? 'text-blue-800 dark:text-blue-300'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {opt.label}
                        </span>
                        <Clock
                          className={`w-3.5 h-3.5 ${
                            selected
                              ? 'text-blue-700 dark:text-blue-400'
                              : 'text-slate-400'
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {opt.detail}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 px-3.5 py-2.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-lg text-xs font-medium text-red-800 dark:text-red-300"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBackToStore}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Voltar à Vitrine
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>{submitting ? 'Enviando solicitação...' : 'Enviar Pedido de Orçamento'}</span>
            </button>
          </div>
        </form>

        {/* Right Summary & Commercial Reference */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Resumo da Solicitação
              </h3>
            </div>

            <div className="space-y-3 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Atividade:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                  {activityType}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Prioridade:</span>
                <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                  {priority}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Ferramentas escolhidas:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {selectedFeatures.length} selecionadas
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Descrição:</span>
                <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  {description.length}/900 caracteres
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 text-xs">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Referência de Valores VitrineApkAc
              </div>
              <div className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                Aplicativo padrão: R$ {formatBRL(APP_PRICE_AVISTA)} à vista
              </div>
              <div className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Parcelamento: 2x R$ {formatBRL(APP_INSTALLMENT_2X)} ou 3x R$ {formatBRL(APP_INSTALLMENT_3X)}
              </div>
              <div className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Criação e instalação de domínio: + R$ 100,00
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <Phone className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
              <span>Atendimento Técnico Direto</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Web Desenvolvedor responsável pela análise técnica e desenvolvimento:
            </p>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              Francisco Araújo - (68) 99282-7744
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
