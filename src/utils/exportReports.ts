import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { AnalyticsSummaryResponse } from '../types/analytics';

function formatNumberBR(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n);
}

export function exportAnalyticsPdf(summary: AnalyticsSummaryResponse): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('VitrineApkAc — Relatório de Analytics e Visitantes', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Período: ${summary.startDate} a ${summary.endDate}  ·  Escopo: ${
      summary.selectedAppId
        ? `Aplicativo (${summary.selectedAppId})`
        : summary.scope === 'storefront'
          ? 'Loja VitrineApkAc'
          : summary.scope === 'apps'
            ? 'Aplicativos Personalizados'
            : 'Consolidado (Loja + Aplicativos)'
    }`,
    14,
    25,
  );

  // 1. Indicadores Principais
  autoTable(doc, {
    startY: 31,
    head: [['Indicador', 'Valor', 'Detalhe']],
    body: [
      ['Total de visitantes', formatNumberBR(summary.kpis.totalVisitors), `Crescimento: ${summary.kpis.periodGrowthPercent}%`],
      ['Visitantes únicos', formatNumberBR(summary.kpis.uniqueVisitors), 'Sessões distintas'],
      ['Total de visualizações', formatNumberBR(summary.kpis.totalPageViews), 'Páginas e telas de apps'],
      ['Adições ao carrinho', formatNumberBR(summary.kpis.addToCartCount), 'Intenção de compra'],
      ['Compras finalizadas', formatNumberBR(summary.kpis.purchasesCount), `Taxa de conversão: ${summary.kpis.conversionRate}%`],
      ['Loja VitrineApkAc', formatNumberBR(summary.kpis.storefrontVisitors), `Conversão: ${summary.kpis.storefrontConversionRate}%`],
      ['Aplicativos Vendidos', formatNumberBR(summary.kpis.appsTotalVisitors), `Conversão: ${summary.kpis.appsConversionRate}%`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [29, 78, 216] },
    styles: { fontSize: 9 },
  });

  // 2. Aplicativos mais acessados
  const afterKpisY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 95;
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Aplicativos Mais Acessados e Conversão', 14, afterKpisY + 9);

  autoTable(doc, {
    startY: afterKpisY + 13,
    head: [['Aplicativo', 'ID Rastreamento', 'Visitantes', 'Visualizações', 'Compras', 'Conversão']],
    body: summary.topApps.map((app) => [
      app.name,
      app.trackingId,
      formatNumberBR(app.visitors),
      formatNumberBR(app.views),
      formatNumberBR(app.purchases),
      `${app.conversionRate}%`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 8.5 },
  });

  // 3. Produtos mais procurados
  const afterAppsY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;
  doc.setFontSize(12);
  doc.text('Produtos Mais Procurados', 14, afterAppsY + 9);

  autoTable(doc, {
    startY: afterAppsY + 13,
    head: [['Produto / Pacote', 'Visualizações', 'Carrinho', 'Compras']],
    body: summary.topProducts.map((p) => [
      p.name,
      formatNumberBR(p.views),
      formatNumberBR(p.addToCart),
      formatNumberBR(p.purchases),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 8.5 },
  });

  // 4. Comparação Mensal + Evolução
  doc.addPage();
  doc.setFontSize(13);
  doc.text('Comparação Mensal — Loja vs. Aplicativos', 14, 18);

  autoTable(doc, {
    startY: 23,
    head: [['Mês', 'Visitantes Loja', 'Visitantes Aplicativos', 'Total', 'Compras']],
    body: summary.monthlyComparison.map((m) => [
      m.month,
      formatNumberBR(m.storefrontVisitors),
      formatNumberBR(m.appsVisitors),
      formatNumberBR(m.storefrontVisitors + m.appsVisitors),
      formatNumberBR(m.purchases),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [29, 78, 216] },
    styles: { fontSize: 9 },
  });

  const afterMonthlyY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 75;
  doc.setFontSize(13);
  doc.text('Evolução Diária no Período Selecionado', 14, afterMonthlyY + 10);

  autoTable(doc, {
    startY: afterMonthlyY + 14,
    head: [['Data', 'Dia', 'Visitantes', 'Período Anterior', 'Visualizações', 'Compras']],
    body: summary.dailySeries.slice(-31).map((d) => [
      d.date,
      d.label,
      formatNumberBR(d.visitors),
      formatNumberBR(d.previousVisitors),
      formatNumberBR(d.pageViews),
      formatNumberBR(d.purchases),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 8.5 },
  });

  doc.save(`vitrineapkac-relatorio-${summary.startDate}-a-${summary.endDate}.pdf`);
}

export function exportAnalyticsExcel(summary: AnalyticsSummaryResponse): void {
  const wb = XLSX.utils.book_new();

  const kpiSheet = XLSX.utils.json_to_sheet([
    { Indicador: 'Período analisado', Valor: `${summary.startDate} a ${summary.endDate}` },
    { Indicador: 'Total de visitantes', Valor: summary.kpis.totalVisitors },
    { Indicador: 'Visitantes únicos', Valor: summary.kpis.uniqueVisitors },
    { Indicador: 'Visitantes online agora', Valor: summary.kpis.onlineNow },
    { Indicador: 'Visitantes do dia', Valor: summary.kpis.todayVisitors },
    { Indicador: 'Visitantes da semana', Valor: summary.kpis.weekVisitors },
    { Indicador: 'Visitantes do mês', Valor: summary.kpis.monthVisitors },
    { Indicador: 'Total de visualizações', Valor: summary.kpis.totalPageViews },
    { Indicador: 'Adições ao carrinho', Valor: summary.kpis.addToCartCount },
    { Indicador: 'Compras finalizadas', Valor: summary.kpis.purchasesCount },
    { Indicador: 'Taxa de conversão (%)', Valor: summary.kpis.conversionRate },
    { Indicador: 'Visitantes Loja VitrineApkAc', Valor: summary.kpis.storefrontVisitors },
    { Indicador: 'Visitantes Aplicativos Vendidos', Valor: summary.kpis.appsTotalVisitors },
  ]);
  XLSX.utils.book_append_sheet(wb, kpiSheet, 'Resumo KPIs');

  const seriesSheet = XLSX.utils.json_to_sheet(
    summary.dailySeries.map((d) => ({
      Data: d.date,
      Rotulo: d.label,
      Visitantes: d.visitors,
      Periodo_Anterior: d.previousVisitors,
      Visualizacoes: d.pageViews,
      Compras: d.purchases,
    })),
  );
  XLSX.utils.book_append_sheet(wb, seriesSheet, 'Evolucao de Acessos');

  const appsSheet = XLSX.utils.json_to_sheet(
    summary.topApps.map((a) => ({
      Aplicativo: a.name,
      Cliente: a.clientBusinessName,
      Codigo_Rastreamento: a.trackingId,
      Visitantes: a.visitors,
      Visitantes_Unicos: a.uniqueVisitors,
      Visualizacoes: a.views,
      Tempo_Medio_Seg: a.avgDurationSec,
      Solicitacoes_Compra: a.purchaseRequests,
      Vendas: a.purchases,
      Taxa_Conversao_Pct: a.conversionRate,
    })),
  );
  XLSX.utils.book_append_sheet(wb, appsSheet, 'Aplicativos');

  const prodSheet = XLSX.utils.json_to_sheet(
    summary.topProducts.map((p) => ({
      Produto: p.name,
      Visualizacoes: p.views,
      Adicoes_Carrinho: p.addToCart,
      Compras: p.purchases,
    })),
  );
  XLSX.utils.book_append_sheet(wb, prodSheet, 'Produtos Procurados');

  const monthlySheet = XLSX.utils.json_to_sheet(
    summary.monthlyComparison.map((m) => ({
      Mes: m.month,
      Visitantes_Loja: m.storefrontVisitors,
      Visitantes_Apps: m.appsVisitors,
      Total_Visitantes: m.storefrontVisitors + m.appsVisitors,
      Compras: m.purchases,
    })),
  );
  XLSX.utils.book_append_sheet(wb, monthlySheet, 'Comparacao Mensal');

  XLSX.writeFile(wb, `vitrineapkac-analytics-${summary.startDate}-a-${summary.endDate}.xlsx`);
}
