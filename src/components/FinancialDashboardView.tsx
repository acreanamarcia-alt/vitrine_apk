import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  PlusCircle,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  APP_CATALOG,
  APP_INSTALLMENT_2X,
  APP_INSTALLMENT_3X,
  APP_PRICE_AVISTA,
  SELLERS_CONFIG,
} from '../data/catalog';
import type {
  FinancialSummaryResponse,
  PaymentPlan,
  SellerName,
} from '../types/analytics';

interface FinancialDashboardViewProps {
  financial: FinancialSummaryResponse | null;
  onRefresh: () => void;
}

export const FinancialDashboardView: React.FC<FinancialDashboardViewProps> = ({
  financial,
  onRefresh,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerBusiness, setCustomerBusiness] = useState('');
  const [selectedAppId, setSelectedAppId] = useState(APP_CATALOG[0]?.id || 'barbearia');
  const [includeDomainAddon, setIncludeDomainAddon] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>('avista');
  const [sellerName, setSellerName] = useState<SellerName>('Francisco Araújo');
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const selectedApp = APP_CATALOG.find((a) => a.id === selectedAppId) || APP_CATALOG[0];
  const baseAppPrice = paymentPlan === '3x' ? APP_INSTALLMENT_3X * 3 : APP_PRICE_AVISTA;
  const computedGross = baseAppPrice + (includeDomainAddon ? 100.0 : 0);
  const commissionRate = sellerName === 'Venda Direta' ? 0 : 0.5;
  const computedCommission = Number((computedGross * commissionRate).toFixed(2));
  const computedNet = Number((computedGross - computedCommission).toFixed(2));

  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerBusiness.trim()) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const itemName = includeDomainAddon
        ? `${selectedApp.name} + Criação e Instalação de Domínio`
        : selectedApp.name;

      const res = await fetch('/api/admin/financial/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerBusiness: customerBusiness.trim(),
          itemName,
          paymentPlan,
          grossAmount: computedGross,
          sellerName,
          status: 'Confirmada',
        }),
      });

      if (res.ok) {
        setCustomerName('');
        setCustomerBusiness('');
        setIncludeDomainAddon(false);
        setFeedback('Venda registrada e comissão calculada automaticamente.');
        onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (saleId: string) => {
    setTogglingId(saleId);
    try {
      const res = await fetch(`/api/admin/financial/sales/${encodeURIComponent(saleId)}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        onRefresh();
      }
    } finally {
      setTogglingId(null);
    }
  };

  if (!financial) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const { totals, sellers, sales } = financial;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Dashboard Financeiro & Comissões
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Controle de faturamento, parcelamentos (R$ 350,00 à vista · 2x R$ 175,00 · 3x R$ 130,00) e repasse de 50% por vendedor.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
          <span>À vista: {totals.avistaCount}</span>
          <span aria-hidden="true">·</span>
          <span>2x R$ {formatBRL(APP_INSTALLMENT_2X)}: {totals.installment2xCount}</span>
          <span aria-hidden="true">·</span>
          <span>3x R$ {formatBRL(APP_INSTALLMENT_3X)}: {totals.installment3xCount}</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Faturamento Bruto</span>
            <DollarSign className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            R$ {formatBRL(totals.grossRevenue)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {totals.salesCount} vendas registradas
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Comissões (50%)</span>
            <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
            R$ {formatBRL(totals.totalCommissions)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Repasse aos vendedores ativos
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Receita Líquida Caixa</span>
            <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            R$ {formatBRL(totals.netRevenue)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Após dedução das comissões
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Ticket Médio</span>
            <CreditCard className="w-4 h-4 text-slate-600 dark:text-slate-400" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            R$ {formatBRL(totals.averageTicket)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Base de preço R$ {formatBRL(APP_PRICE_AVISTA)} / app
          </div>
        </div>
      </div>

      {/* Sellers 50% Commission Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sellers.map((seller) => (
          <div
            key={seller.sellerName}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {seller.sellerName}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {seller.roleLabel}
                </div>
              </div>
              <span className="text-xs font-mono tabular-nums font-semibold text-blue-700 dark:text-blue-400">
                {Math.round(seller.commissionRate * 100)}%
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-slate-500 dark:text-slate-400">Vendas</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {seller.salesCount}
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Bruto</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  R$ {formatBRL(seller.totalGross)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Comissão</div>
                <div className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  R$ {formatBRL(seller.totalCommission)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Sale Form + Ledger Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleRegisterSale}
          className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Registrar Venda no Financeiro
            </h3>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="fin-customer" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nome do cliente
            </label>
            <input
              id="fin-customer"
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex: João Silva"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="fin-business" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Estabelecimento
            </label>
            <input
              id="fin-business"
              type="text"
              required
              value={customerBusiness}
              onChange={(e) => setCustomerBusiness(e.target.value)}
              placeholder="Ex: Barbearia Premium"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="fin-app" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Aplicativo comercializado
            </label>
            <select
              id="fin-app"
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-blue-600"
            >
              {APP_CATALOG.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="fin-plan" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Condição de pagamento
            </label>
            <select
              id="fin-plan"
              value={paymentPlan}
              onChange={(e) => setPaymentPlan(e.target.value as PaymentPlan)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-blue-600"
            >
              <option value="avista">À vista — R$ 350,00</option>
              <option value="2x">2x de R$ 175,00 (R$ 350,00)</option>
              <option value="3x">3x de R$ 130,00 (R$ 390,00)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="fin-seller" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Vendedor (Comissão 50%)
            </label>
            <select
              id="fin-seller"
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value as SellerName)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-blue-600"
            >
              {SELLERS_CONFIG.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDomainAddon}
              onChange={(e) => setIncludeDomainAddon(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700"
            />
            <span>Incluir Criação e Instalação de Domínio (+ R$ 100,00)</span>
          </label>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Valor Bruto:</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                R$ {formatBRL(computedGross)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                Comissão ({Math.round(commissionRate * 100)}%):
              </span>
              <span className="font-mono tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                R$ {formatBRL(computedCommission)}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="text-slate-700 dark:text-slate-300 font-medium">Líquido Caixa:</span>
              <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                R$ {formatBRL(computedNet)}
              </span>
            </div>
          </div>

          {feedback && (
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {feedback}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            {submitting ? 'Registrando...' : 'Registrar Venda'}
          </button>
        </form>

        {/* Sales Ledger Table */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Histórico de Vendas & Comissões
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Todas as vendas da vitrine e lançamentos administrativos com cálculo de 50%.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {sales.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold">Pedido</th>
                  <th className="py-3 px-4 font-semibold">Cliente / Item</th>
                  <th className="py-3 px-4 font-semibold">Pagamento</th>
                  <th className="py-3 px-4 font-semibold">Vendedor</th>
                  <th className="py-3 px-4 font-semibold text-right">Bruto</th>
                  <th className="py-3 px-4 font-semibold text-right">Comissão</th>
                  <th className="py-3 px-4 font-semibold text-right">Líquido</th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono tabular-nums font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <div>{sale.orderCode}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(sale.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {sale.customerName} · {sale.customerBusiness}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 truncate max-w-[230px]">
                        {sale.itemName}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {sale.installmentLabel}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {sale.sellerName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {sale.sellerRole} ({Math.round(sale.commissionRate * 100)}%)
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      R$ {formatBRL(sale.grossAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      R$ {formatBRL(sale.commissionAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      R$ {formatBRL(sale.netAmount)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={togglingId === sale.id}
                        onClick={() => handleToggleStatus(sale.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                          sale.status === 'Confirmada'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                        }`}
                      >
                        {sale.status === 'Confirmada' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{sale.status}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
